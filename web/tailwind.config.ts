import type { Config } from "tailwindcss";

// Brand tokens — build spec Section 8.1 + the Claude Design handoff.
// Constant brand colors are literal; semantic colors bind to the CSS
// variables defined in app/globals.css so light/dark flip automatically.
const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // constants
        ink: "#211B14",
        paper: "#F4EDDF",
        cocoa: "#3D2F22",
        "cocoa-deep": "#241A12",
        brass: "#B98C3F",
        dust: "#DCCFB2",
        ember: "#8C6A47",
        clay: "#8C6A47",
        night: "#1B1712",
        "night-surface": "#2A231C",
        // semantic (flip with theme)
        page: "var(--e-bg)",
        surface: "var(--e-surface)",
        raised: "var(--e-surface-raised)",
        fg: "var(--e-fg)",
        muted: "var(--e-fg-muted)",
        quiet: "var(--e-fg-quiet)",
        hair: "var(--e-border)",
        brand: "var(--e-brand)",
        "brand-hover": "var(--e-brand-hover)",
        "star-empty": "var(--e-star-empty)",
      },
      fontFamily: {
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
        card: "14px",
        xl2: "22px",
      },
      boxShadow: {
        card: "0 2px 6px rgba(33,27,20,0.05)",
        warm: "0 6px 18px rgba(33,27,20,0.10)",
        lift: "0 18px 40px rgba(33,27,20,0.18)",
        modal: "0 30px 70px rgba(33,27,20,0.32)",
      },
    },
  },
  plugins: [],
};

export default config;
