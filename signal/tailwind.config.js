/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        signal: {
          purple: "#7C6FE0",
          coral: "#E07A5F",
          green: "#4ADE80",
          dark: "#0F0F12",
          card: "#18181B",
          border: "#27272A",
        }
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      }
    },
  },
  plugins: [],
}
