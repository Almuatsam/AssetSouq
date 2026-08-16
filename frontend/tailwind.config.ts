import type { Config } from "tailwindcss";

// "Contemporary Business" direction — see docs/05-Design-Brief.md.
// Every color reads from the RGB-triplet CSS custom properties in
// src/styles/tokens.css via rgb(var(--x) / <alpha-value>) — the
// <alpha-value> placeholder is what lets Tailwind's opacity modifiers
// (e.g. `bg-primary/5`, `border-gray/30`) keep working.
//
// `primary`, `gray`, and `background` are kept as aliases (rather than
// renamed) because the app already uses them in ~190 places — renaming
// would silently unstyle every existing page. New code should prefer the
// direct names (`accent`, `muted`, `bg`, `ink`, ...); the aliases exist
// for compatibility with pages not yet migrated.
function withOpacity(cssVar: string) {
  return `rgb(var(${cssVar}) / <alpha-value>)`;
}

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // current palette (Contemporary Business)
        bg: withOpacity("--color-bg"),
        surface: withOpacity("--color-surface"),
        "surface-alt": withOpacity("--color-surface-alt"),
        border: withOpacity("--color-border"),
        "card-border": withOpacity("--color-card-border"),
        ink: withOpacity("--color-ink"),
        muted: withOpacity("--color-muted"),
        accent: {
          DEFAULT: withOpacity("--color-accent"),
          strong: withOpacity("--color-accent-strong"),
          tint: withOpacity("--color-accent-tint"),
        },
        "on-accent": withOpacity("--color-on-accent"),
        success: withOpacity("--color-success"),
        warning: withOpacity("--color-warning"),
        danger: withOpacity("--color-danger"),

        // legacy aliases — same tokens, old names, for pre-existing call sites
        primary: withOpacity("--color-accent-strong"),
        gray: withOpacity("--color-muted"),
        background: withOpacity("--color-bg"),
      },
      fontFamily: {
        sans: ["IBM Plex Sans", "system-ui", "sans-serif"],
        arabic: ["IBM Plex Sans Arabic", "system-ui", "sans-serif"],
      },
      borderRadius: {
        DEFAULT: "var(--radius)",
      },
      boxShadow: {
        pop: "var(--shadow-pop)",
      },
    },
  },
  plugins: [],
} satisfies Config;
