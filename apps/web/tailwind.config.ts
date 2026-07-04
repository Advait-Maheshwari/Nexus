import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        void: "#02040a",
        navy: "#06111f",
        panel: "rgba(8, 17, 32, 0.68)",
        cyan: "#48e5ff",
        orbital: "#4f8cff",
        violet: "#8d67ff",
        solar: "#f5c451",
        success: "#4ade80",
        risk: "#fb7185"
      },
      boxShadow: {
        glow: "0 0 40px rgba(72, 229, 255, 0.18)",
        violet: "0 0 44px rgba(141, 103, 255, 0.16)"
      },
      fontFamily: {
        display: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "SFMono-Regular", "monospace"]
      },
      backdropBlur: {
        xs: "2px"
      }
    }
  },
  plugins: []
} satisfies Config;

