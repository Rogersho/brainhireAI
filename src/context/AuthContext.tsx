"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { apiFetch, setStoredToken } from "@/lib/api";

export type UserRole = "Recruiter" | "Candidate";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

type AuthStatus = "loading" | "authenticated" | "unauthenticated";

interface AuthContextValue {
  user: AuthUser | null;
  status: AuthStatus;
  login: (email: string, password: string) => Promise<AuthUser>;
  register: (payload: { name: string; email: string; password: string; role: UserRole }) => Promise<AuthUser>;
  logout: (redirectTo?: string) => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");

  const refreshUser = useCallback(async () => {
    try {
      const res = await apiFetch<{ success: boolean; user: AuthUser }>("/auth/me");
      if (res?.success && res.user) {
        setUser(res.user);
        setStatus("authenticated");
      } else {
        setUser(null);
        setStatus("unauthenticated");
      }
    } catch {
      setUser(null);
      setStatus("unauthenticated");
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const login = useCallback(async (email: string, password: string): Promise<AuthUser> => {
    const res = await apiFetch<{ success: boolean; user: AuthUser; token?: string }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    if (res.token) setStoredToken(res.token);
    setUser(res.user);
    setStatus("authenticated");
    return res.user;
  }, []);

  const register = useCallback(
    async (payload: { name: string; email: string; password: string; role: UserRole }): Promise<AuthUser> => {
      const res = await apiFetch<{ success: boolean; user: AuthUser; token?: string }>("/auth/register", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      if (res.token) setStoredToken(res.token);
      setUser(res.user);
      setStatus("authenticated");
      return res.user;
    },
    []
  );

  const logout = useCallback(async (redirectTo = "/") => {
    try {
      await apiFetch("/auth/logout", { method: "POST" });
    } catch {
      // Ignore network errors during logout
    } finally {
      setStoredToken(null);
      setUser(null);
      setStatus("unauthenticated");
      if (typeof window !== "undefined") {
        window.location.href = redirectTo;
      }
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, status, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
