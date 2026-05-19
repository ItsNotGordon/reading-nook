"use client";

import { useEffect } from "react";
import { useReadingNook } from "@/lib/app-state";

export function ThemeApplier() {
  const { state } = useReadingNook();
  const theme = state.profile.theme ?? "plant";

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  return null;
}
