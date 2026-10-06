"use client";
import { useEffect, useState, useCallback } from "react";
import { Question, QuestionCategory, useKit } from "@/context/KitContext";

// ─── Difficulty Badge ──────────────────────────────────────────────────────────
const difficultyColors = { 1: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20", 2: "text-amber-400 bg-amber-400/10 border-amber-400/20", 3: "text-rose-400 bg-rose-400/10 border-rose-400/20" };
const difficultyLabel = { 1: "Easy", 2: "Medium", 3: "Hard" };

function DifficultyBadge({ level }: { level: 1 | 2 | 3 }) {
  return <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${difficultyColors[level]}`}>{difficultyLabel[level]}</span>;
}

// ─── Category Tag ──────────────────────────────────────────────────────────────
const categoryColors: Record<QuestionCategory, string> = {
  technical: "text-sky-400 bg-sky-400/10",
  behavioural: "text-violet-400 bg-violet-400/10",
  "system-design": "text-orange-400 bg-orange-400/10",
  "company-fit": "text-pink-400 bg-pink-400/10",
};

function CategoryTag({ category }: { category: QuestionCategory }) {
  return <span className={`text-xs font-medium px-2 py-0.5 rounded-md ${categoryColors[category]}`}>{category}</span>;
}

// ─── Editable Question Card ────────────────────────────────────────────────────
function QuestionCard({ question, index }: { question: Question; index: number }) {
  const { dispatch } = useKit();
  const [isEditing, setIsEditing] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [editPrompt, setEditPrompt] = useState(question.prompt);
  const [editAnswer, setEditAnswer] = useState(question.answer_outline);

  const handleSave = (e: React.MouseEvent) => {
    e.stopPropagation();
    dispatch({ type: "UPDATE_QUESTION", payload: { ...question, prompt: editPrompt, answer_outline: editAnswer } });
    setIsEditing(false);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    dispatch({ type: "DELETE_QUESTION", payload: question.id });
  };

  const toggleExpand = () => {
    if (!isEditing) setIsExpanded(!isExpanded);
  };

  return (
    <div 
      onClick={toggleExpand}
      className={`glass-panel rounded-xl p-5 space-y-3 animate-fade-in transition-all duration-300 group cursor-pointer hover:bg-white/[0.03] ${isExpanded ? "border-indigo-500/30 bg-white/[0.02]" : "border-white/10"} ${question.is_user_edited ? "border-indigo-500/40" : ""}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-mono text-gray-500 select-none">#{index + 1}</span>
          <CategoryTag category={question.category} />
          <DifficultyBadge level={question.difficulty} />
          {question.is_user_edited && <span className="text-xs text-indigo-400 border border-indigo-500/30 bg-indigo-500/10 px-2 py-0.5 rounded-full">✏️ Edited</span>}
          {question.is_user_added && <span className="text-xs text-purple-400 border border-purple-500/30 bg-purple-500/10 px-2 py-0.5 rounded-full">✨ Custom</span>}
        </div>
        <div className="flex items-center gap-2">
          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 mr-2">
            <button 
              onClick={(e) => { e.stopPropagation(); setIsEditing(true); setIsExpanded(true); }} 
              aria-label="Edit question" 
              className="text-gray-400 hover:text-indigo-400 transition-colors p-1.5 rounded hover:bg-white/5"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
            </button>
            <button 
              onClick={handleDelete} 
              aria-label="Delete question" 
              className="text-gray-400 hover:text-rose-400 transition-colors p-1.5 rounded hover:bg-white/5"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            </button>
          </div>
          <svg className={`w-5 h-5 text-gray-500 transition-transform duration-300 ${isExpanded ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {/* Content */}
      {isEditing ? (
        <div className="space-y-4 pt-2" onClick={e => e.stopPropagation()}>
          <div>
            <label className="text-xs font-semibold text-gray-400 mb-1.5 block uppercase tracking-wider">Question Prompt</label>
            <textarea value={editPrompt} onChange={e => setEditPrompt(e.target.value)} className="input-field text-sm resize-none focus:ring-2 focus:ring-indigo-500/50" rows={3} />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-400 mb-1.5 block uppercase tracking-wider">Answer Outline</label>
            <textarea value={editAnswer} onChange={e => setEditAnswer(e.target.value)} className="input-field text-sm resize-none focus:ring-2 focus:ring-indigo-500/50" rows={4} />
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={handleSave} className="btn-primary text-sm py-2 px-6 shadow-lg shadow-indigo-500/20">Save Changes</button>
            <button onClick={() => setIsEditing(false)} className="btn-secondary text-sm py-2 px-6 hover:bg-white/10 border-transparent">Cancel</button>
          </div>
        </div>
      ) : (
        <div className="space-y-3 pt-1">
          <p className="text-white/95 font-medium leading-relaxed text-[15px]">{question.prompt}</p>
          
          <div className={`grid transition-all duration-300 ease-in-out ${isExpanded ? "grid-rows-[1fr] opacity-100 mt-4" : "grid-rows-[0fr] opacity-0 mt-0"}`}>
            <div className="overflow-hidden">
              <div className="pt-3 border-t border-white/5">
                <p className="text-xs font-semibold text-indigo-400/80 uppercase tracking-wider mb-2 flex items-center gap-2">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  Ideal Answer Outline
                </p>
                <div className="text-[14px] text-gray-300/90 leading-relaxed bg-black/20 p-4 rounded-xl border border-white/5 whitespace-pre-wrap">
                  {question.answer_outline}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Category Section ──────────────────────────────────────────────────────────
function CategorySection({ category, questions }: { category: QuestionCategory; questions: Question[] }) {
  const { regenerateCategory, dispatch } = useKit();
  const [isRegenerating, setIsRegenerating] = useState(false);

  const handleRegenerate = async () => {
    setIsRegenerating(true);
    await regenerateCategory(category);
    setIsRegenerating(false);
  };

  const handleAddQuestion = () => {
    const newQ: Question = {
      id: `user-${Date.now()}`,
      requirement_ids: [],
      category,
      prompt: "New question (click edit to change)",
      answer_outline: "Add your answer outline here",
      difficulty: 2,
      is_user_added: true
    };
    dispatch({ type: "ADD_QUESTION", payload: newQ });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <CategoryTag category={category} />
          <span className="text-sm text-gray-500">{questions.length} question{questions.length !== 1 ? "s" : ""}</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleAddQuestion} className="text-xs btn-secondary py-1 px-3 flex items-center gap-1">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            Add
          </button>
          <button onClick={handleRegenerate} disabled={isRegenerating} className="text-xs btn-secondary py-1 px-3 flex items-center gap-1 disabled:opacity-50">
            {isRegenerating ? <><span className="animate-spin w-3 h-3 border border-indigo-400 border-t-transparent rounded-full" />Regenerating...</> : <>↻ Regenerate</>}
          </button>
        </div>
      </div>
      <div className="space-y-3">
        {questions.map((q, i) => <QuestionCard key={q.id} question={q} index={i} />)}
      </div>
    </div>
  );
}

// ─── Question Builder ──────────────────────────────────────────────────────────
const CATEGORIES: QuestionCategory[] = ["technical", "system-design", "behavioural", "company-fit"];

export default function QuestionBuilder() {
  const { state } = useKit();
  const { kit } = state;

  if (!kit) return null;

  const questionsByCategory = CATEGORIES.reduce<Record<string, Question[]>>((acc, cat) => {
    acc[cat] = kit.questions.filter(q => q.category === cat);
    return acc;
  }, {});

  const totalQuestions = kit.questions.length;

  return (
    <div className="space-y-10">
      {totalQuestions === 0 ? (
        <div className="glass-panel rounded-2xl p-12 text-center flex flex-col items-center justify-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center text-2xl mb-2">💬</div>
          <h3 className="text-xl font-semibold text-white">No questions generated yet</h3>
          <p className="text-sm text-gray-400 max-w-sm">
            It looks like this kit doesn't have any questions. Try regenerating the kit or adding custom questions manually.
          </p>
        </div>
      ) : (
        CATEGORIES.map(cat => (
          questionsByCategory[cat].length > 0 && (
            <CategorySection key={cat} category={cat} questions={questionsByCategory[cat]} />
          )
        ))
      )}
    </div>
  );
}
