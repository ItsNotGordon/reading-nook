"use client";

import { useState } from "react";
import { resolveInviteCode, joinClub } from "@/lib/clubClient";

type JoinClubSheetProps = {
  open: boolean;
  onClose: () => void;
  onJoined: () => void;
};

export function JoinClubSheet({ open, onClose, onJoined }: JoinClubSheetProps) {
  const [code, setCode] = useState("");
  const [status, setStatus] = useState<"idle" | "resolving" | "found" | "joining" | "error">("idle");
  const [resolved, setResolved] = useState<{ clubId: string; name: string; memberCount: number } | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  async function handleLookup() {
    const c = code.trim();
    if (!c) return;
    setStatus("resolving");
    setErrorMsg("");
    const result = await resolveInviteCode(c);
    if (!result) {
      setStatus("error");
      setErrorMsg("Invalid invite code. Please check and try again.");
      return;
    }
    setResolved(result);
    setStatus("found");
  }

  async function handleJoin() {
    if (!resolved) return;
    setStatus("joining");
    const ok = await joinClub(resolved.clubId, code.trim());
    if (ok) {
      setCode("");
      setResolved(null);
      setStatus("idle");
      onJoined();
      onClose();
    } else {
      setStatus("error");
      setErrorMsg("Failed to join club.");
    }
  }

  function handleClose() {
    setCode("");
    setResolved(null);
    setStatus("idle");
    setErrorMsg("");
    onClose();
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={handleClose} />
      <div className="relative z-10 w-full max-w-sm rounded-2xl border border-border bg-card-surface p-4 shadow-xl">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">Join a Club</h3>
          <button
            onClick={handleClose}
            className="flex h-6 w-6 items-center justify-center rounded-full text-foreground-muted hover:bg-accent-soft/20"
            aria-label="Close"
          >
            &times;
          </button>
        </div>

        <div className="mt-3">
          <label className="text-xs font-medium text-foreground-muted">Invite Code</label>
          <div className="mt-1 flex gap-2">
            <input
              type="text"
              value={code}
              onChange={(e) => {
                setCode(e.target.value);
                if (status !== "idle") {
                  setStatus("idle");
                  setResolved(null);
                  setErrorMsg("");
                }
              }}
              placeholder="e.g. a1b2c3d4"
              className="flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-foreground-muted/60 focus:outline-none focus:ring-1 focus:ring-accent"
            />
            {status !== "found" ? (
              <button
                onClick={handleLookup}
                disabled={!code.trim() || status === "resolving"}
                className="rounded-xl border border-accent bg-accent px-4 py-2 text-xs font-semibold text-white shadow-sm disabled:opacity-50"
              >
                {status === "resolving" ? "..." : "Look up"}
              </button>
            ) : null}
          </div>
        </div>

        {errorMsg ? (
          <p className="mt-2 text-xs text-red-500">{errorMsg}</p>
        ) : null}

        {status === "found" && resolved ? (
          <div className="mt-3 rounded-xl border border-border bg-accent-soft/10 p-3">
            <p className="text-sm font-semibold text-foreground">{resolved.name}</p>
            <p className="mt-0.5 text-xs text-foreground-muted">
              {resolved.memberCount} member{resolved.memberCount !== 1 ? "s" : ""}
            </p>
            <button
              onClick={handleJoin}
              disabled={status === "joining"}
              className="mt-3 w-full rounded-xl border border-accent bg-accent py-2 text-sm font-semibold text-white shadow-sm disabled:opacity-50"
            >
              {status === "joining" ? "Joining..." : "Join Club"}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
