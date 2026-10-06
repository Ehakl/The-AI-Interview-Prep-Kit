const { GoogleGenAI } = require('@google/genai');
const dotenv = require('dotenv');

dotenv.config();

/**
 * LLMService.js
 * 
 * Handles interaction with the LLM API (switched to Gemini), enforcing structured JSON output.
 * Rate limiting resilience: built-in retry backoff for HTTP 429.
 */
class LLMService {
  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY;
    if (!this.apiKey) {
      console.warn("API Key is missing. Please set GEMINI_API_KEY.");
    }
    // Only initialize if we have a key (prevents crashing at startup before env is loaded on Render)
    if (this.apiKey) {
        this.ai = new GoogleGenAI({ apiKey: this.apiKey });
    }
    this.model = 'gemini-3.1-flash-lite';
  }

  // Built-in request back-off for Rate Limiting Resilience (429)
  async callWithRetry(prompt, retries = 1) {
    if (!this.apiKey) {
      throw new Error("GEMINI_API_KEY is not set in environment variables.");
    }
    if (!this.ai) {
        this.ai = new GoogleGenAI({ apiKey: this.apiKey });
    }

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const response = await this.ai.models.generateContent({
          model: this.model,
          contents: prompt,
          config: {
            responseMimeType: "application/json",
            temperature: 0.2
          }
        });
        
        return JSON.parse(response.text);
      } catch (error) {
        if (error.status === 429 || error.status === 503 || (error.message && (error.message.includes('429') || error.message.includes('503')))) {
          console.warn(`[LLMService] API Overloaded. Retrying attempt ${attempt}/${retries}...`);
          if (attempt === retries) throw new Error(`Google API Error: ${error.message}`);
          await new Promise(resolve => setTimeout(resolve, attempt * 4000));
        } else {
          console.error(`[LLMService] LLM Call Failed: ${error.message}`);
          if (attempt === retries) throw error;
        }
      }
    }
    throw new Error("Failed to contact Gemini after maximum retries.");
  }

  // Pass 1: Extraction
  async extractRequirements(jobDescription, crawledContext) {
    const prompt = `
      You are an expert technical recruiter. Analyze the following Job Description and Company Context.
      Extract the job requirements. Differentiate cleanly between "must" (required) and "nice" (bonus).
      If the job description is a short stub, do not invent requirements. Return an empty structure if insufficient details.
      Output STRICT JSON matching this schema exactly:
      {
        "role": { "title": "...", "seniority": "...", "responsibilities": ["..."] },
        "company_brief": { "summary": "...", "what_they_do": "..." },
        "requirements": [
          { "id": "r1", "text": "...", "kind": "technical|behavioural|domain", "priority": "must|nice" }
        ]
      }
      
      Job Description:
      ${jobDescription}
      
      Company Context:
      ${crawledContext}
    `;

    return this.callWithRetry(prompt);
  }

  // Pass 2: Generation (Per Category)
  async generateQuestionsForCategory(requirements, category) {
    if (!requirements || requirements.length === 0) return { questions: [], flashcards: [] };

    let categoryContext = "";
    if (category === "technical") {
      categoryContext = "Focus on hard skills, programming languages, tools, and technical concepts.";
    } else if (category === "behavioural") {
      categoryContext = "Focus on soft skills, past experiences, conflict resolution, and teamwork (STAR method).";
    } else if (category === "system-design") {
      categoryContext = "Focus on architecture, scalability, tradeoffs, and high-level system components.";
    } else if (category === "company-fit") {
      categoryContext = "Focus on culture, values, alignment with the company mission, and career goals.";
    }

    const prompt = `
      Generate interview questions and flashcards specifically for the '${category}' category based on the following requirements.
      ${categoryContext}
      
      CRITICAL INSTRUCTION: Generate at least 2 questions for each "must" priority requirement if the requirement is relevant to this category.
      Do NOT invent requirements. Only use the provided requirements.
      
      Output STRICT JSON matching this schema exactly:
      {
        "questions": [
          { "id": "q1", "requirement_ids": ["r1"], "category": "${category}", "prompt": "...", "answer_outline": "...", "difficulty": 2 }
        ],
        "flashcards": [
          { "id": "f1", "front": "...", "back": "...", "requirement_ids": ["r1"] }
        ]
      }
      
      Requirements to cover:
      ${JSON.stringify(requirements, null, 2)}
    `;

    return this.callWithRetry(prompt);
  }
}

module.exports = LLMService;
