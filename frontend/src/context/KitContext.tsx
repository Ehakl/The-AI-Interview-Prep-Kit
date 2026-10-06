"use client";
import React, { createContext, useContext, useReducer, useCallback, ReactNode } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────
export type Priority = "must" | "nice";
export type QuestionCategory = "technical" | "behavioural" | "system-design" | "company-fit";
export type RequirementKind = "technical" | "behavioural" | "domain";

export interface Requirement {
  id: string;
  text: string;
  kind: RequirementKind;
  priority: Priority;
  is_user_edited?: boolean;
  is_user_added?: boolean;
}

export interface Question {
  id: string;
  requirement_ids: string[];
  category: QuestionCategory;
  prompt: string;
  answer_outline: string;
  difficulty: 1 | 2 | 3;
  is_user_edited?: boolean;
  is_user_added?: boolean;
}

export interface Flashcard {
  id: string;
  front: string;
  back: string;
  requirement_ids: string[];
  confidence_score: number; // 0 = unseen, 1 = low, 2 = medium, 3 = high
  is_user_edited?: boolean;
  is_user_added?: boolean;
}

export interface ScheduleDay {
  day: number;
  focus: string;
  question_ids: string[];
  minutes: number;
}

export interface Kit {
  _id?: string;
  source: {
    company: string;
    company_url: string;
    role: string;
    location: string;
    jd_chars: number;
    researched_at: string;
    pages_used: string[];
  };
  company_brief: { summary: string; what_they_do: string; sources: string[]; is_user_edited?: boolean };
  role: { title: string; seniority: string; responsibilities: string[]; requirements: Requirement[]; is_user_edited?: boolean };
  questions: Question[];
  flashcards: Flashcard[];
  schedule: { days_available: number; days: ScheduleDay[]; is_user_edited?: boolean };
  coverage: { uncovered_requirement_ids: string[]; passes: number };
}

// ─── State ────────────────────────────────────────────────────────────────────
interface KitState {
  kit: Kit | null;
  isGenerating: boolean;
  generationStep: string;
  error: string | null;
}

const initialState: KitState = { kit: null, isGenerating: false, generationStep: "", error: null };

// ─── Actions ──────────────────────────────────────────────────────────────────
type Action =
  | { type: "GENERATION_START" }
  | { type: "GENERATION_STEP"; payload: string }
  | { type: "GENERATION_SUCCESS"; payload: Kit }
  | { type: "GENERATION_ERROR"; payload: string }
  | { type: "UPDATE_QUESTION"; payload: Question }
  | { type: "DELETE_QUESTION"; payload: string }
  | { type: "ADD_QUESTION"; payload: Question }
  | { type: "REORDER_QUESTIONS"; payload: Question[] }
  | { type: "UPDATE_FLASHCARD"; payload: Flashcard }
  | { type: "UPDATE_FLASHCARD_CONFIDENCE"; payload: { id: string; confidence_score: number } }
  | { type: "REGENERATE_CATEGORY_SUCCESS"; payload: { category: QuestionCategory; newQuestions: Question[] } }
  | { type: "RESET" };

// ─── Reducer ──────────────────────────────────────────────────────────────────
function kitReducer(state: KitState, action: Action): KitState {
  switch (action.type) {
    case "GENERATION_START":
      return { ...state, isGenerating: true, error: null, generationStep: "Crawling company website..." };

    case "GENERATION_STEP":
      return { ...state, generationStep: action.payload };

    case "GENERATION_SUCCESS":
      return { ...state, isGenerating: false, generationStep: "", kit: action.payload, error: null };

    case "GENERATION_ERROR":
      return { ...state, isGenerating: false, generationStep: "", error: action.payload };

    case "UPDATE_QUESTION": {
      if (!state.kit) return state;
      const updated = state.kit.questions.map(q =>
        q.id === action.payload.id ? { ...action.payload, is_user_edited: true } : q
      );
      return { ...state, kit: { ...state.kit, questions: updated } };
    }

    case "DELETE_QUESTION": {
      if (!state.kit) return state;
      return { ...state, kit: { ...state.kit, questions: state.kit.questions.filter(q => q.id !== action.payload) } };
    }

    case "ADD_QUESTION": {
      if (!state.kit) return state;
      return { ...state, kit: { ...state.kit, questions: [...state.kit.questions, { ...action.payload, is_user_added: true }] } };
    }

    case "REORDER_QUESTIONS": {
      if (!state.kit) return state;
      return { ...state, kit: { ...state.kit, questions: action.payload } };
    }

    case "UPDATE_FLASHCARD": {
      if (!state.kit) return state;
      const updated = state.kit.flashcards.map(f =>
        f.id === action.payload.id ? { ...action.payload, is_user_edited: true } : f
      );
      return { ...state, kit: { ...state.kit, flashcards: updated } };
    }

    case "UPDATE_FLASHCARD_CONFIDENCE": {
      if (!state.kit) return state;
      const updated = state.kit.flashcards.map(f =>
        f.id === action.payload.id ? { ...f, confidence_score: action.payload.confidence_score } : f
      );
      return { ...state, kit: { ...state.kit, flashcards: updated } };
    }

    // ─── THE CRITICAL STATE PRESERVATION LOGIC ─────────────────────────────
    // When a category is regenerated, only replace AI-generated questions.
    // User-edited or user-added questions SURVIVE.
    case "REGENERATE_CATEGORY_SUCCESS": {
      if (!state.kit) return state;
      const { category, newQuestions } = action.payload;
      const preserved = state.kit.questions.filter(
        q => q.category !== category || q.is_user_edited || q.is_user_added
      );
      return { ...state, kit: { ...state.kit, questions: [...preserved, ...newQuestions] } };
    }

    case "RESET":
      return initialState;

    default:
      return state;
  }
}

// ─── Context ──────────────────────────────────────────────────────────────────
interface KitContextValue {
  state: KitState;
  dispatch: React.Dispatch<Action>;
  generateKit: (jd: string, companyUrl: string, days: number) => Promise<void>;
  regenerateCategory: (category: QuestionCategory) => Promise<void>;
}

const KitContext = createContext<KitContextValue | null>(null);

import { useAuth } from "./AuthContext";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

// ─── Provider ─────────────────────────────────────────────────────────────────
export function KitProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(kitReducer, initialState);
  const { token } = useAuth();
  const [isInitializing, setIsInitializing] = React.useState(true);

  // Load from DB on mount
  React.useEffect(() => {
    async function loadKit() {
      if (!token) {
        setIsInitializing(false);
        return;
      }
      try {
        const res = await fetch(`${API_BASE}/api/kits`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          if (data.kits && data.kits.length > 0) {
            dispatch({ type: "GENERATION_SUCCESS", payload: data.kits[0] });
          }
        }
      } catch (e) {
        console.error("Failed to fetch kit", e);
      } finally {
        setIsInitializing(false);
      }
    }
    loadKit();
  }, [token]);

  // Save to DB on change
  React.useEffect(() => {
    if (!token || isInitializing || state.isGenerating) return;
    
    async function saveKit() {
      if (state.kit) {
        try {
          if (state.kit._id) {
            await fetch(`${API_BASE}/api/kits/${state.kit._id}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
              body: JSON.stringify({ kit: state.kit })
            });
          } else {
            const res = await fetch(`${API_BASE}/api/kits`, {
              method: "POST",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
              body: JSON.stringify({ kit: state.kit })
            });
            const data = await res.json();
            if (data.kit && data.kit._id) {
              dispatch({ type: "GENERATION_SUCCESS", payload: data.kit });
            }
          }
        } catch (e) {
          console.error("Failed to sync kit to DB", e);
        }
      } else {
        // If kit was explicitly reset (e.g., deleted)
        // For now, we only load the latest kit, so resetting just clears local state.
        // A true delete would call DELETE /api/kits/:id
      }
    }
    
    // Simple debounce to avoid spamming the DB on every keystroke
    const timeoutId = setTimeout(saveKit, 1000);
    return () => clearTimeout(timeoutId);
  }, [state.kit, token, isInitializing, state.isGenerating]);

  const generateKit = useCallback(async (jd: string, companyUrl: string, days: number) => {
    dispatch({ type: "GENERATION_START" });
    try {
      dispatch({ type: "GENERATION_STEP", payload: "🔍 Crawling company website..." });
      const res = await fetch(`${API_BASE}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token && { Authorization: `Bearer ${token}` }) },
        body: JSON.stringify({ jd, company_url: companyUrl, days_available: days }),
      });
      dispatch({ type: "GENERATION_STEP", payload: "🧠 Extracting requirements..." });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Generation failed");
      }

      dispatch({ type: "GENERATION_STEP", payload: "✅ Building your kit..." });
      const data = await res.json();
      dispatch({ type: "GENERATION_SUCCESS", payload: data.kit });
    } catch (e: unknown) {
      dispatch({ type: "GENERATION_ERROR", payload: (e as Error).message });
    }
  }, []);

  const regenerateCategory = useCallback(async (category: QuestionCategory) => {
    if (!state.kit) return;
    try {
      const requirements = state.kit.role.requirements;
      const res = await fetch(`${API_BASE}/api/regenerate-category`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requirements, category }),
      });
      if (!res.ok) throw new Error("Regeneration failed");
      const data = await res.json();
      dispatch({ type: "REGENERATE_CATEGORY_SUCCESS", payload: { category, newQuestions: data.questions } });
    } catch (e: unknown) {
      dispatch({ type: "GENERATION_ERROR", payload: (e as Error).message });
    }
  }, [state.kit]);

  return (
    <KitContext.Provider value={{ state, dispatch, generateKit, regenerateCategory }}>
      {children}
    </KitContext.Provider>
  );
}

export function useKit() {
  const ctx = useContext(KitContext);
  if (!ctx) throw new Error("useKit must be used within KitProvider");
  return ctx;
}
