"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { User } from "@supabase/supabase-js";
import { clearRequiresReauth } from "@/lib/authSession";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";

type SignOutSideEffect = () => void | Promise<void>;

const SignOutSideEffectContext = createContext<
  ((effect: SignOutSideEffect | null) => void) | null
>(null);

type SupabaseAuthContextValue = {
  configured: boolean;
  loading: boolean;
  user: User | null;
  shareShelves: boolean;
  signInWithEmail: (
    email: string,
    redirectPath?: string,
  ) => Promise<{ ok: boolean; message: string }>;
  signInWithGoogle: (redirectPath?: string) => Promise<{ ok: boolean; message: string }>;
  signOut: () => Promise<void>;
  setShareShelves: (value: boolean) => Promise<void>;
  refreshShareShelves: () => Promise<void>; // re-fetch for current user
};

const SupabaseAuthContext = createContext<SupabaseAuthContextValue | null>(null);

export function useRegisterSignOutSideEffect(): (effect: SignOutSideEffect | null) => void {
  const register = useContext(SignOutSideEffectContext);
  if (!register) {
    throw new Error("useRegisterSignOutSideEffect must be used within SupabaseAuthProvider");
  }
  return register;
}

export function SupabaseAuthProvider({ children }: { children: ReactNode }) {
  const configured = isSupabaseConfigured();
  const [loading, setLoading] = useState(configured);
  const [user, setUser] = useState<User | null>(null);
  const [shareShelves, setShareShelvesState] = useState(false);
  const signOutSideEffectRef = useRef<SignOutSideEffect | null>(null);

  const registerSignOutSideEffect = useCallback((effect: SignOutSideEffect | null) => {
    signOutSideEffectRef.current = effect;
  }, []);

  const refreshShareShelves = useCallback(async (nextUser: User | null) => {
    if (!nextUser) {
      setShareShelvesState(false);
      return;
    }
    try {
      const res = await fetch("/api/profile/share");
      if (!res.ok) return;
      const data = (await res.json()) as { shareShelves?: boolean };
      setShareShelvesState(Boolean(data.shareShelves));
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (!configured) {
      queueMicrotask(() => setLoading(false));
      return;
    }
    const client = createSupabaseBrowserClient();
    client.auth.getSession().then(({ data }) => {
      const sessionUser = data.session?.user ?? null;
      if (sessionUser) clearRequiresReauth();
      setUser(sessionUser);
      setLoading(false);
      void refreshShareShelves(sessionUser);
    });
    const { data: sub } = client.auth.onAuthStateChange((_event, session) => {
      const sessionUser = session?.user ?? null;
      if (sessionUser) clearRequiresReauth();
      setUser(sessionUser);
      setLoading(false);
      void refreshShareShelves(sessionUser);
    });
    return () => sub.subscription.unsubscribe();
  }, [configured, refreshShareShelves]);

  const signInWithEmail = useCallback(
    async (email: string, redirectPath = "/profile") => {
      if (!configured) {
        return { ok: false, message: "Cloud sign-in is not configured on this deployment." };
      }
      const trimmed = email.trim();
      if (!trimmed.includes("@")) {
        return { ok: false, message: "Enter a valid email address." };
      }
      const safePath = redirectPath.startsWith("/") ? redirectPath : "/profile";
      const client = createSupabaseBrowserClient();
      const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(safePath)}`;
      const { error } = await client.auth.signInWithOtp({
        email: trimmed,
        options: { emailRedirectTo: redirectTo },
      });
      if (error) return { ok: false, message: error.message };
      return {
        ok: true,
        message: "Check your email for a sign-in link.",
      };
    },
    [configured],
  );

  const signInWithGoogle = useCallback(
    async (redirectPath = "/profile") => {
      if (!configured) {
        return { ok: false, message: "Cloud sign-in is not configured on this deployment." };
      }
      const safePath = redirectPath.startsWith("/") && !redirectPath.startsWith("//")
        ? redirectPath
        : "/profile";
      const client = createSupabaseBrowserClient();
      const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(safePath)}`;
      const { error } = await client.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo },
      });
      if (error) return { ok: false, message: error.message };
      return { ok: true, message: "" };
    },
    [configured],
  );

  const signOut = useCallback(async () => {
    if (!configured) return;
    if (signOutSideEffectRef.current) {
      await signOutSideEffectRef.current();
    }
    const client = createSupabaseBrowserClient();
    await client.auth.signOut();
    setUser(null);
    setShareShelvesState(false);
    window.location.href = "/login";
  }, [configured]);

  const setShareShelves = useCallback(
    async (value: boolean) => {
      if (!user) return;
      const res = await fetch("/api/profile/share", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shareShelves: value }),
      });
      if (res.ok) setShareShelvesState(value);
    },
    [user],
  );

  const value = useMemo(
    () => ({
      configured,
      loading,
      user,
      shareShelves,
      signInWithEmail,
      signInWithGoogle,
      signOut,
      setShareShelves,
      refreshShareShelves: () => refreshShareShelves(user),
    }),
    [
      configured,
      loading,
      user,
      shareShelves,
      signInWithEmail,
      signInWithGoogle,
      signOut,
      setShareShelves,
      refreshShareShelves,
    ],
  );

  return (
    <SignOutSideEffectContext.Provider value={registerSignOutSideEffect}>
      <SupabaseAuthContext.Provider value={value}>{children}</SupabaseAuthContext.Provider>
    </SignOutSideEffectContext.Provider>
  );
}

export function useSupabaseAuth(): SupabaseAuthContextValue {
  const ctx = useContext(SupabaseAuthContext);
  if (!ctx) {
    throw new Error("useSupabaseAuth must be used within SupabaseAuthProvider");
  }
  return ctx;
}
