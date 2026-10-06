"use client";
import { useState } from "react";
import { Flashcard, useKit } from "@/context/KitContext";

const confidenceConfig = [
  { score: 0, label: "Unseen",   color: "text-gray-400",   bg: "bg-gray-400/10 border-gray-400/20", dot: "bg-gray-400" },
  { score: 1, label: "Again",    color: "text-rose-400",   bg: "bg-rose-400/10 border-rose-400/20",  dot: "bg-rose-400" },
  { score: 2, label: "Hard",     color: "text-amber-400",  bg: "bg-amber-400/10 border-amber-400/20", dot: "bg-amber-400" },
  { score: 3, label: "Good",     color: "text-emerald-400", bg: "bg-emerald-400/10 border-emerald-400/20", dot: "bg-emerald-400" },
];

// ─── Single Flashcard ──────────────────────────────────────────────────────────
function FlashcardItem({ card }: { card: Flashcard }) {
  const { dispatch } = useKit();
  const [flipped, setFlipped] = useState(false);
  const conf = confidenceConfig[card.confidence_score] || confidenceConfig[0];

  const handleConfidence = (score: number) => {
    dispatch({ type: "UPDATE_FLASHCARD_CONFIDENCE", payload: { id: card.id, confidence_score: score } });
  };

  return (
    <div className={`glass-panel rounded-xl overflow-hidden border ${card.is_user_added ? "border-purple-500/30" : "border-white/10"} animate-fade-in`}>
      <div
        className="p-5 cursor-pointer hover:bg-white/5 transition-colors duration-200 min-h-[100px] flex flex-col justify-between"
        onClick={() => setFlipped(f => !f)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === "Enter" || e.key === " " ? setFlipped(f => !f) : null}
        aria-label={flipped ? "Click to see question" : "Click to reveal answer"}
      >
        <div className="flex justify-between items-start gap-2">
          <span className={`text-xs px-2 py-0.5 rounded-full border ${conf.bg} ${conf.color} font-medium`}>
            <span className={`inline-block w-1.5 h-1.5 rounded-full ${conf.dot} mr-1`} />
            {conf.label}
          </span>
          <span className="text-xs text-gray-600">{flipped ? "Answer" : "Question"} · tap to flip</span>
        </div>
        <p className="text-sm leading-relaxed mt-3 font-medium text-white/90">
          {flipped ? card.back : card.front}
        </p>
      </div>

      {/* Confidence scoring */}
      {flipped && (
        <div className="border-t border-white/5 px-5 py-3 flex items-center gap-2">
          <span className="text-xs text-gray-500 mr-1">How well did you know it?</span>
          {confidenceConfig.slice(1).map(c => (
            <button
              key={c.score}
              onClick={() => handleConfidence(c.score)}
              className={`text-xs px-3 py-1 rounded-lg border transition-all duration-150 font-medium ${card.confidence_score === c.score ? c.bg + " " + c.color : "border-white/5 text-gray-500 hover:border-white/20 hover:text-gray-300"}`}
            >
              {c.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Flashcard Mode ────────────────────────────────────────────────────────────
export default function FlashcardMode() {
  const { state } = useKit();
  const [filter, setFilter] = useState<number | "all">("all");
  const { kit } = state;

  if (!kit) return null;

  const filtered = filter === "all"
    ? kit.flashcards
    : kit.flashcards.filter(f => f.confidence_score === filter);

  const totalByConf = confidenceConfig.map(c => ({
    ...c,
    count: kit.flashcards.filter(f => f.confidence_score === c.score).length,
  }));

  return (
    <div className="space-y-6">
      {/* Summary strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {totalByConf.map(c => (
          <button
            key={c.score}
            onClick={() => setFilter(f => f === c.score ? "all" : c.score)}
            className={`glass-panel rounded-xl p-4 text-left transition-all duration-200 hover:bg-white/10 ${filter === c.score ? "ring-2 ring-indigo-500" : ""}`}
          >
            <div className={`text-2xl font-bold ${c.color}`}>{c.count}</div>
            <div className="text-xs text-gray-400 mt-0.5">{c.label}</div>
          </button>
        ))}
      </div>

      {/* Filter pills */}
      <div className="flex items-center gap-2 text-sm">
        <span className="text-gray-500">Filter:</span>
        <button onClick={() => setFilter("all")} className={`px-3 py-1 rounded-full border transition-all ${filter === "all" ? "border-indigo-500 text-indigo-400 bg-indigo-500/10" : "border-white/10 text-gray-400 hover:border-white/20"}`}>All</button>
        {confidenceConfig.slice(1).map(c => (
          <button key={c.score} onClick={() => setFilter(f => f === c.score ? "all" : c.score)} className={`px-3 py-1 rounded-full border transition-all ${filter === c.score ? `${c.bg} ${c.color}` : "border-white/10 text-gray-400 hover:border-white/20"}`}>
            {c.label}
          </button>
        ))}
      </div>

      {/* Cards grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <div className="text-4xl mb-3">🎉</div>
          <p>No cards in this bucket. Great work!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map(card => <FlashcardItem key={card.id} card={card} />)}
        </div>
      )}
    </div>
  );
}
