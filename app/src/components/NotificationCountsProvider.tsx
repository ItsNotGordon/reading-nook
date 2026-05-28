"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useSupabaseAuth } from "@/components/SupabaseAuthProvider";
import { fetchNotificationSummary } from "@/lib/notificationClient";

type NotificationCountsContextValue = {
  friends: number;
  clubs: number;
  refresh: () => void;
};

const NotificationCountsContext = createContext<NotificationCountsContextValue | null>(null);

const POLL_MS = 45_000;

export function NotificationCountsProvider({ children }: { children: ReactNode }) {
  const { user, configured } = useSupabaseAuth();
  const [friends, setFriends] = useState(0);
  const [clubs, setClubs] = useState(0);

  const refresh = useCallback(() => {
    if (!user || !configured) {
      setFriends(0);
      setClubs(0);
      return;
    }
    void fetchNotificationSummary().then(({ friends: f, clubs: c }) => {
      setFriends(f);
      setClubs(c);
    });
  }, [user, configured]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!user || !configured) return;

    const interval = window.setInterval(refresh, POLL_MS);
    const onFocus = () => refresh();
    window.addEventListener("focus", onFocus);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, [user, configured, refresh]);

  const value = useMemo(
    () => ({ friends, clubs, refresh }),
    [friends, clubs, refresh],
  );

  return (
    <NotificationCountsContext.Provider value={value}>
      {children}
    </NotificationCountsContext.Provider>
  );
}

export function useNotificationCounts(): NotificationCountsContextValue {
  const ctx = useContext(NotificationCountsContext);
  if (!ctx) {
    return { friends: 0, clubs: 0, refresh: () => {} };
  }
  return ctx;
}
