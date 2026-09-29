/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // Primary brand colors
        primary: {
          DEFAULT: "var(--color-primary)",
          hover: "var(--color-primary-hover)",
          light: "var(--color-primary-light)",
        },
        // Surface colors (backgrounds)
        surface: {
          DEFAULT: "var(--color-surface)",
          secondary: "var(--color-surface-secondary)",
          tertiary: "var(--color-surface-tertiary)",
        },
        // Border colors
        border: {
          DEFAULT: "var(--color-border)",
          secondary: "var(--color-border-secondary)",
        },
        // Text colors
        content: {
          DEFAULT: "var(--color-text-primary)",
          secondary: "var(--color-text-secondary)",
          tertiary: "var(--color-text-tertiary)",
        },
        // Status colors
        status: {
          success: "var(--color-success)",
          warning: "var(--color-warning)",
          error: "var(--color-error)",
          info: "var(--color-info)",
        },
        // Node state colors (for flowsheet)
        node: {
          calculated: "#4CAF50",
          pending: "#FFC107",
          error: "#F44336",
          warning: "#FF9800",
        },
        // Edge colors (for flowsheet)
        edge: {
          feed: "#2196F3",
          process: "#4CAF50",
          product: "#4CAF50",
          recycle: "#FF5722",
        },
      },
      animation: {
        "bounce-slow": "bounce 1.5s infinite",
        "fade-in": "fadeIn 200ms ease-out",
        "fade-out": "fadeOut 150ms ease-in",
        "slide-in": "slideIn 200ms ease-out",
        "slide-out": "slideOut 150ms ease-in",
        "pulse-slow": "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        skeleton: "skeleton 1.5s ease-in-out infinite",
        "step-in": "stepIn 300ms cubic-bezier(0.16, 1, 0.3, 1)",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        fadeOut: {
          "0%": { opacity: "1" },
          "100%": { opacity: "0" },
        },
        slideIn: {
          "0%": { transform: "translateY(-10px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        slideOut: {
          "0%": { transform: "translateY(0)", opacity: "1" },
          "100%": { transform: "translateY(-10px)", opacity: "0" },
        },
        skeleton: {
          "0%": { backgroundPosition: "200% 0" },
          "100%": { backgroundPosition: "-200% 0" },
        },
        stepIn: {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      transitionDuration: {
        150: "150ms",
        200: "200ms",
        300: "300ms",
      },
    },
  },
  plugins: [],
};
