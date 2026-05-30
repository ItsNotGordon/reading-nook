"use client";

import { useEffect } from "react";
import { useReadingNook } from "@/lib/app-state";
import {
  LIGHT_UI_TOKENS,
  PROFILE_THEMES,
  applyUiTokensToElement,
  isDarkProfileTheme,
  normalizeProfileTheme,
} from "@/lib/profileTheme";

const THEME_COLOR_META = 'meta[name="theme-color"]';

/** Syncs profile theme to document CSS tokens (whole-app palette + bottom nav). */
export function ProfileThemeApplier() {
  const { state } = useReadingNook();
  const theme = normalizeProfileTheme(state.profile.theme);
  const config = PROFILE_THEMES[theme] ?? PROFILE_THEMES.matcha;
  const nav = config.nav;
  const dark = isDarkProfileTheme(theme);
  const uiTokens = config.uiTokens ?? LIGHT_UI_TOKENS;

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.profileTheme = theme;
    root.dataset.profileMode = dark ? "dark" : "light";

    applyUiTokensToElement(root, uiTokens);

    root.style.setProperty("--nav-accent", nav.accent);
    root.style.setProperty("--nav-accent-soft", nav.accentSoft);
    root.style.setProperty("--nav-border", nav.border);
    root.style.setProperty("--nav-bar-bg", nav.barBg);
    root.style.setProperty("--nav-active-shadow", nav.activeShadow);

    const themeColor = dark ? nav.barBg : uiTokens.background;
    const meta = document.querySelector(THEME_COLOR_META);
    if (meta) meta.setAttribute("content", themeColor);
  }, [
    theme,
    dark,
    uiTokens,
    nav.accent,
    nav.accentSoft,
    nav.border,
    nav.barBg,
    nav.activeShadow,
  ]);

  return null;
}
