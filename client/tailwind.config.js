/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        brand: "#7c3aed",
      },
      boxShadow: {
        glass: "0 8px 30px rgba(0,0,0,0.15)",
      },
    },
  },
  plugins: [],
};
