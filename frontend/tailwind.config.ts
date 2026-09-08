import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        espresso: {
          950: "#0f0805",
          900: "#1a0f0a",
          800: "#2c1a11",
          700: "#42281b",
          600: "#5c3826",
          500: "#7b4c34",
        },
        terracotta: {
          50: "#fbf5f2",
          100: "#f6e9e4",
          200: "#eed0c4",
          300: "#e2ae9a",
          400: "#d4876c",
          500: "#c85a32",
          600: "#ba4724",
          700: "#9b371c",
          800: "#7f301b",
          900: "#682c1b",
        },
        saffron: {
          50: "#fffbeb",
          100: "#fef3c7",
          200: "#fde68a",
          300: "#fcd34d",
          400: "#fbbf24",
          500: "#f59e0b",
          600: "#d97706",
          700: "#b45309",
        },
        cream: {
          50: "#fdfaf6",
          100: "#f7f0e6",
          200: "#eee2d1",
          300: "#e1cdb3",
          400: "#ceb190",
          500: "#bd9772",
        },
        chai: {
          500: "#8c4a2f",
          600: "#743a24",
          700: "#5d2d1b",
        },
      },
    },
  },
  plugins: [],
};

export default config;
