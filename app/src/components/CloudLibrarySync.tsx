"use client";

import { useEffect, useRef } from "react";
import { useReadingNook } from "@/lib/app-state";
import { countShelvedBooks } from "@/lib/tasteComparison";
import type { AppState } from "@/lib/types";
import { useSupabaseAuth } from "./SupabaseAuthProvider";

function shelvedCount(state: AppState): number {
  return countShelvedBooks(state);
}

/** Pull cloud library on sign-in; debounced push while signed in. */
export function CloudLibrarySync() {
  const { state, actions } = useReadingNook();
  const { user, configured } = useSupabaseAuth();
  const stateRef = useRef(state);
  const pulledForUser = useRef<string | null>(null);
  const readyToPush = useRef(false);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    if (!configured || !user) {
      pulledForUser.current = null;
      readyToPush.current = false;
      return;
    }
    if (pulledForUser.current === user.id) return;
    pulledForUser.current = user.id;
    readyToPush.current = false;

    void (async () => {
      try {
        const res = await fetch("/api/sync");
        if (!res.ok) {
          readyToPush.current = true;
          return;
        }
        const data = (await res.json()) as { state?: AppState | null };
        const cloud = data.state ?? null;
        const local = stateRef.current;
        const localCount = shelvedCount(local);
        const cloudCount = cloud ? shelvedCount(cloud) : 0;

        if (cloud && cloudCount > 0 && (localCount === 0 || cloudCount >= localCount)) {
          actions.hydrateLibrary(cloud);
        } else if (localCount > 0) {
          await fetch("/api/sync", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ state: local }),
          });
        }
      } catch {
        /* offline */
      } finally {
        readyToPush.current = true;
      }
    })();
  }, [configured, user, actions]);

  useEffect(() => {
    if (!configured || !user || !readyToPush.current) return;
    const timer = window.setTimeout(() => {
      void fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ state }),
      });
    }, 2000);
    return () => window.clearTimeout(timer);
  }, [configured, user, state]);

  return null;
}
