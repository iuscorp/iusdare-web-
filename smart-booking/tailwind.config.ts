import type { Config } from "tailwindcss";

/** Tokens alineados con la identidad IUS DARE (ver index.html del sitio). */
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: { DEFAULT: "#1B1B1D", 2: "#26282B", 3: "#3A3D42" },
        navy: { DEFAULT: "#123A5E", deep: "#102438", 50: "#EEF4F9", 100: "#E9F1F7", 200: "#CDE0EE" },
        steel: "#78A8BF",
        paper: "#FAFCFD",
        cream: "#F7F4ED",
        gold: { DEFAULT: "#C08128", light: "#E2AE5C", dark: "#8A5A14", 50: "#FBF3E6" },
        guinda: "#621410",
        line: "rgba(16,36,56,.14)",
      },
      fontFamily: {
        display: ["var(--font-display)", "Segoe UI", "sans-serif"],
        sans: ["var(--font-body)", "Helvetica Neue", "Arial", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(16,36,56,.06), 0 8px 24px -12px rgba(16,36,56,.18)",
        lift: "0 2px 4px rgba(16,36,56,.08), 0 18px 40px -18px rgba(16,36,56,.35)",
      },
      keyframes: {
        "fade-up": { from: { opacity: "0", transform: "translateY(8px)" }, to: { opacity: "1", transform: "none" } },
        shimmer: { "100%": { transform: "translateX(100%)" } },
      },
      animation: {
        "fade-up": "fade-up .35s cubic-bezier(.2,.7,.2,1) both",
      },
    },
  },
  plugins: [],
};
export default config;
