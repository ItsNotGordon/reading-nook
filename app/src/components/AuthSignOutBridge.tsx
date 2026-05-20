"use client";

import { useEffect } from "react";
import { useReadingNook } from "@/lib/app-state";
import { useRegisterSignOutSideEffect } from "@/components/SupabaseAuthProvider";
import { clearLastAuthUserId, setRequiresReauth } from "@/lib/authSession";

/** Clears local library and sets reauth flag before Supabase sign-out runs. */
export function AuthSignOutBridge() {
  const { actions } = useReadingNook();
  const registerSignOutSideEffect = useRegisterSignOutSideEffect();

  useEffect(() => {
    registerSignOutSideEffect(async () => {
      actions.resetLibrary();
      setRequiresReauth();
      clearLastAuthUserId();
    });
  }, [actions, registerSignOutSideEffect]);

  return null;
}
