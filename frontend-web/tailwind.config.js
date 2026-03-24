/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#10B981",
        "primary-dark": "#059669",
        danger: "#EF4444",
        warning: "#F59E0B",
        "bg-light": "#F6F8F7",
        "bg-dark": "#0F1A14",
        "surface-light": "#FFFFFF",
        "surface-dark": "#1A2E23",
        "text-primary": "#102219",
        "text-secondary": "#4A705E",
        "pastel-green": "#E6F9F0",
        "pastel-red": "#FEF2F2",
        "pastel-yellow": "#FFFBEB",
        "pastel-blue": "#EFF5FD",
      },
      fontFamily: {
        display: ["Plus Jakarta Sans", "sans-serif"],
      },
      borderRadius: {
        DEFAULT: "0.5rem",
        lg: "1rem",
        xl: "1.5rem",
        "2xl": "2rem",
      },
    },
  },
  plugins: [],
};
