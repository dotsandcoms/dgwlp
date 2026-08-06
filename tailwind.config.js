/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        olive: { DEFAULT: "#556B2F", dark: "#3f5122", soft: "#eef1e8" },
        ink: "#1a1a1a",
      },
    },
  },
  plugins: [],
};
