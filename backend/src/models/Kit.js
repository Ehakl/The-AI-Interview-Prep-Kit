const mongoose = require('mongoose');

// Schemas based strictly on Appendix A, extended for state management.

const RequirementSchema = new mongoose.Schema({
  id: { type: String, required: true },
  text: { type: String, required: true },
  kind: { type: String, enum: ['technical', 'behavioural', 'domain'], required: true },
  priority: { type: String, enum: ['must', 'nice'], required: true },
  
  // State management extensions (helps us know what to preserve on regeneration)
  is_user_edited: { type: Boolean, default: false },
  is_user_added: { type: Boolean, default: false }
}, { _id: false });

const QuestionSchema = new mongoose.Schema({
  id: { type: String, required: true },
  requirement_ids: [{ type: String }],
  category: { type: String, enum: ['technical', 'behavioural', 'system-design', 'company-fit'], required: true },
  prompt: { type: String, required: true },
  answer_outline: { type: String, required: true },
  difficulty: { type: Number, min: 1, max: 3, required: true },

  // State management extensions
  is_user_edited: { type: Boolean, default: false },
  is_user_added: { type: Boolean, default: false }
}, { _id: false });

const FlashcardSchema = new mongoose.Schema({
  id: { type: String, required: true },
  front: { type: String, required: true },
  back: { type: String, required: true },
  requirement_ids: [{ type: String }],

  // State management extensions
  is_user_edited: { type: Boolean, default: false },
  is_user_added: { type: Boolean, default: false },
  confidence_score: { type: Number, default: 0 } // For practice mode spaced-repetition/confidence
}, { _id: false });

const DaySchema = new mongoose.Schema({
  day: { type: Number, required: true },
  focus: { type: String, required: true },
  question_ids: [{ type: String }],
  minutes: { type: Number, required: true, validate: Number.isInteger }
}, { _id: false });

const KitSchema = new mongoose.Schema({
  // Tying the Kit to a user (from Authentication requirements)
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  
  source: {
    company: { type: String, required: true, default: "" },
    company_url: { type: String, required: true, default: "" },
    role: { type: String, required: true, default: "" },
    location: { type: String, default: "" },
    jd_chars: { type: Number, required: true, default: 0 },
    researched_at: { type: String, required: true, default: "" },
    pages_used: [{ type: String }]
  },
  
  company_brief: {
    summary: { type: String, required: true, default: "" },
    what_they_do: { type: String, required: true, default: "" },
    sources: [{ type: String }],
    
    // State management
    is_user_edited: { type: Boolean, default: false }
  },
  
  role: {
    title: { type: String, required: true, default: "" },
    seniority: { type: String, default: "" },
    responsibilities: [{ type: String }],
    requirements: [RequirementSchema],
    
    // State management
    is_user_edited: { type: Boolean, default: false }
  },
  
  questions: [QuestionSchema],
  
  flashcards: [FlashcardSchema],
  
  schedule: {
    days_available: { type: Number, required: true, default: 1 },
    days: [DaySchema],
    is_user_edited: { type: Boolean, default: false }
  },
  
  coverage: {
    uncovered_requirement_ids: [{ type: String }],
    passes: { type: Number, required: true, default: 0 }
  }
}, { timestamps: true });

module.exports = mongoose.model('Kit', KitSchema);
