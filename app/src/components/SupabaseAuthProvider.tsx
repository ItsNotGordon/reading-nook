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
  signInWithGoogle: (redirectPath?: string) => Promise<{ ok: boolean; message: string }>;
  signOut: () => Promise<void>;
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
  const signOutSideEffectRef = useRef<SignOutSideEffect | null>(null);

  const registerSignOutSideEffect = useCallback((effect: SignOutSideEffect | null) => {
    signOutSideEffectRef.current = effect;
  }, []);

  useEffect(() => {
    if (!configured) {
      queueMicrotask(() => setLoading(false));
      return;
    }
    const client = createSupabaseBrowserClient();
    client.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setLoading(false);
    });
    const { data: sub } = client.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, [configured]);

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
    window.location.href = "/login";
  }, [configured]);

  const value = useMemo(
    () => ({
      configured,
      loading,
      user,
      signInWithGoogle,
      signOut,
    }),
    [configured, loading, user, signInWithGoogle, signOut],
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
