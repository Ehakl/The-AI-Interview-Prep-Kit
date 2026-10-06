"use client";
import { useState } from "react";
import { useKit } from "@/context/KitContext";

// Difficulty helper
const difficultyColors = { 1: "text-emerald-400 border-emerald-400/20", 2: "text-amber-400 border-amber-400/20", 3: "text-rose-400 border-rose-400/20" };
const difficultyLabel = { 1: "Easy", 2: "Medium", 3: "Hard" };
function DifficultyBadge({ level }: { level: 1 | 2 | 3 }) {
  return <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-sm border ${difficultyColors[level]}`}>{difficultyLabel[level]}</span>;
}

export default function ScheduleView({ setActiveTab }: { setActiveTab?: (tab: any) => void }) {
  const { state } = useKit();
  const [expandedDay, setExpandedDay] = useState<number | null>(null);
  const [expandedQuestion, setExpandedQuestion] = useState<string | null>(null);
  const { kit } = state;
  if (!kit) return null;

  const { days } = kit.schedule;

  const categoryColors: Record<string, string> = {
    "Technical Focus": "from-sky-500/20 to-sky-600/5 border-sky-500/30",
    "Behavioural Focus": "from-violet-500/20 to-violet-600/5 border-violet-500/30",
    "System-design Focus": "from-orange-500/20 to-orange-600/5 border-orange-500/30",
    "Company-fit Focus": "from-pink-500/20 to-pink-600/5 border-pink-500/30",
    "Mixed Review": "from-indigo-500/20 to-indigo-600/5 border-indigo-500/30",
    "Rest and Review": "from-gray-500/20 to-gray-600/5 border-gray-500/30",
  };

  const getGradient = (focus: string) => {
    for (const key of Object.keys(categoryColors)) {
      if (focus.includes(key.split(" ")[0])) return categoryColors[key];
    }
    return categoryColors["Mixed Review"];
  };

  const toggleDay = (dayNum: number) => {
    setExpandedDay(prev => prev === dayNum ? null : dayNum);
  };

  const toggleQuestion = (qId: string) => {
    setExpandedQuestion(prev => prev === qId ? null : qId);
  };

  const handleStartHere = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (setActiveTab) setActiveTab("flashcards");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-400">Your <strong className="text-white">{days.length}-day</strong> study plan. High-priority topics load first.</p>
      </div>

      <div className="space-y-3">
        {days.map((day) => {
          const questionsForDay = kit.questions.filter(q => day.question_ids.includes(q.id));
          const isToday = day.day === 1;
          const isExpanded = expandedDay === day.day;

          return (
            <div 
              key={day.day} 
              onClick={() => toggleDay(day.day)}
              onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && toggleDay(day.day)}
              tabIndex={0}
              className={`rounded-xl border bg-gradient-to-r p-5 ${getGradient(day.focus)} transition-all duration-300 hover:scale-[1.01] cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${isToday ? "bg-indigo-500 text-white" : "bg-white/10 text-gray-300"}`}>
                    {day.day}
                  </div>
                  <div>
                    <div className="font-semibold text-white">{day.focus}</div>
                    <div className="text-xs text-gray-400 mt-0.5">{day.minutes} minutes · {questionsForDay.length} {questionsForDay.length === 1 ? 'question' : 'questions'}</div>
                  </div>
                </div>
                {isToday && (
                  <button 
                    onClick={handleStartHere}
                    className="text-xs bg-indigo-500 hover:bg-indigo-600 transition-colors text-white px-3 py-1 rounded-full shrink-0 shadow-lg"
                  >
                    Start Here
                  </button>
                )}
              </div>

              {questionsForDay.length > 0 && (
                <div className="mt-4 space-y-3 pl-13">
                  {!isExpanded ? (
                    // Collapsed View
                    <>
                      <div className="space-y-1.5">
                        {questionsForDay.slice(0, 3).map(q => (
                          <div key={q.id} className="flex items-start gap-2 text-sm text-gray-400">
                            <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-gray-500 shrink-0" />
                            <span className="line-clamp-1">{q.prompt}</span>
                          </div>
                        ))}
                        {questionsForDay.length > 3 && (
                          <div className="text-xs text-gray-500 pl-3.5">+{questionsForDay.length - 3} more. Click to expand.</div>
                        )}
                      </div>
                    </>
                  ) : (
                    // Expanded View
                    <div className="space-y-4 animate-fade-in pt-2">
                      {questionsForDay.map(q => (
                        <div 
                          key={q.id} 
                          onClick={(e) => { e.stopPropagation(); toggleQuestion(q.id); }}
                          className={`text-sm border-l-2 cursor-pointer transition-colors p-3 rounded-r-xl ${expandedQuestion === q.id ? "border-indigo-400 bg-white/5" : "border-white/10 hover:bg-white/[0.02]"}`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-start gap-3">
                              <DifficultyBadge level={q.difficulty as 1|2|3} />
                              <span className="text-gray-200 leading-relaxed font-medium">{q.prompt}</span>
                            </div>
                            <svg className={`w-4 h-4 text-gray-500 mt-0.5 shrink-0 transition-transform duration-300 ${expandedQuestion === q.id ? "rotate-180 text-indigo-400" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </div>
                          
                          <div className={`grid transition-all duration-300 ease-in-out ${expandedQuestion === q.id ? "grid-rows-[1fr] opacity-100 mt-3" : "grid-rows-[0fr] opacity-0 mt-0"}`}>
                            <div className="overflow-hidden">
                              <div className="pt-2">
                                <p className="text-[10px] font-semibold text-indigo-400/80 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                  Answer Outline
                                </p>
                                <div className="mt-1 text-xs text-gray-300/90 leading-relaxed bg-black/25 p-3 rounded-lg border border-white/5 whitespace-pre-wrap">
                                  {q.answer_outline}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
