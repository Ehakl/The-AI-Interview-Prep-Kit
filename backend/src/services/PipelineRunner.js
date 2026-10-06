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
    
    // 3. Draft Questions (Pass 1)
    const draft = await this.llm.generateQuestions(requirements);
    let questions = draft.questions || [];
    let flashcards = draft.flashcards || [];

    // 4. The Coverage Loop
    let coverageAnalysis = CoverageAnalyzer.analyze(requirements, questions);
    let passes = 1;

    // "Decide for yourself how many passes are sensible" -> 3 passes max to prevent infinite loops and save tokens.
    while (!coverageAnalysis.is_full_must_coverage && passes < 3) {
      console.log(`[PipelineRunner] Pass ${passes} incomplete. Generating gap coverage for MUST requirements: ${coverageAnalysis.uncovered_must_ids.join(', ')}`);
      
      const missingRequirements = requirements.filter(r => coverageAnalysis.uncovered_must_ids.includes(r.id));
      
      try {
        const gapDraft = await this.llm.generateQuestions(missingRequirements);
        
        // Append new gap questions
        if (gapDraft.questions) questions.push(...gapDraft.questions);
        if (gapDraft.flashcards) flashcards.push(...gapDraft.flashcards);
      } catch (e) {
         console.error("[PipelineRunner] Failed gap generation pass:", e.message);
         break;
      }
      
      passes++;
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
