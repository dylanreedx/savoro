// @savoro/ui — Shared design tokens

// ---------------------------------------------------------------------------
// Colors
// ---------------------------------------------------------------------------
export const colors = {
  stone: {
    50: "#FAFAF9",
    100: "#F5F3F0",
    200: "#E7E5E0",
    300: "#D6D3CD",
    400: "#A8A29E",
    500: "#78716C",
    600: "#57534E",
    700: "#44403C",
    800: "#292524",
    900: "#1C1917",
  },
  blush: {
    50: "#FFF5F5",
    100: "#FFE8E8",
    200: "#FECDD3",
    300: "#FDA4AF",
    400: "#FB7185",
    500: "#F43F5E",
  },
} as const;

// Macro accent palette — pastel tones for ring fills and pills
export const macroColors = {
  calories: "#FB7185",  // blush-400
  protein: "#F87171",   // coral
  carb: "#A78BFA",      // lavender
  fat: "#FBBF24",       // gold
} as const;

// Background tints for macro pills (lower opacity feel)
export const macroBgColors = {
  calories: "rgba(251,113,133,0.12)",
  protein: "rgba(248,113,113,0.12)",
  carb: "rgba(167,139,250,0.12)",
  fat: "rgba(251,191,36,0.12)",
} as const;

// ---------------------------------------------------------------------------
// Glass surface constants
// ---------------------------------------------------------------------------
export const glass = {
  blur: 40,
  blurHeavy: 80,
  tint: "light" as const,
  bg: "rgba(255,255,255,0.65)",
  bgSubtle: "rgba(255,255,255,0.45)",
  border: "rgba(255,255,255,0.35)",
  borderSubtle: "rgba(231,229,224,0.4)",
  radius: 20,
  radiusSm: 14,
  radiusLg: 28,
};

// ---------------------------------------------------------------------------
// Typography — font family names (must match useFonts keys)
// ---------------------------------------------------------------------------
export const fonts = {
  regular: "PlusJakartaSans-Regular",
  medium: "PlusJakartaSans-Medium",
  semibold: "PlusJakartaSans-SemiBold",
  bold: "PlusJakartaSans-Bold",
  extrabold: "PlusJakartaSans-ExtraBold",
} as const;

// ---------------------------------------------------------------------------
// Spacing
// ---------------------------------------------------------------------------
export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  "2xl": 48,
} as const;

// ---------------------------------------------------------------------------
// Animation presets (Moti / Reanimated)
// ---------------------------------------------------------------------------
export const springPresets = {
  gentle: { type: "spring" as const, damping: 20, stiffness: 150 },
  snappy: { type: "spring" as const, damping: 18, stiffness: 280 },
  bouncy: { type: "spring" as const, damping: 12, stiffness: 200 },
};
