"use client";
import React, { createContext, useContext, useState, useEffect } from "react";

type User = { id: string; email: string };

type AuthState = {
  user: User | null;
  token: string | null;
  isLoading: boolean;
};

type AuthContextType = AuthState & {
  login: (token: string, user: User) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    token: null,
    isLoading: true,
  });

  useEffect(() => {
    const token = localStorage.getItem("trao_token");
    const userStr = localStorage.getItem("trao_user");
    if (token && userStr) {
      try {
        setState({ user: JSON.parse(userStr), token, isLoading: false });
      } catch (e) {
        setState({ user: null, token: null, isLoading: false });
      }
    } else {
      setState({ user: null, token: null, isLoading: false });
    }
  }, []);

  const login = (token: string, user: User) => {
    localStorage.setItem("trao_token", token);
    localStorage.setItem("trao_user", JSON.stringify(user));
    setState({ user, token, isLoading: false });
  };

  const logout = () => {
    localStorage.removeItem("trao_token");
    localStorage.removeItem("trao_user");
    setState({ user: null, token: null, isLoading: false });
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
