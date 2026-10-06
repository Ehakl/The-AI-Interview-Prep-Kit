"use client";
import { useState } from "react";
import { useKit } from "@/context/KitContext";

/**
 * GapInterviewer.tsx — Creative Feature
 * 
 * Analyzes which `must-have` requirements the user has the LOWEST confidence
 * on (based on their flashcard confidence scores) and launches a focused
 * 5-question mock interview specifically targeting those weak spots.
 */
export default function GapInterviewer() {
  const { state } = useKit();
  const [sessionActive, setSessionActive] = useState(false);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [sessionComplete, setSessionComplete] = useState(false);

  const { kit } = state;
  if (!kit) return null;

  // 1. Find weak spots: cards with confidence <= 1 from must requirements
  const mustReqIds = new Set(
    kit.role.requirements.filter(r => r.priority === "must").map(r => r.id)
  );
  const weakCards = kit.flashcards
    .filter(f => f.requirement_ids.some(id => mustReqIds.has(id)) && f.confidence_score <= 1)
    .slice(0, 5);

  // 2. Get matching questions for those weak requirements
  const weakReqIds = new Set(weakCards.flatMap(f => f.requirement_ids));
  const gapQuestions = kit.questions
    .filter(q => q.requirement_ids.some(id => weakReqIds.has(id)) && q.category !== "company-fit")
    .slice(0, 5);

  const sessionItems = gapQuestions.length > 0 ? gapQuestions : [];

  const handleNext = () => {
    if (currentIdx + 1 >= sessionItems.length) {
      setSessionComplete(true);
    } else {
      setCurrentIdx(i => i + 1);
      setShowAnswer(false);
    }
  };

  const startSession = () => {
    setCurrentIdx(0);
    setShowAnswer(false);
    setSessionComplete(false);
    setSessionActive(true);
  };

  if (sessionItems.length === 0) {
    return (
      <div className="glass-panel rounded-2xl p-8 text-center space-y-4">
        <div className="text-5xl">🏆</div>
        <h3 className="text-xl font-bold text-white">No Weak Spots Detected!</h3>
        <p className="text-gray-400 max-w-md mx-auto">
          Practice your flashcards first and mark any that feel uncertain as "Again" or "Hard". The Gap Interviewer will then build a targeted session for those areas.
        </p>
      </div>
    );
  }

  if (sessionComplete) {
    return (
      <div className="glass-panel rounded-2xl p-8 text-center space-y-6 animate-fade-in">
        <div className="text-5xl">🎯</div>
        <h3 className="text-2xl font-bold text-white">Session Complete!</h3>
        <p className="text-gray-400">You reviewed all {sessionItems.length} weak-spot questions. Keep drilling those flashcards to see this list shrink.</p>
        <button onClick={() => setSessionActive(false)} className="btn-primary py-2 px-8">Back to Overview</button>
      </div>
    );
  }

  if (!sessionActive) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="glass-panel rounded-2xl p-6 border-indigo-500/20 bg-gradient-to-br from-indigo-500/5 to-purple-500/5">
          <div className="flex items-start gap-4">
            <div className="text-3xl">🎯</div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-white mb-1">Gap Interviewer</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                Based on your flashcard confidence scores, we have detected <strong className="text-indigo-400">{sessionItems.length} weak-spot questions</strong> targeting your must-have requirements. Ready to drill them?
              </p>
            </div>
          </div>
          <div className="mt-5">
            <button onClick={startSession} className="btn-primary py-2 px-6 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              Start Mock Interview
            </button>
          </div>
        </div>

        {/* Preview */}
        <div className="space-y-2">
          <p className="text-xs text-gray-500 uppercase tracking-wider">Questions in this session</p>
          {sessionItems.map((q, i) => (
            <div key={q.id} className="glass-panel rounded-xl p-4 flex items-start gap-3">
              <span className="text-xs font-mono text-gray-600 mt-0.5">Q{i + 1}</span>
              <p className="text-sm text-gray-300">{q.prompt}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const current = sessionItems[currentIdx];
  const progress = ((currentIdx) / sessionItems.length) * 100;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Progress */}
      <div className="space-y-2">
        <div className="flex justify-between text-xs text-gray-400">
          <span>Question {currentIdx + 1} of {sessionItems.length}</span>
          <span>{Math.round(progress)}% complete</span>
        </div>
        <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {/* Question Card */}
      <div className="glass-panel rounded-2xl p-8 min-h-[220px] flex flex-col justify-between space-y-6">
        <div>
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-rose-400/10 text-rose-400">Weak Spot</span>
            <span className="text-xs text-gray-500">{current.category} · difficulty {current.difficulty}/3</span>
          </div>
          <p className="text-xl font-semibold text-white leading-relaxed">{current.prompt}</p>
        </div>
        
        {showAnswer && (
          <div className="bg-black/30 border border-white/10 rounded-xl p-5 animate-fade-in">
            <p className="text-xs text-gray-500 mb-2">Answer Outline</p>
            <p className="text-gray-300 leading-relaxed text-sm">{current.answer_outline}</p>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        {!showAnswer ? (
          <button onClick={() => setShowAnswer(true)} className="btn-primary flex-1 py-3 text-base">
            Reveal Answer
          </button>
        ) : (
          <button onClick={handleNext} className="btn-primary flex-1 py-3 text-base">
            {currentIdx + 1 >= sessionItems.length ? "Finish Session →" : "Next Question →"}
          </button>
        )}
        <button onClick={() => setSessionActive(false)} className="btn-secondary py-3 px-4">✕</button>
      </div>
    </div>
  );
}
