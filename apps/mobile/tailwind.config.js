/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
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
        // Pastel macro accent colors
        macro: {
          protein: "#93C5FD", // blue-300
          carb: "#FDE68A",    // amber-200
          fat: "#C4B5FD",     // violet-300
        },
      },
      fontFamily: {
        sans: ["PlusJakartaSans-Regular"],
        "sans-medium": ["PlusJakartaSans-Medium"],
        "sans-semibold": ["PlusJakartaSans-SemiBold"],
        "sans-bold": ["PlusJakartaSans-Bold"],
        "sans-extrabold": ["PlusJakartaSans-ExtraBold"],
      },
      borderRadius: {
        "2xl": "16px",
        "3xl": "24px",
      },
      boxShadow: {
        glass: "0 2px 16px rgba(0, 0, 0, 0.04)",
        "glass-lg": "0 4px 24px rgba(0, 0, 0, 0.06)",
      },
    },
  },
  plugins: [],
};
