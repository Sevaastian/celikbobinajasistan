import type { Config } from "tailwindcss";

const accent = (shade: string) => `rgb(var(--accent-${shade}) / <alpha-value>)`;

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: { 950: "#0a0a0b", 900: "#111113", 800: "#18181b", 700: "#222226", 600: "#2e2e34", 500: "#44444c" },
        // Vurgu rengi CSS değişkenlerinden gelir; menüdeki tema seçiciyle değişir.
        accent: { DEFAULT: accent("500"), 400: accent("400"), 500: accent("500"), 600: accent("600") },
      },
      fontFamily: { sans: ["Inter", "system-ui", "sans-serif"] },
    },
  },
  plugins: [],
};
export default config;
