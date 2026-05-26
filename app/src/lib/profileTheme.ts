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
  galaxy: {
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
};

export function themePreviewSrc(theme: AppTheme): string {
  return PROFILE_THEMES[theme]?.previewSrc ?? PROFILE_THEMES.plant.previewSrc;
}
