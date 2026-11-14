import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/features/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Stitch Precision Palette
        primary: {
          DEFAULT: "#4e31dc",
          container: "#6750f5",
          fixed: "#e4dfff",
          "fixed-dim": "#c7bfff",
        },
        "on-primary": {
          DEFAULT: "#ffffff",
          container: "#f2edff",
          fixed: "#170065",
          "fixed-variant": "#3f19ce",
        },
        secondary: {
          DEFAULT: "#0057c2",
          container: "#2c70e2",
          fixed: "#d9e2ff",
          "fixed-dim": "#afc6ff",
        },
        "on-secondary": {
          DEFAULT: "#ffffff",
          container: "#fefcff",
          fixed: "#001a43",
          "fixed-variant": "#004398",
        },
        tertiary: {
          DEFAULT: "#006228",
          container: "#007e35",
          fixed: "#7ffc97",
          "fixed-dim": "#62df7d",
        },
        "on-tertiary": {
          DEFAULT: "#ffffff",
          container: "#c0ffc4",
          fixed: "#002109",
          "fixed-variant": "#005320",
        },
        surface: {
          DEFAULT: "#f8f9ff",
          dim: "#cbdbf5",
          bright: "#f8f9ff",
          variant: "#d3e4fe",
          container: {
            lowest: "#ffffff",
            low: "#eff4ff",
            DEFAULT: "#e5eeff",
            high: "#dce9ff",
            highest: "#d3e4fe",
          },
        },
        "on-surface": {
          DEFAULT: "#0b1c30",
          variant: "#474555",
        },
        "inverse-surface": "#213145",
        "inverse-on-surface": "#eaf1ff",
        outline: {
          DEFAULT: "#787587",
          variant: "#c8c4d8",
        },
        // Existing brand palette for backward compatibility
        brand: {
          50: "#eef2ff",
          100: "#e0e7ff",
          200: "#c7d2fe",
          300: "#a5b4fc",
          400: "#818cf8",
          500: "#6366f1",
          600: "#4e31dc",
          700: "#4338ca",
          800: "#3730a3",
          900: "#312e81",
          950: "#1e1b4b",
        },
        navy: {
          800: "#111827",
          900: "#0b0f19",
          950: "#060911",
        },
      },
      borderRadius: {
        DEFAULT: "1rem",
        lg: "2rem",
        xl: "3rem",
        full: "9999px",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "Plus Jakarta Sans", "Inter", "system-ui", "-apple-system", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      spacing: {
        gutter: "1.5rem",
        margin: "2rem",
        "gutter-mobile": "0.75rem",
        "margin-mobile": "1rem",
        "space-xs": "0.25rem",
        "space-sm": "0.5rem",
        "space-md": "1rem",
        "space-lg": "1.5rem",
        "space-xl": "2.5rem",
      },
    },
  },
  plugins: [],
};

export default config;
