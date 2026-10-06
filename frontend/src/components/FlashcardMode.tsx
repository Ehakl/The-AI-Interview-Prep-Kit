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
    <div className={`glass-panel rounded-xl overflow-hidden border ${card.is_user_added ? "border-purple-500/30" : "border-white/10"} animate-fade-in perspective-[1000px] h-[250px]`}>
      <div
        className={`relative w-full h-full transition-transform duration-500 transform-style-3d cursor-pointer ${flipped ? 'rotate-y-180' : ''}`}
        onClick={() => setFlipped(f => !f)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === "Enter" || e.key === " " ? setFlipped(f => !f) : null}
        aria-label={flipped ? "Click to see question" : "Click to reveal answer"}
      >
        {/* Front */}
        <div className="absolute inset-0 p-6 backface-hidden flex flex-col justify-between hover:bg-white/[0.03]">
          <div className="flex justify-between items-start gap-2">
            <span className={`text-[10px] uppercase tracking-wider px-2 py-1 rounded border ${conf.bg} ${conf.color} font-bold flex items-center shadow-sm`}>
              <span className={`inline-block w-1.5 h-1.5 rounded-full ${conf.dot} mr-1.5 animate-pulse`} />
              {conf.label}
            </span>
            <span className="text-[10px] font-semibold tracking-wider text-gray-500 uppercase bg-black/20 px-2 py-1 rounded">Question</span>
          </div>
          <div className="flex-1 flex items-center justify-center">
            <p className="text-[17px] leading-relaxed font-semibold text-white/95 text-center px-2">
              {card.front}
            </p>
          </div>
          <div className="text-center">
            <span className="text-[10px] text-gray-500 font-medium uppercase tracking-widest opacity-60">Tap to flip</span>
          </div>
        </div>

        {/* Back */}
        <div className="absolute inset-0 p-6 backface-hidden rotate-y-180 flex flex-col justify-between bg-indigo-900/10 hover:bg-indigo-900/20">
          <div className="flex justify-between items-start gap-2">
            <span className="text-[10px] font-semibold tracking-wider text-indigo-400 uppercase bg-indigo-500/10 px-2 py-1 rounded border border-indigo-500/20">Answer</span>
          </div>
          <div className="flex-1 flex items-center justify-center overflow-y-auto hide-scrollbar py-2">
            <p className="text-[15px] leading-relaxed font-medium text-gray-200 text-center px-2">
              {card.back}
            </p>
          </div>
        </div>
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

  const filtered = (filter === "all"
    ? [...kit.flashcards]
    : kit.flashcards.filter(f => f.confidence_score === filter)
  ).sort((a, b) => a.confidence_score - b.confidence_score);

  const totalByConf = confidenceConfig.map(c => ({
    ...c,
    count: kit.flashcards.filter(f => f.confidence_score === c.score).length,
  }));

  if (kit.flashcards.length === 0) {
    return (
      <div className="glass-panel rounded-2xl p-12 text-center flex flex-col items-center justify-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center text-2xl mb-2">🃏</div>
        <h3 className="text-xl font-semibold text-white">No flashcards generated</h3>
        <p className="text-sm text-gray-400 max-w-sm">
          It looks like this kit doesn't have any flashcards.
        </p>
      </div>
    );
  }

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
