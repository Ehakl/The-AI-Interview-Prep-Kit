"use client";
import React, { createContext, useContext, useState, useEffect } from "react";

import { apiFetch } from "../utils/apiFetch";

type User = { id: string; email: string };

type AuthState = {
  user: User | null;
  isLoading: boolean;
};

type AuthContextType = AuthState & {
  login: (user: User) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    isLoading: true,
  });

  useEffect(() => {
    async function checkAuth() {
      try {
        const data = await apiFetch("/auth/me");
        setState({ user: data.user, isLoading: false });
      } catch (err) {
        setState({ user: null, isLoading: false });
      }
    }
    checkAuth();
  }, []);

  const login = (user: User) => {
    setState({ user, isLoading: false });
  };

  const logout = async () => {
    try {
      await apiFetch("/auth/logout", { method: "POST" });
    } catch(e) {
      // ignore
    }
    setState({ user: null, isLoading: false });
  };

  return (
    <AuthContext.Provider value={{ ...state, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
}
