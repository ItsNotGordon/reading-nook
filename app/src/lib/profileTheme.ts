import type { AppTheme } from "@/lib/types";

export type DecorationSlot = {
  id: string;
  src: string;
  className: string;
  width: number;
  height: number;
};

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
};

export const PROFILE_THEMES: Record<AppTheme, ProfileThemeConfig> = {
  plant: {
    gradient:
      "radial-gradient(circle at 82% 12%, rgba(56, 92, 62, 0.22), transparent 36%), radial-gradient(circle at 15% 55%, rgba(45, 78, 52, 0.18), transparent 42%)",
    previewSrc: "/decorations/plant/monstera-deliciosa.png",
    nav: {
      accent: "#355a40",
      accentSoft: "#8fb896",
      border: "#a8c4ad",
      barBg: "rgba(251, 249, 249, 0.92)",
      activeShadow: "0 8px 20px -6px rgba(45, 78, 52, 0.4)",
    },
    slots: [
      {
        id: "monstera-tl",
        src: "/decorations/plant/monstera-deliciosa.png",
        className: "absolute -left-14 top-0 h-32 w-32 -rotate-[18deg]",
        width: 128,
        height: 128,
      },
      {
        id: "succulent-tr",
        src: "/decorations/plant/succulent.png",
        className: "absolute -right-16 top-24 h-40 w-40 rotate-[20deg]",
        width: 160,
        height: 160,
      },
      {
        id: "alocasia-bl",
        src: "/decorations/plant/alocasia.png",
        className: "absolute -left-16 bottom-8 h-44 w-44 rotate-[10deg]",
        width: 176,
        height: 176,
      },
      {
        id: "monstera-br",
        src: "/decorations/plant/monstera-deliciosa.png",
        className: "absolute -right-10 bottom-16 h-28 w-28 -rotate-[24deg]",
        width: 112,
        height: 112,
      },
      {
        id: "succulent-mid",
        src: "/decorations/plant/succulent.png",
        className: "absolute left-1/3 top-40 h-24 w-24 rotate-[-8deg] opacity-20",
        width: 96,
        height: 96,
      },
    ],
  },
  matcha: {
    gradient:
      "radial-gradient(circle at 82% 12%, rgba(171, 196, 168, 0.28), transparent 36%), radial-gradient(circle at 15% 55%, rgba(127, 164, 131, 0.2), transparent 42%)",
    previewSrc: "/decorations/matcha/matcha-tea.png",
    nav: {
      accent: "#4a7350",
      accentSoft: "#abd0ad",
      border: "#b8c9b0",
      barBg: "rgba(251, 249, 249, 0.92)",
      activeShadow: "0 8px 20px -6px rgba(74, 115, 80, 0.38)",
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
  cats: {
    gradient:
      "radial-gradient(circle at 82% 12%, rgba(214, 168, 128, 0.26), transparent 36%), radial-gradient(circle at 15% 55%, rgba(186, 132, 96, 0.2), transparent 42%)",
    previewSrc: "/decorations/cats/cat.png",
    nav: {
      accent: "#b86f4a",
      accentSoft: "#e8cfc0",
      border: "#d4b8a8",
      barBg: "rgba(250, 246, 242, 0.94)",
      activeShadow: "0 8px 20px -6px rgba(184, 111, 74, 0.38)",
    },
    slots: [
      {
        id: "cat-tl",
        src: "/decorations/cats/cat.png",
        className: "absolute -left-12 top-4 h-36 w-36 -rotate-[8deg]",
        width: 144,
        height: 144,
      },
      {
        id: "exotic-tr",
        src: "/decorations/cats/exotic-shorthair.png",
        className: "absolute -right-14 top-24 h-40 w-40 rotate-[12deg]",
        width: 160,
        height: 160,
      },
      {
        id: "cat-bl",
        src: "/decorations/cats/cat.png",
        className: "absolute -left-8 bottom-14 h-28 w-28 rotate-[10deg]",
        width: 112,
        height: 112,
      },
      {
        id: "exotic-br",
        src: "/decorations/cats/exotic-shorthair.png",
        className: "absolute -right-10 bottom-8 h-32 w-32 -rotate-[14deg]",
        width: 128,
        height: 128,
      },
    ],
  },
};

export function themePreviewSrc(theme: AppTheme): string {
  return PROFILE_THEMES[theme]?.previewSrc ?? PROFILE_THEMES.plant.previewSrc;
}
