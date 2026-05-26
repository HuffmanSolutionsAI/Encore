import type { Config } from "tailwindcss";

// Brand tokens — build spec Section 8.1. Use only these colors.
const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  darkMode: "media",
  theme: {
    extend: {
      colors: {
        ink: "#211B14",
        paper: "#F4EDDF",
        cocoa: "#3D2F22",
        "cocoa-deep": "#241A12",
        brass: "#B98C3F",
        surface: "#FBF7EC",
        dust: "#DCCFB2",
        night: "#1B1712",
        "night-surface": "#2A231C",
        clay: "#8C6A47",
      },
      fontFamily: {
        // Loaded via `next/font/google` in app/layout.tsx; the CSS variables
        // are exported onto the body element.
        display: ["var(--font-fraunces)", "Georgia", "serif"],
        sans: [
          "var(--font-inter)",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
      },
      borderRadius: {
        card: "13px",
      },
    },
  },
  plugins: [],
};

export default config;
