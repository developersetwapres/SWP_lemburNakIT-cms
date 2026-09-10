"use client";

import { createContext, useContext, useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { createAuthStore, type AuthStore } from "./store";

const AuthContext = createContext<AuthStore | null>(null);
export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [store] = useState(() => createAuthStore(() => queryClient.clear()));
  useEffect(() => { void store.initialize().catch(() => { /* Available through useAuth().error. */ }); }, [store]);
  return <AuthContext.Provider value={store}>{children}</AuthContext.Provider>;
}
export function useAuth() {
  const store = useContext(AuthContext);
  if (!store) throw new Error("useAuth must be used within AuthProvider.");
  const state = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
  return { ...state, login: store.login, challenge: store.challenge, logout: store.logout, refresh: store.refresh };
}
