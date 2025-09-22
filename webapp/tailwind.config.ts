import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "media", // Use system preference for dark mode
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "var(--font-dm-mono)",
          "ui-monospace",
          "SFMono-Regular",
          "monospace",
        ],
        serif: ["var(--font-fraunces)", "ui-serif", "Georgia", "serif"],
        mono: [
          "var(--font-dm-mono)",
          "ui-monospace",
          "SFMono-Regular",
          "monospace",
        ],
      },
      colors: {
        // Monochrome palette with semantic naming
        neutral: {
          0: "#ffffff",
          50: "#fafafa",
          100: "#f5f5f5",
          200: "#e5e5e5",
          300: "#d4d4d4",
          400: "#a3a3a3",
          500: "#737373",
          600: "#525252",
          700: "#404040",
          800: "#262626",
          900: "#171717",
          950: "#0a0a0a",
          1000: "#000000",
        },
      },
    },
  },
  plugins: [],
};
export default config;
