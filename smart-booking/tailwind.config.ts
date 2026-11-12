import type { Config } from "tailwindcss";

/**
 * Sistema de diseño — identidad Revoredo IusCorp × lenguaje iOS.
 * Paleta oficial: azul marino #102438 (dominante), guinda #621410 (acento), gris claro #E2E2E2, blanco.
 * Nota: el token `gold` se conserva por compatibilidad de nombres, pero ahora representa el ACENTO GUINDA.
 */
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: { DEFAULT: "#0C1C2D", 2: "#132A40", 3: "#1F3A55" },
        navy: { DEFAULT: "#1B3A58", deep: "#102438", 50: "#EFF2F6", 100: "#E7EBF1", 200: "#D2DAE4" },
        steel: "#8A9BB0",
        paper: "#F2F2F4",
        cream: "#E2E2E2",
        mist: "#E2E2E2",
        gold: { DEFAULT: "#621410", light: "#E3B3AE", dark: "#621410", 50: "#F7ECEB" },
        guinda: { DEFAULT: "#621410", soft: "#F7ECEB", tint: "#E3B3AE" },
        line: "rgba(16,36,56,.10)",
      },
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        sans: ["var(--font-body)", "-apple-system", "BlinkMacSystemFont", "Helvetica Neue", "Arial", "sans-serif"],
        mono: ["var(--font-body)", "-apple-system", "sans-serif"],
      },
      borderRadius: { "4xl": "2rem" },
      boxShadow: {
        card: "0 0 0 .5px rgba(16,36,56,.08), 0 1px 2px rgba(16,36,56,.04), 0 8px 28px -14px rgba(16,36,56,.18)",
        lift: "0 0 0 .5px rgba(16,36,56,.08), 0 2px 6px rgba(16,36,56,.05), 0 28px 60px -28px rgba(16,36,56,.38)",
        glass: "inset 0 .5px 0 rgba(255,255,255,.6), 0 0 0 .5px rgba(16,36,56,.06)",
      },
      transitionTimingFunction: {
        ios: "cubic-bezier(.32,.72,0,1)",
        spring: "cubic-bezier(.34,1.36,.64,1)",
      },
      keyframes: {
        "fade-up": { from: { opacity: "0", transform: "translateY(10px) scale(.985)" }, to: { opacity: "1", transform: "none" } },
        "push-in": { from: { opacity: "0", transform: "translateX(18px)" }, to: { opacity: "1", transform: "none" } },
        "sheet-in": { from: { opacity: "0", transform: "translateY(28px)" }, to: { opacity: "1", transform: "none" } },
        pop: { "0%": { transform: "scale(.92)", opacity: "0" }, "60%": { transform: "scale(1.02)", opacity: "1" }, "100%": { transform: "scale(1)" } },
        shimmer: { "100%": { transform: "translateX(100%)" } },
      },
      animation: {
        "fade-up": "fade-up .5s cubic-bezier(.32,.72,0,1) both",
        "push-in": "push-in .45s cubic-bezier(.32,.72,0,1) both",
        "sheet-in": "sheet-in .6s cubic-bezier(.32,.72,0,1) both",
        pop: "pop .5s cubic-bezier(.34,1.36,.64,1) both",
      },
    },
  },
  plugins: [],
};
export default config;
