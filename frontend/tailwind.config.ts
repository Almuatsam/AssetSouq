import type { Config } from "tailwindcss";

// Colors and fonts from docs/05-Design-Brief.md
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: "#1D4ED8",
        gray: "#64748B",
        background: "#F8FAFC",
        success: "#16A34A",
        warning: "#F59E0B",
        danger: "#DC2626",
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"],
        arabic: ["IBM Plex Sans Arabic", "sans-serif"],
      },
    },
  },
  plugins: [],
} satisfies Config;
