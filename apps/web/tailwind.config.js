/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "sans-serif"],
        display: ["Bricolage Grotesque", "Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      colors: {
        canvas: "rgb(var(--c-canvas) / <alpha-value>)",
        surface: "rgb(var(--c-surface) / <alpha-value>)",
        raised: "rgb(var(--c-raised) / <alpha-value>)",
        line: "rgb(var(--c-line) / <alpha-value>)",
        fg: "rgb(var(--c-fg) / <alpha-value>)",
        muted: "rgb(var(--c-muted) / <alpha-value>)",
        accent: "rgb(var(--c-accent) / <alpha-value>)",
        accentText: "rgb(var(--c-accent-text) / <alpha-value>)",
        night: "rgb(var(--c-night) / <alpha-value>)",
        nightRaised: "rgb(var(--c-night-raised) / <alpha-value>)",
        nightLine: "rgb(var(--c-night-line) / <alpha-value>)",
        nightFg: "rgb(var(--c-night-fg) / <alpha-value>)",
        nightMuted: "rgb(var(--c-night-muted) / <alpha-value>)",
      },
      letterSpacing: {
        tightest: "-0.045em",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        blink: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0" },
        },
        "pop-in": {
          "0%": { opacity: "0", transform: "translateY(8px) scale(0.985)" },
          "100%": { opacity: "1", transform: "translateY(0) scale(1)" },
        },
        "sweep": {
          "0%": { transform: "scaleX(0)" },
          "100%": { transform: "scaleX(1)" },
        },
        "drift": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-6px)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.6s cubic-bezier(0.22, 1, 0.36, 1) both",
        blink: "blink 1.1s step-end infinite",
        "pop-in": "pop-in 0.28s cubic-bezier(0.22, 1, 0.36, 1) both",
        sweep: "sweep 0.4s cubic-bezier(0.22, 1, 0.36, 1) both",
        drift: "drift 6s ease-in-out infinite",
      },
    },
  },
  plugins: [],
}
