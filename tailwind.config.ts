import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        dark: {
          bg: "#0d1117",
          fg: "#e6edf3",
          border: "#30363d",
          muted: "#8b949e",
          surface: "#161b22",
        },
        indigo: {
          primary: "#4f46e5",
          hover: "#6366f1",
          light: "#818cf8",
        },
        status: {
          up: "#1a7f17",
          down: "#da3633",
          neutral: "#8b949e",
        },
      },
      fontFamily: {
        sans: [
          '"Noto Sans KR"',
          "-apple-system",
          "BlinkMacSystemFont",
          '"Segoe UI"',
          "sans-serif",
        ],
        mono: [
          '"Fira Code"',
          '"Courier New"',
          "monospace",
        ],
      },
      backgroundColor: {
        primary: "#0d1117",
        secondary: "#161b22",
      },
      borderColor: {
        DEFAULT: "#30363d",
      },
      spacing: {
        navbar: "56px",
        ticker: "48px",
      },
    },
  },
  plugins: [],
};

export default config;
