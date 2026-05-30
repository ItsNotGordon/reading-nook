import type { CSSProperties } from "react";
import type { AppTheme } from "@/lib/types";
import { APP_THEMES } from "@/lib/types";

export type DecorationSlot = {
  id: string;
  src: string;
  className: string;
  width: number;
  height: number;
};

export type ProfileUiTokens = {
  background: string;
  foreground: string;
  foregroundMuted: string;
  border: string;
  cardSurface: string;
  accent: string;
  accentSoft: string;
  navMuted: string;
  secondaryDelight: string;
  onSecondaryDelight: string;
  progressExact: string;
  progressExactTrack: string;
  progressEstimatedBand: string;
  progressEstimated: string;
  progressEstimatedTrack: string;
  progressEstimatedRange: string;
  progressUnread: string;
};

/** Default cozy light palette (matches globals.css :root). */
export const LIGHT_UI_TOKENS: ProfileUiTokens = {
  background: "#fbf9f9",
  foreground: "#1b1c1c",
  foregroundMuted: "#424841",
  border: "#c2c8bf",
  accent: "#426447",
  accentSoft: "#abd0ad",
  navMuted: "#424841",
  secondaryDelight: "#efe0a7",
  onSecondaryDelight: "#6d6235",
  progressExact: "#426447",
  progressExactTrack: "#e9e8e7",
  progressEstimatedBand: "#e8cf6a",
  progressEstimated: "#695e31",
  progressEstimatedTrack: "#efe0a7",
  progressEstimatedRange: "#f2e2aa",
  progressUnread: "#ffffff",
  cardSurface: "#ffffff",
};

/** Reading progress bars keep green/yellow semantics on all profile themes. */
const READING_PROGRESS_TOKENS: Pick<
  ProfileUiTokens,
  | "progressExact"
  | "progressExactTrack"
  | "progressEstimatedBand"
  | "progressEstimated"
  | "progressEstimatedTrack"
  | "progressEstimatedRange"
  | "progressUnread"
> = {
  progressExact: LIGHT_UI_TOKENS.progressExact,
  progressExactTrack: LIGHT_UI_TOKENS.progressExactTrack,
  progressEstimatedBand: LIGHT_UI_TOKENS.progressEstimatedBand,
  progressEstimated: LIGHT_UI_TOKENS.progressEstimated,
  progressEstimatedTrack: LIGHT_UI_TOKENS.progressEstimatedTrack,
  progressEstimatedRange: LIGHT_UI_TOKENS.progressEstimatedRange,
  progressUnread: LIGHT_UI_TOKENS.progressUnread,
};

/** Light theme palette from nav accent colors (buttons, links, chips). */
function lightThemeUiTokens(options: {
  accent: string;
  accentSoft: string;
  border: string;
  background?: string;
  cardSurface?: string;
  foregroundMuted?: string;
  secondaryDelight?: string;
  onSecondaryDelight?: string;
}): ProfileUiTokens {
  const foregroundMuted = options.foregroundMuted ?? LIGHT_UI_TOKENS.foregroundMuted;
  return {
    background: options.background ?? LIGHT_UI_TOKENS.background,
    foreground: LIGHT_UI_TOKENS.foreground,
    foregroundMuted,
    border: options.border,
    cardSurface: options.cardSurface ?? LIGHT_UI_TOKENS.cardSurface,
    accent: options.accent,
    accentSoft: options.accentSoft,
    navMuted: foregroundMuted,
    secondaryDelight: options.secondaryDelight ?? options.accentSoft,
    onSecondaryDelight: options.onSecondaryDelight ?? options.accent,
    ...READING_PROGRESS_TOKENS,
  };
}

const MATCHA_UI_TOKENS = lightThemeUiTokens({
  accent: "#6f8572",
  accentSoft: "#b5c9b8",
  border: "#c0d0c2",
  background: "#f8faf8",
  foregroundMuted: "#4a5c4e",
  secondaryDelight: "#e4ede4",
  onSecondaryDelight: "#4a5c4e",
});

const COFFEE_UI_TOKENS = lightThemeUiTokens({
  accent: "#6f4e37",
  accentSoft: "#c4a88a",
  border: "#c9b8a8",
  background: "#f6f1eb",
  foregroundMuted: "#5c4030",
  secondaryDelight: "#efe6dc",
  onSecondaryDelight: "#5c4030",
});

const GALAXY_UI_TOKENS = lightThemeUiTokens({
  accent: "#6b5b95",
  accentSoft: "#c4b7d9",
  border: "#c5bdd4",
  background: "#f8f6fc",
  foregroundMuted: "#4a3d6b",
  secondaryDelight: "#e8e4f4",
  onSecondaryDelight: "#4a3d6b",
});

const RAINDROPS_UI_TOKENS = lightThemeUiTokens({
  accent: "#4a7fa5",
  accentSoft: "#a8cce0",
  border: "#b4c8d8",
  background: "#f5f9fc",
  foregroundMuted: "#2d5a78",
  secondaryDelight: "#dceaf4",
  onSecondaryDelight: "#2d5a78",
});

const SAKURA_UI_TOKENS = lightThemeUiTokens({
  accent: "#b5577a",
  accentSoft: "#f0c6d6",
  border: "#dbbfcc",
  background: "#fcf7f9",
  foregroundMuted: "#7a3d52",
  secondaryDelight: "#fae8ef",
  onSecondaryDelight: "#7a3d52",
});

const VINYL_UI_TOKENS = lightThemeUiTokens({
  accent: "#c0392b",
  accentSoft: "#e8a8a0",
  border: "#d4aeae",
  background: "#fcf7f6",
  foregroundMuted: "#8b2e22",
  secondaryDelight: "#f5e0dc",
  onSecondaryDelight: "#8b2e22",
});

const KINTSUGI_UI_TOKENS: ProfileUiTokens = {
  background: "#121318",
  foreground: "#e8eaef",
  foregroundMuted: "#9aa8bc",
  border: "#2a3550",
  cardSurface: "#1c2230",
  accent: "#c9a248",
  accentSoft: "#2a3d58",
  navMuted: "#b8c4d8",
  secondaryDelight: "#3d4f68",
  onSecondaryDelight: "#d4bc82",
  ...READING_PROGRESS_TOKENS,
};

const OBSERVATORY_UI_TOKENS: ProfileUiTokens = {
  background: "#161618",
  foreground: "#ebe8e4",
  foregroundMuted: "#a39e96",
  border: "#3d3830",
  cardSurface: "#222228",
  accent: "#c4894a",
  accentSoft: "#3a3428",
  navMuted: "#c4b8a8",
  secondaryDelight: "#4a4034",
  onSecondaryDelight: "#e8c878",
  ...READING_PROGRESS_TOKENS,
};

const GARDEN_UI_TOKENS: ProfileUiTokens = {
  background: "#0f1612",
  foreground: "#e2e8e4",
  foregroundMuted: "#9aab9e",
  border: "#3a4840",
  cardSurface: "#1a2420",
  accent: "#c4b878",
  accentSoft: "#2a3830",
  navMuted: "#c8d0cc",
  secondaryDelight: "#2e3a34",
  onSecondaryDelight: "#c4b878",
  ...READING_PROGRESS_TOKENS,
};

const CATS_UI_TOKENS: ProfileUiTokens = {
  background: "#121016",
  foreground: "#ebe6df",
  foregroundMuted: "#949098",
  border: "#3d3548",
  cardSurface: "#1c1822",
  accent: "#e8953a",
  accentSoft: "#352e42",
  navMuted: "#a8a4ae",
  secondaryDelight: "#383640",
  onSecondaryDelight: "#ebe6df",
  ...READING_PROGRESS_TOKENS,
};

const SUNROOM_UI_TOKENS: ProfileUiTokens = {
  background: "#fdf8ee",
  foreground: "#3a3428",
  foregroundMuted: "#6d6558",
  border: "#e8dcb8",
  cardSurface: "#fffcf5",
  accent: "#c9941a",
  accentSoft: "#f5e6b8",
  navMuted: "#6d6558",
  secondaryDelight: "#faf0d4",
  onSecondaryDelight: "#6d5530",
  ...READING_PROGRESS_TOKENS,
};

const CITRUS_UI_TOKENS: ProfileUiTokens = {
  background: "#fff8f2",
  foreground: "#3a2418",
  foregroundMuted: "#6b5248",
  border: "#f0c0a0",
  cardSurface: "#fffcf9",
  accent: "#ea580c",
  accentSoft: "#fec89a",
  navMuted: "#6b5248",
  secondaryDelight: "#ffe8d6",
  onSecondaryDelight: "#7c3a12",
  ...READING_PROGRESS_TOKENS,
};

const UI_TOKEN_CSS_VARS: Record<keyof ProfileUiTokens, string> = {
  background: "--background",
  foreground: "--foreground",
  foregroundMuted: "--foreground-muted",
  border: "--border",
  cardSurface: "--card-surface",
  accent: "--accent",
  accentSoft: "--accent-soft",
  navMuted: "--nav-muted",
  secondaryDelight: "--secondary-delight",
  onSecondaryDelight: "--on-secondary-delight",
  progressExact: "--progress-exact",
  progressExactTrack: "--progress-exact-track",
  progressEstimatedBand: "--progress-estimated-band",
  progressEstimated: "--progress-estimated",
  progressEstimatedTrack: "--progress-estimated-track",
  progressEstimatedRange: "--progress-estimated-range",
  progressUnread: "--progress-unread",
};

export function applyUiTokensToElement(el: HTMLElement, tokens: ProfileUiTokens): void {
  for (const key of Object.keys(UI_TOKEN_CSS_VARS) as (keyof ProfileUiTokens)[]) {
    el.style.setProperty(UI_TOKEN_CSS_VARS[key], tokens[key]);
  }
}

export type ProfileThemeConfig = {
  gradient: string;
  slots: DecorationSlot[];
  nav: {
    accent: string;
    accentSoft: string;
    border: string;
    barBg: string;
    activeShadow: string;
  };
  previewSrc: string;
  /** Solid base behind gradient overlays (dark profile themes). */
  pageBackground?: string;
  /** Decoration layer opacity; defaults to 0.32. */
  slotOpacity?: number;
  /** Whole-app dark palette when this theme is selected. */
  darkProfile?: boolean;
  uiTokens?: ProfileUiTokens;
};

export const DARK_PROFILE_THEMES = new Set<AppTheme>(["kintsugi", "observatory", "garden", "cats"]);

export function isDarkProfileTheme(theme: AppTheme): boolean {
  return DARK_PROFILE_THEMES.has(theme);
}

export const THEME_DISPLAY_NAMES: Record<AppTheme, string> = {
  matcha: "Matcha",
  coffee: "Coffee",
  sunroom: "Sunroom",
  citrus: "Citrus",
  galaxy: "Galaxy",
  raindrops: "Raindrops",
  sakura: "Sakura",
  vinyl: "Vinyl",
  kintsugi: "Kintsugi",
  garden: "Garden",
  observatory: "Observatory",
  cats: "Cats",
};

const DEFAULT_THEME: AppTheme = "matcha";

/** Legacy `plant` and unknown values resolve to a valid picker theme. */
export function normalizeProfileTheme(theme: string | null | undefined): AppTheme {
  if (theme === "plant") return "garden";
  if (theme && (APP_THEMES as string[]).includes(theme)) return theme as AppTheme;
  return DEFAULT_THEME;
}

function placeholderTheme(
  previewSrc: string,
  gradient: string,
  nav: ProfileThemeConfig["nav"],
): ProfileThemeConfig {
  return { gradient, previewSrc, nav, slots: [] };
}

const GARDEN_SLOTS: DecorationSlot[] = [
  {
    id: "monstera-tl",
    src: "/decorations/garden/monstera-deliciosa.png",
    className: "absolute -left-14 top-0 h-32 w-32 -rotate-[18deg]",
    width: 128,
    height: 128,
  },
  {
    id: "moon-tr",
    src: "/decorations/garden/half-moon.png",
    className: "absolute -right-10 top-4 h-28 w-28 rotate-[8deg] opacity-25",
    width: 112,
    height: 112,
  },
  {
    id: "succulent-tr",
    src: "/decorations/garden/succulent.png",
    className: "absolute -right-16 top-24 h-40 w-40 rotate-[20deg]",
    width: 160,
    height: 160,
  },
  {
    id: "alocasia-bl",
    src: "/decorations/garden/alocasia.png",
    className: "absolute -left-16 bottom-8 h-44 w-44 rotate-[10deg]",
    width: 176,
    height: 176,
  },
  {
    id: "lights-br",
    src: "/decorations/garden/decorate.png",
    className: "absolute -right-8 bottom-12 h-32 w-32 -rotate-[6deg] opacity-25",
    width: 128,
    height: 128,
  },
  {
    id: "monstera-br",
    src: "/decorations/garden/monstera-deliciosa.png",
    className: "absolute -right-10 bottom-16 h-28 w-28 -rotate-[24deg]",
    width: 112,
    height: 112,
  },
  {
    id: "succulent-mid",
    src: "/decorations/garden/succulent.png",
    className: "absolute left-1/3 top-40 h-24 w-24 rotate-[-8deg] opacity-20",
    width: 96,
    height: 96,
  },
];

const SUNROOM_SLOTS: DecorationSlot[] = [
  {
    id: "sun-tl",
    src: "/decorations/sunroom/sun.png",
    className: "absolute -left-10 top-0 h-32 w-32 -rotate-[8deg]",
    width: 128,
    height: 128,
  },
  {
    id: "sunflower-tr",
    src: "/decorations/sunroom/sunflower.png",
    className: "absolute -right-12 top-16 h-40 w-40 rotate-[10deg]",
    width: 160,
    height: 160,
  },
  {
    id: "couch-bl",
    src: "/decorations/sunroom/couch.png",
    className: "absolute -left-14 bottom-8 h-36 w-36 rotate-[4deg]",
    width: 144,
    height: 144,
  },
  {
    id: "honey-br",
    src: "/decorations/sunroom/honey.png",
    className: "absolute -right-10 bottom-12 h-32 w-32 -rotate-[6deg]",
    width: 128,
    height: 128,
  },
  {
    id: "sun-mid",
    src: "/decorations/sunroom/sun-alt.png",
    className: "absolute left-1/3 top-36 h-24 w-24 rotate-[-12deg] opacity-20",
    width: 96,
    height: 96,
  },
];

const CITRUS_SLOTS: DecorationSlot[] = [
  {
    id: "orange-tl",
    src: "/decorations/citrus/orange.png",
    className: "absolute -left-12 top-2 h-36 w-36 -rotate-[10deg]",
    width: 144,
    height: 144,
  },
  {
    id: "orchard-tr",
    src: "/decorations/citrus/fruit-tree.png",
    className: "absolute -right-14 top-20 h-40 w-40 rotate-[8deg]",
    width: 160,
    height: 160,
  },
  {
    id: "lemon-bl",
    src: "/decorations/citrus/lemon.png",
    className: "absolute -left-10 bottom-10 h-32 w-32 rotate-[6deg]",
    width: 128,
    height: 128,
  },
  {
    id: "juice-br",
    src: "/decorations/citrus/orange-juice.png",
    className: "absolute -right-8 bottom-14 h-32 w-32 -rotate-[8deg]",
    width: 128,
    height: 128,
  },
  {
    id: "orange-mid",
    src: "/decorations/citrus/orange-alt.png",
    className: "absolute left-1/3 top-40 h-24 w-24 rotate-[-10deg] opacity-20",
    width: 96,
    height: 96,
  },
];

const CATS_SLOTS: DecorationSlot[] = [
  {
    id: "black-cat-tl",
    src: "/decorations/cats/black-cat.png",
    className: "absolute -left-12 top-2 h-36 w-36 -rotate-[6deg]",
    width: 144,
    height: 144,
  },
  {
    id: "moon-tr",
    src: "/decorations/cats/moon.png",
    className: "absolute -right-8 top-2 h-28 w-28 rotate-[4deg] opacity-25",
    width: 112,
    height: 112,
  },
  {
    id: "exotic-tr",
    src: "/decorations/cats/exotic-shorthair.png",
    className: "absolute -right-14 top-28 h-40 w-40 rotate-[12deg]",
    width: 160,
    height: 160,
  },
  {
    id: "cat-variant-bl",
    src: "/decorations/cats/cat-variant.png",
    className: "absolute -left-14 bottom-10 h-40 w-40 rotate-[8deg]",
    width: 160,
    height: 160,
  },
  {
    id: "cat-br",
    src: "/decorations/cats/cat.png",
    className: "absolute -right-10 bottom-12 h-32 w-32 -rotate-[10deg]",
    width: 128,
    height: 128,
  },
  {
    id: "exotic-mid",
    src: "/decorations/cats/exotic-shorthair.png",
    className: "absolute left-1/3 top-44 h-24 w-24 rotate-[-8deg] opacity-20",
    width: 96,
    height: 96,
  },
];

export const PROFILE_THEMES: Record<AppTheme, ProfileThemeConfig> = {
  matcha: {
    uiTokens: MATCHA_UI_TOKENS,
    gradient:
      "radial-gradient(circle at 82% 12%, rgba(197, 212, 195, 0.32), transparent 36%), radial-gradient(circle at 15% 55%, rgba(168, 188, 170, 0.22), transparent 42%)",
    previewSrc: "/decorations/matcha/matcha-tea.png",
    nav: {
      accent: "#6f8572",
      accentSoft: "#b5c9b8",
      border: "#c0d0c2",
      barBg: "rgba(251, 249, 249, 0.92)",
      activeShadow: "0 8px 20px -6px rgba(111, 133, 114, 0.35)",
    },
    slots: [
      {
        id: "tea-tl",
        src: "/decorations/matcha/matcha-tea.png",
        className: "absolute -left-12 top-2 h-36 w-36 -rotate-[12deg]",
        width: 144,
        height: 144,
      },
      {
        id: "latte-tr",
        src: "/decorations/matcha/matcha-latte.png",
        className: "absolute -right-14 top-28 h-36 w-36 rotate-[14deg]",
        width: 144,
        height: 144,
      },
      {
        id: "tea-bl",
        src: "/decorations/matcha/matcha-tea.png",
        className: "absolute -left-10 bottom-12 h-28 w-28 rotate-[6deg]",
        width: 112,
        height: 112,
      },
      {
        id: "latte-br",
        src: "/decorations/matcha/matcha-latte.png",
        className: "absolute -right-8 bottom-20 h-32 w-32 -rotate-[10deg]",
        width: 128,
        height: 128,
      },
    ],
  },
  coffee: {
    uiTokens: COFFEE_UI_TOKENS,
    gradient:
      "radial-gradient(circle at 82% 12%, rgba(120, 88, 62, 0.24), transparent 36%), radial-gradient(circle at 15% 55%, rgba(92, 68, 48, 0.2), transparent 42%)",
    previewSrc: "/decorations/coffee/coffee-cup.png",
    nav: {
      accent: "#6f4e37",
      accentSoft: "#c4a88a",
      border: "#c9b8a8",
      barBg: "rgba(246, 241, 235, 0.94)",
      activeShadow: "0 8px 20px -6px rgba(92, 68, 48, 0.38)",
    },
    slots: [
      {
        id: "cup-tl",
        src: "/decorations/coffee/coffee-cup.png",
        className: "absolute -left-12 top-0 h-32 w-32 -rotate-[10deg]",
        width: 128,
        height: 128,
      },
      {
        id: "latte-bl",
        src: "/decorations/coffee/latte-art.png",
        className: "absolute -left-14 bottom-10 h-40 w-40 rotate-[8deg]",
        width: 160,
        height: 160,
      },
      {
        id: "cup-tr",
        src: "/decorations/coffee/coffee-cup.png",
        className: "absolute -right-12 top-20 h-28 w-28 rotate-[16deg]",
        width: 120,
        height: 120,
      },
      {
        id: "latte-mr",
        src: "/decorations/coffee/latte-art.png",
        className: "absolute -right-14 top-44 h-28 w-28 -rotate-[6deg]",
        width: 112,
        height: 112,
      },
    ],
  },
  sunroom: {
    uiTokens: SUNROOM_UI_TOKENS,
    gradient:
      "radial-gradient(circle at 82% 12%, rgba(255, 214, 102, 0.34), transparent 36%), radial-gradient(circle at 15% 55%, rgba(250, 200, 80, 0.22), transparent 42%), radial-gradient(circle at 48% 92%, rgba(255, 235, 180, 0.16), transparent 46%)",
    previewSrc: "/decorations/sunroom/sun.png",
    nav: {
      accent: "#c9941a",
      accentSoft: "#f5e6b8",
      border: "#e8dcb8",
      barBg: "rgba(253, 248, 238, 0.94)",
      activeShadow: "0 8px 20px -6px rgba(201, 148, 26, 0.35)",
    },
    slots: SUNROOM_SLOTS,
  },
  citrus: {
    uiTokens: CITRUS_UI_TOKENS,
    gradient:
      "radial-gradient(circle at 82% 12%, rgba(249, 115, 22, 0.34), transparent 36%), radial-gradient(circle at 15% 55%, rgba(234, 88, 12, 0.24), transparent 42%), radial-gradient(circle at 48% 92%, rgba(255, 180, 120, 0.18), transparent 46%)",
    previewSrc: "/decorations/citrus/orange.png",
    nav: {
      accent: "#ea580c",
      accentSoft: "#fec89a",
      border: "#f0c0a0",
      barBg: "rgba(255, 248, 242, 0.94)",
      activeShadow: "0 8px 20px -6px rgba(234, 88, 12, 0.38)",
    },
    slots: CITRUS_SLOTS,
  },
  galaxy: {
    uiTokens: GALAXY_UI_TOKENS,
    gradient:
      "radial-gradient(circle at 82% 12%, rgba(107, 91, 149, 0.24), transparent 36%), radial-gradient(circle at 15% 55%, rgba(88, 72, 132, 0.2), transparent 42%)",
    previewSrc: "/decorations/galaxy/galaxy.png",
    nav: {
      accent: "#6b5b95",
      accentSoft: "#c4b7d9",
      border: "#c5bdd4",
      barBg: "rgba(248, 246, 252, 0.93)",
      activeShadow: "0 8px 20px -6px rgba(107, 91, 149, 0.4)",
    },
    slots: [
      {
        id: "galaxy-tl",
        src: "/decorations/galaxy/galaxy.png",
        className: "absolute -left-14 top-0 h-36 w-36 -rotate-[14deg]",
        width: 144,
        height: 144,
      },
      {
        id: "saturn-tr",
        src: "/decorations/galaxy/saturn.png",
        className: "absolute -right-12 top-20 h-36 w-36 rotate-[16deg]",
        width: 144,
        height: 144,
      },
      {
        id: "constellation-bl",
        src: "/decorations/galaxy/constellation.png",
        className: "absolute -left-10 bottom-12 h-32 w-32 rotate-[8deg]",
        width: 128,
        height: 128,
      },
      {
        id: "star-br",
        src: "/decorations/galaxy/falling-star.png",
        className: "absolute -right-8 bottom-16 h-28 w-28 -rotate-[12deg]",
        width: 112,
        height: 112,
      },
      {
        id: "dipper-mid",
        src: "/decorations/galaxy/big-dipper.png",
        className: "absolute left-1/4 top-36 h-24 w-24 rotate-[-6deg] opacity-20",
        width: 96,
        height: 96,
      },
    ],
  },
  raindrops: {
    uiTokens: RAINDROPS_UI_TOKENS,
    gradient:
      "radial-gradient(circle at 82% 12%, rgba(74, 127, 165, 0.22), transparent 36%), radial-gradient(circle at 15% 55%, rgba(60, 110, 148, 0.18), transparent 42%)",
    previewSrc: "/decorations/rain/rain.png",
    nav: {
      accent: "#4a7fa5",
      accentSoft: "#a8cce0",
      border: "#b4c8d8",
      barBg: "rgba(245, 249, 252, 0.93)",
      activeShadow: "0 8px 20px -6px rgba(74, 127, 165, 0.4)",
    },
    slots: [
      {
        id: "raindrops-tl",
        src: "/decorations/rain/raindrops.png",
        className: "absolute -left-12 top-2 h-36 w-36 -rotate-[10deg]",
        width: 144,
        height: 144,
      },
      {
        id: "heavy-rain-tr",
        src: "/decorations/rain/heavy-rain.png",
        className: "absolute -right-14 top-24 h-40 w-40 rotate-[12deg]",
        width: 160,
        height: 160,
      },
      {
        id: "rain-bl",
        src: "/decorations/rain/rain.png",
        className: "absolute -left-10 bottom-10 h-32 w-32 rotate-[6deg]",
        width: 128,
        height: 128,
      },
      {
        id: "raindrops-br",
        src: "/decorations/rain/raindrops.png",
        className: "absolute -right-8 bottom-18 h-28 w-28 -rotate-[8deg]",
        width: 112,
        height: 112,
      },
    ],
  },
  sakura: {
    uiTokens: SAKURA_UI_TOKENS,
    gradient:
      "radial-gradient(circle at 82% 12%, rgba(181, 87, 122, 0.22), transparent 36%), radial-gradient(circle at 15% 55%, rgba(160, 72, 108, 0.18), transparent 42%)",
    previewSrc: "/decorations/sakura/sakura.png",
    nav: {
      accent: "#b5577a",
      accentSoft: "#f0c6d6",
      border: "#dbbfcc",
      barBg: "rgba(252, 247, 249, 0.93)",
      activeShadow: "0 8px 20px -6px rgba(181, 87, 122, 0.38)",
    },
    slots: [
      {
        id: "sakura-tl",
        src: "/decorations/sakura/sakura.png",
        className: "absolute -left-14 top-0 h-36 w-36 -rotate-[16deg]",
        width: 144,
        height: 144,
      },
      {
        id: "cherry-tr",
        src: "/decorations/sakura/cherry-blossom.png",
        className: "absolute -right-12 top-22 h-38 w-38 rotate-[14deg]",
        width: 152,
        height: 152,
      },
      {
        id: "single-bl",
        src: "/decorations/sakura/single-sakura.png",
        className: "absolute -left-8 bottom-14 h-28 w-28 rotate-[10deg]",
        width: 112,
        height: 112,
      },
      {
        id: "sakura-br",
        src: "/decorations/sakura/sakura.png",
        className: "absolute -right-10 bottom-10 h-32 w-32 -rotate-[12deg]",
        width: 128,
        height: 128,
      },
      {
        id: "cherry-mid",
        src: "/decorations/sakura/cherry-blossom.png",
        className: "absolute left-1/3 top-40 h-24 w-24 rotate-[-8deg] opacity-20",
        width: 96,
        height: 96,
      },
    ],
  },
  vinyl: {
    uiTokens: VINYL_UI_TOKENS,
    gradient:
      "radial-gradient(circle at 82% 12%, rgba(192, 57, 43, 0.22), transparent 36%), radial-gradient(circle at 15% 55%, rgba(160, 44, 32, 0.18), transparent 42%)",
    previewSrc: "/decorations/vinyl/vinyl-record.png",
    nav: {
      accent: "#c0392b",
      accentSoft: "#e8a8a0",
      border: "#d4aeae",
      barBg: "rgba(252, 247, 246, 0.93)",
      activeShadow: "0 8px 20px -6px rgba(192, 57, 43, 0.4)",
    },
    slots: [
      {
        id: "record-tl",
        src: "/decorations/vinyl/vinyl-record.png",
        className: "absolute -left-14 top-2 h-36 w-36 -rotate-[12deg]",
        width: 144,
        height: 144,
      },
      {
        id: "turntable-tr",
        src: "/decorations/vinyl/turntable.png",
        className: "absolute -right-12 top-20 h-38 w-38 rotate-[10deg]",
        width: 152,
        height: 152,
      },
      {
        id: "music-bl",
        src: "/decorations/vinyl/music.png",
        className: "absolute -left-10 bottom-12 h-32 w-32 rotate-[8deg]",
        width: 128,
        height: 128,
      },
      {
        id: "vinyl-br",
        src: "/decorations/vinyl/vinyl.png",
        className: "absolute -right-8 bottom-16 h-28 w-28 -rotate-[14deg]",
        width: 112,
        height: 112,
      },
    ],
  },
  kintsugi: {
    darkProfile: true,
    uiTokens: KINTSUGI_UI_TOKENS,
    pageBackground: KINTSUGI_UI_TOKENS.background,
    slotOpacity: 0.42,
    gradient:
      "radial-gradient(circle at 82% 12%, rgba(42, 82, 140, 0.38), transparent 38%), radial-gradient(circle at 12% 58%, rgba(201, 162, 72, 0.14), transparent 40%), radial-gradient(circle at 48% 100%, rgba(30, 58, 95, 0.32), transparent 52%)",
    previewSrc: "/decorations/kintsugi/kintsugi.png",
    nav: {
      accent: "#c9a248",
      accentSoft: "#3d5a80",
      border: "#2a4468",
      barBg: "rgba(23, 42, 74, 0.96)",
      activeShadow: "0 8px 20px -6px rgba(201, 162, 72, 0.4)",
    },
    slots: [
      {
        id: "kintsugi-tl",
        src: "/decorations/kintsugi/kintsugi.png",
        className: "absolute -left-14 top-0 h-36 w-36 -rotate-[14deg]",
        width: 144,
        height: 144,
      },
      {
        id: "bowl-tr",
        src: "/decorations/kintsugi/kintsugi-bowl.png",
        className: "absolute -right-12 top-20 h-40 w-40 rotate-[12deg]",
        width: 160,
        height: 160,
      },
      {
        id: "cracks-bl",
        src: "/decorations/kintsugi/kintsugi_new_gold_cracks_1.png",
        className: "absolute -left-10 bottom-10 h-32 w-32 rotate-[8deg]",
        width: 128,
        height: 128,
      },
      {
        id: "cracks-br",
        src: "/decorations/kintsugi/kintsugi_new_gold_cracks_2.png",
        className: "absolute -right-8 bottom-16 h-28 w-28 -rotate-[10deg]",
        width: 112,
        height: 112,
      },
      {
        id: "shards-mid",
        src: "/decorations/kintsugi/kintsugi_new_shards.png",
        className: "absolute left-1/4 top-36 h-24 w-24 rotate-[-6deg] opacity-20",
        width: 96,
        height: 96,
      },
    ],
  },
  garden: {
    darkProfile: true,
    uiTokens: GARDEN_UI_TOKENS,
    pageBackground: GARDEN_UI_TOKENS.background,
    slotOpacity: 0.32,
    gradient:
      "radial-gradient(circle at 80% 8%, rgba(196, 184, 120, 0.07), transparent 38%), radial-gradient(circle at 14% 52%, rgba(220, 228, 224, 0.05), transparent 42%), radial-gradient(circle at 50% 92%, rgba(196, 184, 120, 0.04), transparent 48%), radial-gradient(circle at 72% 68%, rgba(26, 46, 36, 0.35), transparent 40%)",
    previewSrc: "/decorations/garden/monstera-deliciosa.png",
    nav: {
      accent: "#c4b878",
      accentSoft: "#3d5248",
      border: "#4a5a52",
      barBg: "rgba(15, 22, 18, 0.96)",
      activeShadow: "0 8px 20px -6px rgba(196, 184, 120, 0.2)",
    },
    slots: GARDEN_SLOTS,
  },
  observatory: {
    darkProfile: true,
    uiTokens: OBSERVATORY_UI_TOKENS,
    pageBackground: OBSERVATORY_UI_TOKENS.background,
    slotOpacity: 0.4,
    gradient:
      "radial-gradient(circle at 78% 10%, rgba(232, 196, 90, 0.2), transparent 38%), radial-gradient(circle at 18% 55%, rgba(184, 115, 51, 0.14), transparent 40%), radial-gradient(circle at 42% 88%, rgba(232, 196, 90, 0.1), transparent 48%), radial-gradient(circle at 88% 72%, rgba(140, 100, 60, 0.12), transparent 36%)",
    previewSrc: "/decorations/observatory/old_observatory_building.png",
    nav: {
      accent: "#c4894a",
      accentSoft: "#5a4a38",
      border: "#4a4038",
      barBg: "rgba(28, 26, 24, 0.96)",
      activeShadow: "0 8px 20px -6px rgba(196, 137, 74, 0.4)",
    },
    slots: [
      {
        id: "building-tl",
        src: "/decorations/observatory/old_observatory_building_separated.png",
        className: "absolute -left-14 top-0 h-36 w-36 -rotate-[12deg]",
        width: 144,
        height: 144,
      },
      {
        id: "telescope-tr",
        src: "/decorations/observatory/telescope.png",
        className: "absolute -right-12 top-20 h-40 w-40 rotate-[14deg]",
        width: 160,
        height: 160,
      },
      {
        id: "star-bl",
        src: "/decorations/observatory/star.png",
        className: "absolute -left-8 bottom-14 h-28 w-28 rotate-[8deg]",
        width: 112,
        height: 112,
      },
      {
        id: "star-br",
        src: "/decorations/observatory/star.png",
        className: "absolute -right-10 bottom-10 h-32 w-32 -rotate-[10deg]",
        width: 128,
        height: 128,
      },
      {
        id: "scorpio-mid",
        src: "/decorations/observatory/scorpio.png",
        className: "absolute left-1/3 top-40 h-24 w-24 rotate-[-6deg] opacity-20",
        width: 96,
        height: 96,
      },
      {
        id: "star-tr-faint",
        src: "/decorations/observatory/star.png",
        className: "absolute right-1/4 top-8 h-20 w-20 rotate-[18deg] opacity-25",
        width: 80,
        height: 80,
      },
    ],
  },
  cats: {
    darkProfile: true,
    uiTokens: CATS_UI_TOKENS,
    pageBackground: CATS_UI_TOKENS.background,
    slotOpacity: 0.35,
    gradient:
      "radial-gradient(circle at 80% 8%, rgba(232, 149, 58, 0.1), transparent 38%), radial-gradient(circle at 14% 52%, rgba(60, 52, 76, 0.28), transparent 42%), radial-gradient(circle at 50% 92%, rgba(40, 34, 52, 0.22), transparent 48%), radial-gradient(circle at 72% 68%, rgba(232, 149, 58, 0.06), transparent 40%)",
    previewSrc: "/decorations/cats/black-cat.png",
    nav: {
      accent: "#e8953a",
      accentSoft: "#3a3248",
      border: "#4a4058",
      barBg: "rgba(18, 16, 22, 0.96)",
      activeShadow: "0 8px 20px -6px rgba(232, 149, 58, 0.28)",
    },
    slots: CATS_SLOTS,
  },
};

export function themeDisplayName(theme: AppTheme): string {
  return THEME_DISPLAY_NAMES[theme] ?? theme;
}

export function themePreviewSrc(theme: AppTheme): string {
  const key = normalizeProfileTheme(theme);
  return PROFILE_THEMES[key]?.previewSrc ?? PROFILE_THEMES[DEFAULT_THEME].previewSrc;
}

/** Selected-state styling for the Edit Profile theme picker grid. */
export function themePickerSelectedStyle(theme: AppTheme): CSSProperties {
  const key = normalizeProfileTheme(theme);
  const { accent, accentSoft } = PROFILE_THEMES[key].nav;
  return {
    borderColor: accent,
    backgroundColor: `${accentSoft}59`,
    boxShadow: `0 0 0 1px color-mix(in srgb, ${accent} 30%, transparent)`,
  };
}
