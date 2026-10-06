const WebCrawler = require('./WebCrawler');
const LLMService = require('./LLMService');
const CoverageAnalyzer = require('./CoverageAnalyzer');
const ScheduleAllocator = require('./ScheduleAllocator');

/**
 * PipelineRunner.js
 * 
 * Orchestrates the full generation pipeline:
 * 1. Crawl
 * 2. Extract Requirements
 * 3. Draft Questions
 * 4. Coverage Loop (The Second Pass)
 * 5. Schedule Allocation
 */
class PipelineRunner {
  constructor() {
    this.crawler = new WebCrawler();
    this.llm = new LLMService();
  }

  async run(jobDescription, companyUrl, daysAvailable) {
    const start_time = new Date();
    
    // 1. Crawl
    const crawlData = await this.crawler.crawlCompany(companyUrl);
    
    // 2. Extract
    const extraction = await this.llm.extractRequirements(jobDescription, crawlData.content);
    const requirements = extraction.requirements || [];
    
    // 3. Draft Questions (Pass 1 - Per Category)
    let questions = [];
    let flashcards = [];
    const categories = ["technical", "behavioural", "system-design", "company-fit"];
    
    for (const cat of categories) {
      try {
        const draft = await this.llm.generateQuestionsForCategory(requirements, cat);
        if (draft.questions) questions.push(...draft.questions);
        if (draft.flashcards) flashcards.push(...draft.flashcards);
      } catch (e) {
        console.error(`[PipelineRunner] Failed generation for category ${cat}:`, e.message);
      }
    }

    // 4. The Coverage Loop
    let coverageAnalysis = CoverageAnalyzer.analyze(requirements, questions);
    let passes = 1;

    // "Decide for yourself how many passes are sensible" -> 3 passes max to prevent infinite loops and save tokens.
    while (!coverageAnalysis.is_full_must_coverage && passes < 3) {
      console.log(`[PipelineRunner] Pass ${passes} incomplete. Generating gap coverage for MUST requirements: ${coverageAnalysis.uncovered_must_ids.join(', ')}`);
      
      const missingRequirements = requirements.filter(r => coverageAnalysis.uncovered_must_ids.includes(r.id));
      
      try {
        // Gap pass uses technical as a generic catch-all, or we could inspect the kind. We'll pass it to technical.
        const gapDraft = await this.llm.generateQuestionsForCategory(missingRequirements, "technical");
        if (gapDraft.questions) questions.push(...gapDraft.questions);
        if (gapDraft.flashcards) flashcards.push(...gapDraft.flashcards);
      } catch (e) {
         console.error("[PipelineRunner] Failed gap generation pass:", e.message);
         break;
      }
      
      passes++;
      coverageAnalysis = CoverageAnalyzer.analyze(requirements, questions);
    }

    // Deterministic fallback for uncovered must-haves
    if (!coverageAnalysis.is_full_must_coverage) {
      console.warn(`[PipelineRunner] Adding deterministic templates for uncovered must-haves: ${coverageAnalysis.uncovered_must_ids.join(', ')}`);
      const missingRequirements = requirements.filter(r => coverageAnalysis.uncovered_must_ids.includes(r.id));
      
      missingRequirements.forEach((req, idx) => {
        questions.push({
          id: `fallback-q-${Date.now()}-${idx}`,
          requirement_ids: [req.id],
          category: req.kind === 'behavioural' ? 'behavioural' : 'technical',
          prompt: `Please discuss your experience and skills regarding: ${req.text}`,
          answer_outline: `1. Define the core concepts clearly.\n2. Provide a concrete example from your past experience (STAR method).\n3. Discuss the impact of your work.`,
          difficulty: 2
        });
        flashcards.push({
          id: `fallback-f-${Date.now()}-${idx}`,
          requirement_ids: [req.id],
          front: `Explain the key principles of: ${req.text}`,
          back: `Ensure you can discuss the definition, practical application, and business impact.`,
          confidence_score: 0
        });
      });
      // Re-analyze so final metrics are 100% correct
      coverageAnalysis = CoverageAnalyzer.analyze(requirements, questions);
    }

    // 5. Allocation (Arithmetic, no LLM)
    const schedule = ScheduleAllocator.generateSchedule(daysAvailable, questions, requirements);

    // Build the final Kit matching Appendix A
    return {
      source: {
        company: extraction.company_brief?.company || new URL(companyUrl).hostname,
        company_url: companyUrl,
        role: extraction.role?.title || "Unknown Role",
        location: "", // Usually extracted, skipped for brevity
        jd_chars: jobDescription.length,
        researched_at: new Date().toISOString(),
        pages_used: crawlData.pages_used
      },
      company_brief: {
        summary: extraction.company_brief?.summary || "",
        what_they_do: extraction.company_brief?.what_they_do || "",
        sources: crawlData.pages_used
      },
      role: {
        title: extraction.role?.title || "",
        seniority: extraction.role?.seniority || "",
        responsibilities: extraction.role?.responsibilities || [],
        requirements: requirements
      },
      questions: questions,
      flashcards: flashcards,
      schedule: schedule,
      coverage: {
        uncovered_requirement_ids: coverageAnalysis.uncovered_requirement_ids,
        passes: passes
      }
    };
  }
}

module.exports = PipelineRunner;
