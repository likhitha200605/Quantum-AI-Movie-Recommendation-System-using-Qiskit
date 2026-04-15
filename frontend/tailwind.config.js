/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: ["./pages/**/*.{js,jsx}", "./components/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        primary: "#7c3aed",
      },
    },
  },
  plugins: [],
};
