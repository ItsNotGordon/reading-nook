"use client";

import { useEffect } from "react";
import { useReadingNook } from "@/lib/app-state";
import { PROFILE_THEMES } from "@/lib/profileTheme";

/** Syncs profile background theme to document for bottom nav styling. */
export function ProfileThemeApplier() {
  const { state } = useReadingNook();
  const theme = state.profile.theme ?? "plant";
  const nav = PROFILE_THEMES[theme]?.nav ?? PROFILE_THEMES.plant.nav;

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.profileTheme = theme;
    root.style.setProperty("--nav-accent", nav.accent);
    root.style.setProperty("--nav-accent-soft", nav.accentSoft);
    root.style.setProperty("--nav-border", nav.border);
    root.style.setProperty("--nav-bar-bg", nav.barBg);
    root.style.setProperty("--nav-active-shadow", nav.activeShadow);
  }, [theme, nav.accent, nav.accentSoft, nav.border, nav.barBg, nav.activeShadow]);

  return null;
}
