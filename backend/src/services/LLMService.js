const axios = require('axios');
const dotenv = require('dotenv');

dotenv.config();

/**
 * LLMService.js
 * 
 * Handles interaction with the LLM API, enforcing structured JSON output.
 * Rate limiting resilience: built-in retry backoff for HTTP 429.
 */
class LLMService {
  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY;
    this.baseUrl = 'https://api.openai.com/v1/chat/completions';
    this.model = 'gpt-3.5-turbo'; // Use an affordable, fast model suitable for free tier
  }

  // Built-in request back-off for Rate Limiting Resilience (429)
  async callWithRetry(messages, schema, retries = 3) {
    if (!this.apiKey) {
      throw new Error("OPENAI_API_KEY is not set in environment variables.");
    }

    const payload = {
      model: this.model,
      messages: messages,
      response_format: { type: "json_object" },
      temperature: 0.2
    };

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const response = await axios.post(this.baseUrl, payload, {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000 // 30s timeout per call
        });
        
        const content = response.data.choices[0].message.content;
        return JSON.parse(content);
      } catch (error) {
        if (error.response && error.response.status === 429) {
          // Rate limit hit. Back off.
          console.warn(`[LLMService] Rate limited. Retrying attempt ${attempt}/${retries}...`);
          await new Promise(resolve => setTimeout(resolve, attempt * 2000));
        } else {
          console.error(`[LLMService] LLM Call Failed: ${error.message}`);
          if (attempt === retries) throw error;
        }
      }
    }
  }

  // Pass 1: Extraction
  async extractRequirements(jobDescription, crawledContext) {
    const prompt = `
      You are an expert technical recruiter. Analyze the following Job Description and Company Context.
      Extract the job requirements. Differentiate cleanly between "must" (required) and "nice" (bonus).
      If the job description is a short stub, do not invent requirements.
      Output STRICT JSON matching this schema:
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

    const messages = [{ role: "user", content: prompt }];
    return this.callWithRetry(messages);
  }

  // Pass 2: Generation
  async generateQuestions(requirements) {
    const prompt = `
      Generate interview questions and flashcards for the following requirements.
      Output STRICT JSON matching this schema:
      {
        "questions": [
          { "id": "q1", "requirement_ids": ["r1"], "category": "technical|behavioural|system-design|company-fit", "prompt": "...", "answer_outline": "...", "difficulty": 2 }
        ],
        "flashcards": [
          { "id": "f1", "front": "...", "back": "...", "requirement_ids": ["r1"] }
        ]
      }
      
      Requirements to cover:
      ${JSON.stringify(requirements, null, 2)}
    `;

    const messages = [{ role: "user", content: prompt }];
    return this.callWithRetry(messages);
  }
}

module.exports = LLMService;
