import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          purple: "#7C3AED",
          gold: "#D4A24C",
          green: "#10B981",
          tg: "#229ED9",
          bg: "#0A0A0F",
          card: "#13131C",
          border: "#2a2a3a",
          muted: "#8B8B9E",
          text: "#E8E8F0",
        },
      },
    },
  },
  plugins: [],
};

export default config;
