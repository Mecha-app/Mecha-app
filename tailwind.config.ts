import type { Config } from "tailwindcss";

/**
 * MECHA design tokens — Tailwind binding.
 * Every color resolves to a semantic CSS custom property defined in
 * app/globals.css (DESIGN_SYSTEM §1.2 / §1.5). Components NEVER use raw hex;
 * the light/dark toggle is a token swap on [data-theme], not a redesign.
 */
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "var(--color-bg)",
        surface: "var(--color-surface)",
        raised: "var(--color-surface-raised)",
        inset: "var(--color-inset)",
        line: "var(--color-line)",
        ink: {
          1: "var(--color-ink-1)",
          2: "var(--color-ink-2)",
          3: "var(--color-ink-3)",
        },
        accent: {
          DEFAULT: "var(--color-accent)",
          bright: "var(--color-accent-bright)",
          deep: "var(--color-accent-deep)",
        },
        verdict: {
          fair: "var(--verdict-fair)",
          warn: "var(--verdict-warn)",
          rip: "var(--verdict-rip)",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "var(--font-noto-display)", "sans-serif"],
        sans: ["var(--font-sans)", "var(--font-noto-sans)", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      letterSpacing: {
        eyebrow: "0.12em",
      },
    },
  },
  plugins: [],
};

export default config;
