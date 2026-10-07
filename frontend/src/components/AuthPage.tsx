"use client";
import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";

import { apiFetch } from "../utils/apiFetch";

export default function AuthPage() {
  const { login } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    const endpoint = isLogin ? "/auth/login" : "/auth/register";
    try {
      const data = await apiFetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      login(data.user);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/20 rounded-full blur-[120px] pointer-events-none" />
      
      <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 gap-8 items-center z-10 animate-fade-in">
        
        {/* Left Side: Product Explanation */}
        <div className="hidden md:flex flex-col text-left p-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass-panel text-sm text-indigo-300 w-fit mb-6 border border-indigo-500/30">
            AI-Powered Interview Prep
          </div>
          <h1 className="text-4xl lg:text-5xl font-extrabold tracking-tight mb-4 bg-clip-text text-transparent bg-gradient-to-br from-white via-indigo-100 to-purple-300">
            Ace Your Next Interview
          </h1>
          <p className="text-lg text-[var(--color-text-muted)] mb-8">
            Paste any job description and get a personalized study schedule, question bank, flashcards, and a gap analysis. Powered by AI and designed to get you hired.
          </p>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="text-xl">📅</div>
              <div>
                <h3 className="font-semibold text-white">Smart Study Schedules</h3>
                <p className="text-sm text-gray-400">Paces your preparation over the days you have left.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="text-xl">🎯</div>
              <div>
                <h3 className="font-semibold text-white">Targeted Questions</h3>
                <p className="text-sm text-gray-400">Covers technical, behavioural, system design, and company fit.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Auth Form */}
        <div className="w-full max-w-md mx-auto glass-panel rounded-2xl p-8 shadow-2xl relative">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">{isLogin ? "Welcome Back" : "Create Account"}</h1>
            <p className="text-gray-400 text-sm">Sign in to save and access your interview kits</p>
          </div>

          {error && (
            <div className="mb-6 bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm rounded-lg p-3">
              ⚠ {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-300">Email Address</label>
              <input 
                type="email" 
                required 
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="input-field" 
                placeholder="you@example.com" 
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-300">Password</label>
              <input 
                type="password" 
                required 
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="input-field" 
                placeholder="••••••••" 
              />
            </div>

            <button type="submit" disabled={isLoading} className="btn-primary w-full py-3 mt-4 disabled:opacity-50 flex items-center justify-center gap-2">
              {isLoading ? <span className="animate-spin w-4 h-4 border-2 border-white/20 border-t-white rounded-full" /> : null}
              {isLogin ? "Sign In" : "Register"}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button 
              onClick={() => { setIsLogin(!isLogin); setError(""); }}
              className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              {isLogin ? "Don't have an account? Register here" : "Already have an account? Sign in"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
