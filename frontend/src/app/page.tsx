"use client";
import { useState } from "react";
import { KitProvider, useKit } from "@/context/KitContext";
import QuestionBuilder from "@/components/QuestionBuilder";
import FlashcardMode from "@/components/FlashcardMode";
import ScheduleView from "@/components/ScheduleView";
import GapInterviewer from "@/components/GapInterviewer";

// ─── Loading Screen ────────────────────────────────────────────────────────────
function LoadingScreen({ step }: { step: string }) {
  return (
    <div className="fixed inset-0 bg-[var(--color-background)]/95 backdrop-blur-sm z-50 flex flex-col items-center justify-center">
      <div className="relative w-20 h-20 mb-8">
        <div className="absolute inset-0 rounded-full border-2 border-indigo-500/20" />
        <div className="absolute inset-0 rounded-full border-2 border-t-indigo-500 animate-spin" />
        <div className="absolute inset-2 rounded-full border-2 border-t-purple-500 animate-spin" style={{ animationDirection: "reverse", animationDuration: "1s" }} />
        <div className="absolute inset-0 flex items-center justify-center text-2xl">✨</div>
      </div>
      <h2 className="text-xl font-bold text-white mb-2">Building Your Kit</h2>
      <p className="text-gray-400 text-sm animate-pulse">{step}</p>
      <p className="text-gray-600 text-xs mt-4">This can take up to 90 seconds…</p>
    </div>
  );
}

// ─── Kit Dashboard ─────────────────────────────────────────────────────────────
type Tab = "schedule" | "questions" | "flashcards" | "gap";
const tabs: { id: Tab; label: string; icon: string }[] = [
  { id: "schedule", label: "Schedule", icon: "📅" },
  { id: "questions", label: "Questions", icon: "💬" },
  { id: "flashcards", label: "Flashcards", icon: "🃏" },
  { id: "gap", label: "Gap Interviewer", icon: "🎯" },
];

function KitDashboard() {
  const { state, dispatch } = useKit();
  const [activeTab, setActiveTab] = useState<Tab>("schedule");
  const { kit } = state;
  if (!kit) return null;

  return (
    <div className="min-h-screen flex flex-col animate-fade-in">
      {/* Header Group */}
      <div className="bg-[#0f1117] flex flex-col shadow-xl">
        {/* Top Nav */}
        <header className="border-b border-white/10 px-4 lg:px-8 py-4">
          <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button onClick={() => dispatch({ type: "RESET" })} className="text-gray-400 hover:text-white transition-colors" aria-label="Back to home">
                ← 
              </button>
              <div>
                <h1 className="font-bold text-white text-sm lg:text-base">{kit.role.title}</h1>
                <p className="text-xs text-gray-500">{kit.source.company}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-xs px-2 py-1 rounded-full border ${kit.coverage.uncovered_requirement_ids.length === 0 ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" : "bg-amber-500/10 border-amber-500/30 text-amber-400"}`}>
                {kit.coverage.uncovered_requirement_ids.length === 0 ? "✓ All must-haves covered" : `⚠ ${kit.coverage.uncovered_requirement_ids.length} ${kit.coverage.uncovered_requirement_ids.length === 1 ? 'gap' : 'gaps'}`}
              </span>
              <span className="text-xs text-gray-500 hidden md:inline">{kit.schedule.days_available}d plan · {kit.questions.length}q · {kit.flashcards.length} cards</span>
            </div>
          </div>
        </header>

        {state.error && (
          <div className="bg-rose-500/10 border-b border-rose-500/30 px-4 lg:px-8 py-2 flex justify-between items-center">
            <span className="text-sm text-rose-400">⚠ {state.error}</span>
            <button onClick={() => dispatch({ type: "GENERATION_ERROR", payload: "" })} className="text-gray-400 hover:text-white">✕</button>
          </div>
        )}

        {/* Tab Bar */}
        <div className="border-b border-white/5 px-4 lg:px-8">
          <div className="max-w-6xl mx-auto flex overflow-x-auto hide-scrollbar gap-1">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-all duration-200 ${activeTab === tab.id ? "border-indigo-500 text-indigo-400" : "border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-600"}`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <main className="flex-1 px-4 lg:px-8 py-8">
        <div className="max-w-4xl mx-auto">
          {activeTab === "schedule" && <ScheduleView setActiveTab={setActiveTab} />}
          {activeTab === "questions" && <QuestionBuilder />}
          {activeTab === "flashcards" && <FlashcardMode />}
          {activeTab === "gap" && <GapInterviewer />}
        </div>
      </main>
    </div>
  );
}

// ─── Home Form ─────────────────────────────────────────────────────────────────
function HomeForm() {
  const { state, generateKit } = useKit();
  const [companyUrl, setCompanyUrl] = useState("");
  const [days, setDays] = useState(5);
  const [jd, setJd] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await generateKit(jd, companyUrl, days);
  };

  if (state.isGenerating) return <LoadingScreen step={state.generationStep} />;
  if (state.kit) return <KitDashboard />;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 lg:p-24 relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/20 rounded-full blur-[120px] pointer-events-none" />

      <div className="z-10 w-full max-w-4xl flex flex-col items-center text-center animate-fade-in">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass-panel text-sm text-indigo-300 mb-8 border border-indigo-500/30">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500" />
          </span>
          AI-Powered Interview Prep
        </div>

        <h1 className="text-5xl lg:text-7xl font-extrabold tracking-tight mb-6 bg-clip-text text-transparent bg-gradient-to-br from-white via-indigo-100 to-purple-300">
          Ace Your Next Interview
        </h1>
        <p className="text-lg lg:text-xl text-[var(--color-text-muted)] max-w-2xl mb-12 animate-fade-in-delayed">
          Paste any job description. Get a personalized study schedule, question bank, flashcards, and gap analysis — powered by AI, driven by deterministic logic.
        </p>

        {state.error && (
          <div className="w-full mb-6 glass-panel rounded-xl p-4 border-rose-500/30 bg-rose-500/5 text-rose-400 text-sm text-left animate-fade-in">
            ⚠ {state.error}
          </div>
        )}

        <div className="w-full glass-panel rounded-2xl p-6 lg:p-8 text-left animate-fade-in-delayed shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label htmlFor="company-url" className="text-sm font-medium text-gray-300">Company Website URL</label>
                <input id="company-url" type="url" placeholder="https://example.com" className="input-field" value={companyUrl} onChange={e => setCompanyUrl(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <label htmlFor="days-available" className="text-sm font-medium text-gray-300">Days Until Interview</label>
                <input id="days-available" type="number" min="1" max="30" className="input-field" value={days} onChange={e => setDays(Math.max(1, parseInt(e.target.value) || 1))} required />
              </div>
            </div>
            <div className="space-y-2">
              <label htmlFor="job-description" className="text-sm font-medium text-gray-300">Job Description</label>
              <textarea id="job-description" rows={9} placeholder="Paste the full job description here..." className="input-field resize-none" value={jd} onChange={e => setJd(e.target.value)} required />
            </div>
            <div className="pt-2 flex flex-col md:flex-row justify-between items-center gap-4">
              <p className="text-xs text-gray-500">Takes 30–90s · Crawls company site · Loops for full coverage</p>
              <button type="submit" id="generate-kit-btn" className="btn-primary w-full md:w-auto text-base py-3 px-8 flex justify-center items-center gap-2">
                Generate My Kit
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
              </button>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}

// ─── Root Page ─────────────────────────────────────────────────────────────────
import { AuthProvider, useAuth } from "@/context/AuthContext";
import AuthPage from "@/components/AuthPage";

function AuthenticatedApp() {
  const { user, isLoading, logout } = useAuth();
  
  if (isLoading) return <div className="min-h-screen bg-[#0f1117]" />;
  if (!user) return <AuthPage />;
  
  return (
    <>
      <div className="absolute top-4 right-4 z-50">
        <button onClick={logout} className="text-xs text-gray-400 hover:text-white px-3 py-1.5 rounded-md border border-white/10 hover:bg-white/5 transition-colors">
          Sign out ({user.email})
        </button>
      </div>
      <KitProvider>
        <HomeForm />
      </KitProvider>
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AuthenticatedApp />
    </AuthProvider>
  );
}
