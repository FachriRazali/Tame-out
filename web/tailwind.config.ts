import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Tame'out brand green, anchored on #839174 (brand-500).
        brand: {
          50: "#f4f6f1",
          100: "#e6eadf",
          200: "#ccd4c0",
          300: "#adbb9c",
          400: "#96a687",
          500: "#839174",
          600: "#6b7860",
          700: "#565f4d",
          800: "#454c3f",
          900: "#383d34",
          950: "#1e2119"
        },
        // Theme-aware tokens: light = beige, dark ("coklat muda") = light brown.
        // See globals.css for the two variable sets these resolve against.
        capacity: {
          green: "rgb(var(--capacity-green) / <alpha-value>)",
          greenBg: "var(--capacity-green-bg)",
          yellow: "rgb(var(--capacity-yellow) / <alpha-value>)",
          yellowBg: "var(--capacity-yellow-bg)",
          red: "rgb(var(--capacity-red) / <alpha-value>)",
          redBg: "var(--capacity-red-bg)"
        },
        ink: {
          50: "rgb(var(--ink-50) / <alpha-value>)",
          100: "rgb(var(--ink-100) / <alpha-value>)",
          400: "rgb(var(--ink-400) / <alpha-value>)",
          600: "rgb(var(--ink-600) / <alpha-value>)",
          800: "rgb(var(--ink-800) / <alpha-value>)",
          900: "rgb(var(--ink-900) / <alpha-value>)"
        },
        surface: "rgb(var(--surface) / <alpha-value>)",
        "surface-2": "rgb(var(--surface-2) / <alpha-value>)"
      },
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"]
      },
      boxShadow: {
        soft: "0 2px 8px rgba(43, 33, 22, 0.08)",
        card: "0 8px 24px rgba(43, 33, 22, 0.10)",
        floating: "0 20px 50px rgba(43, 33, 22, 0.20)"
      },
      keyframes: {
        pulseSoft: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.55" }
        },
        rise: {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" }
        }
      },
      animation: {
        "pulse-soft": "pulseSoft 2s ease-in-out infinite",
        rise: "rise 0.4s ease-out both"
      }
    }
  },
  plugins: []
};
export default config;
