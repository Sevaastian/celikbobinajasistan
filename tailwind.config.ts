import type { Config } from "tailwindcss";

const accent = (shade: string) => `rgb(var(--accent-${shade}) / <alpha-value>)`;

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: Object.fromEntries(["950", "900", "800", "700", "600", "500"].map(n => [n, `rgb(var(--ink-${n}) / <alpha-value>)`])),
        // Vurgu rengi CSS değişkenlerinden gelir; menüdeki tema seçiciyle değişir.
        accent: { DEFAULT: accent("500"), 400: accent("400"), 500: accent("500"), 600: accent("600") },
      },
      fontFamily: { sans: ["Inter", "system-ui", "sans-serif"] },
    },
  },
  plugins: [],
};
export default config;
