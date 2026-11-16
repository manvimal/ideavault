import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        paper: "#fdfcf9",
        brand: {
          50: "#f2f1ff",
          100: "#e6e4ff",
          200: "#cfccff",
          300: "#aca5ff",
          400: "#8b7bff",
          500: "#7256f6",
          600: "#5f3ce0",
          700: "#4d2fb8",
          800: "#402893",
          900: "#362475",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        soft: "0 2px 8px rgba(30, 20, 80, 0.06), 0 1px 2px rgba(30, 20, 80, 0.05)",
        card: "0 8px 24px -8px rgba(60, 40, 150, 0.18)",
        glow: "0 0 0 4px rgba(114, 86, 246, 0.12)",
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(6px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.35s ease-out",
      },
    },
  },
  plugins: [],
};

export default config;
