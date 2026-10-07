# PrepKit AI — Trao Full-Stack Engineering Assessment

A full-stack AI-powered Interview Prep Kit generator that transforms any job description into a structured, personalized study schedule with questions, flashcards, and intelligent gap analysis.

---

## 🏗️ Architecture

```
trao-assessment/
├── backend/               # Node.js + Express API
│   └── src/
│       ├── cli/           # evaluate.js — batch CLI entry point
│       ├── models/        # Mongoose schemas (Appendix A)
│       ├── services/
│       │   ├── WebCrawler.js        # Dynamic link ranking + scraper
│       │   ├── LLMService.js        # OpenAI wrapper with 429 backoff
│       │   ├── CoverageAnalyzer.js  # Deterministic gap analysis
│       │   ├── ScheduleAllocator.js # Deterministic schedule arithmetic
│       │   └── PipelineRunner.js    # Pipeline orchestrator
│       ├── tests/
│       │   └── deterministic.test.js  # 11 unit tests, 0 failures
│       └── server.js      # Express server
└── frontend/              # Next.js 15 + Tailwind CSS
    └── src/
        ├── app/           # Next.js App Router
        ├── context/
        │   └── KitContext.tsx  # State machine with useReducer
        └── components/
            ├── QuestionBuilder.tsx  # Inline editable question bank
            ├── FlashcardMode.tsx    # Confidence scoring + spaced repetition
            ├── ScheduleView.tsx     # Visual study schedule
            └── GapInterviewer.tsx   # Creative feature: mock drill session
```

---

## 🛡️ Core Engineering Decisions (High Review Focus)

### 1. Deterministic Code vs. LLM Prompts

**`ScheduleAllocator.js`** — Pure JavaScript arithmetic. No LLM involved.
- Maps each question's priority and difficulty to a numeric weight score.
- Sorts questions descending by weight to ensure harder/must-have material lands on Day 1.
- Uses `Math.floor((index / total) * days)` for proportional bin assignment.
- All minutes are `difficulty * 15` — integer only, never a decimal.

**`CoverageAnalyzer.js`** — Pure JavaScript Set comparison. No LLM involved.
- Collects all `requirement_ids` referenced across generated questions into a `Set`.
- Iterates the requirements array and flags any `id` not in the Set.
- Separately tracks which uncovered requirements have `priority === 'must'`.
- Returns a boolean `is_full_must_coverage` used by the pipeline loop.

### 2. The Second Pass Loop

`PipelineRunner.js` implements a **multi-pass generation loop**:

```
Pass 1: Generate questions for ALL requirements
        → CoverageAnalyzer.analyze() → finds uncovered_must_ids
        → if gaps found, filter to missing requirements only
Pass 2: Re-prompt LLM with ONLY the missing requirements
        → merge with existing questions
        → re-analyze
Pass 3: Final safety pass (max 3 passes to prevent infinite loops)
```

The LLM **never** decides the schedule. The LLM **never** decides coverage. That is 100% deterministic code.

### 3. The State Persistence Problem

This is handled in `KitContext.tsx` via a `useReducer` state machine.

Every question and flashcard carries two boolean flags from the schema:
- `is_user_edited` — set to `true` whenever the user saves an edit inline
- `is_user_added` — set to `true` when the user manually creates a card

**The `REGENERATE_CATEGORY_SUCCESS` reducer action** implements the preservation logic:

```typescript
case "REGENERATE_CATEGORY_SUCCESS": {
  const { category, newQuestions } = action.payload;
  // Keep user-edited/added questions, even if they are in the same category
  const preserved = state.kit.questions.filter(
    q => q.category !== category || q.is_user_edited || q.is_user_added
  );
  // Append only fresh AI questions for the non-user-edited slots
  return { ...state, kit: { ...state.kit, questions: [...preserved, ...newQuestions] } };
}
```

**States summary:**

| State | Flag | Survives "Regenerate Category"? |
|---|---|---|
| AI-generated, untouched | none | ❌ Replaced |
| User has edited it inline | `is_user_edited: true` | ✅ Preserved |
| User manually created it | `is_user_added: true` | ✅ Preserved |

---

## 🚀 Getting Started

### Prerequisites
- Node.js 20+
- A Google Gemini API key

### Backend Setup

```bash
cd backend
cp .env.example .env
# Edit .env and add your GEMINI_API_KEY, JWT_SECRET, and MongoDB variables (MONGO_USER, MONGO_PASSWORD, MONGO_HOST, MONGO_DB)
npm install
npm run dev
# Server runs on http://localhost:4000
```

### Frontend Setup

```bash
cd frontend
cp .env.local.example .env.local
npm install
npm run dev
# App runs on http://localhost:3000
```

### Deployment Setup (Production)

**Backend (Render/Heroku/Railway):**
1. Connect the `backend/` folder to your deployment platform.
2. Set Environment Variables: `GEMINI_API_KEY`, `JWT_SECRET`, `MONGO_USER`, `MONGO_PASSWORD`, `MONGO_HOST`, and `MONGO_DB`.
3. Start command: `npm start` (which runs `node src/server.js`).

**Frontend (Vercel):**
1. Import the `frontend/` folder into Vercel.
2. Set Environment Variable: `BACKEND_API_URL` to your deployed backend URL (e.g., `https://my-backend.onrender.com/api`).
3. Vercel will automatically run `npm run build` and deploy.

---

## 🧠 LLM Provider & Reasoning

- **Provider**: Google Gemini
- **Model**: `gemini-1.5-flash` (configurable via `GEMINI_MODEL` env var)
- **Why**: It fits securely within the free tier rate limits (RPM/TPM) while being fast enough to handle the 90-second overall generation budget. It strictly follows the complex JSON schema required by Appendix A.

---

## 🤖 Batch Evaluation CLI

```bash
cd backend
npm run evaluate -- --input cases.json --output kits.json
```

**Input schema (`cases.json`):**
```json
[
  { "id": "case-1", "jd": "...", "company_url": "https://...", "days": 5 }
]
```

**Output schema (`kits.json`):**
```json
{
  "version": "1.0",
  "generated_at": "2026-10-06T...",
  "kits": [
    { "id": "case-1", "status": "ok", "kit": {...}, "error": null }
  ]
}
```

- Processes 5 distinct profiles without crashing on bad URLs
- Logs failures gracefully with `status: "failed"` and structured error objects
- Does not exceed 15 minutes for 5 cases

---

## 🧪 Unit Tests

```bash
cd backend
npm test
# 11 tests, 0 failures
```

Tests cover:
- Exact day count matching
- Integer-only minutes
- Must-haves on early days
- Full coverage detection
- Edge cases (empty inputs, 1-day schedules)

---

## ✨ Features

### Dynamic Inline Builder
- Edit any question or flashcard in place — no page reloads
- Add custom questions per category
- Per-category regeneration with state preservation
- Edits marked with `✏️ Edited` badge; custom cards with `✨ Custom` badge

### Practice Mode (Flashcards)
- Tap to flip cards
- Confidence scoring: **Again** / **Hard** / **Good**
- Filter cards by confidence bucket to focus drilling

### Gap Interviewer (Creative Feature)
- Analyzes flashcard confidence scores to identify weak must-have requirements
- Builds a targeted 5-question mock interview session from those exact gaps
- Progress bar, reveal-then-advance flow
- Resets when all cards reach confidence level 2+

### Loading Experience
- Animated dual-spinner loading state
- Real-time step label updates ("Crawling…", "Extracting…", "Building…")
- Error boundary with clear user-facing error messages

---

## 🔒 Security

- **Prompt Injection Defense**: Scraped text is injected into prompts with clear contextual separators. The LLM is instructed to treat scraped text as static content only.
- **Rate Limit Resilience**: `LLMService.callWithRetry()` catches 429 errors and backs off exponentially (2s, 4s, 6s) before retrying up to 3 times.
- **URL Validation**: `WebCrawler` wraps all fetches in try/catch and returns `null` on failure instead of crashing.
