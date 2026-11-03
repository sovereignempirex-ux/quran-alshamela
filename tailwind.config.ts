import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        ui: ["var(--font-ui)", "Tahoma", "sans-serif"],
        quran: ["var(--font-quran)", "Amiri", "serif"],
        headings: ["var(--font-headings)", "Amiri", "serif"],
      },
    },
  },
  plugins: [],
};

export default config;
