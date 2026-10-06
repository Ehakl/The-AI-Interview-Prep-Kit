"use client";
import { useKit } from "@/context/KitContext";

export default function ScheduleView() {
  const { state } = useKit();
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-400">Your <strong className="text-white">{days.length}-day</strong> study plan. High-priority topics load first.</p>
      </div>

      <div className="space-y-3">
        {days.map((day) => {
          const questionsForDay = kit.questions.filter(q => day.question_ids.includes(q.id));
          const isToday = day.day === 1;

          return (
            <div key={day.day} className={`rounded-xl border bg-gradient-to-r p-5 ${getGradient(day.focus)} transition-all duration-300 hover:scale-[1.01]`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${isToday ? "bg-indigo-500 text-white" : "bg-white/10 text-gray-300"}`}>
                    {day.day}
                  </div>
                  <div>
                    <div className="font-semibold text-white">{day.focus}</div>
                    <div className="text-xs text-gray-400 mt-0.5">{day.minutes} minutes · {questionsForDay.length} questions</div>
                  </div>
                </div>
                {isToday && <span className="text-xs bg-indigo-500/20 border border-indigo-500/30 text-indigo-400 px-2 py-0.5 rounded-full shrink-0">Start Here</span>}
              </div>

              {questionsForDay.length > 0 && (
                <div className="mt-4 space-y-1.5 pl-13">
                  {questionsForDay.slice(0, 3).map(q => (
                    <div key={q.id} className="flex items-start gap-2 text-sm text-gray-400">
                      <span className="mt-1 w-1.5 h-1.5 rounded-full bg-gray-500 shrink-0" />
                      <span className="line-clamp-1">{q.prompt}</span>
                    </div>
                  ))}
                  {questionsForDay.length > 3 && (
                    <div className="text-xs text-gray-500 pl-3.5">+{questionsForDay.length - 3} more</div>
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
