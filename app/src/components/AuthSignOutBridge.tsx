"use client";

import { useEffect } from "react";
import { useReadingNook } from "@/lib/app-state";
import { useRegisterSignOutSideEffect } from "@/components/SupabaseAuthProvider";

/** Clears local library cache before Supabase sign-out runs. */
export function AuthSignOutBridge() {
  const { actions } = useReadingNook();
  const registerSignOutSideEffect = useRegisterSignOutSideEffect();

  useEffect(() => {
    registerSignOutSideEffect(async () => {
      actions.resetSession();
    });
  }, [actions, registerSignOutSideEffect]);

  return null;
}
