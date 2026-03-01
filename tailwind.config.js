/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./App.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        "primary": "#e37535",
        "accent": "#4B9DA9",
        "bubble-source": "#F6F3C2",
        "bubble-target": "#91C6BC",
        "background-light": "#f8f7f6",
        "background-dark": "#211711",
        "surface-light": "#ffffff",
        "surface-dark": "#2d241e",
        "text-main": "#1b130e",
        "text-muted": "#956a50",
      },
      fontFamily: {
        "display": ["Plus Jakarta Sans", "sans-serif"]
      },
    },
  },
  plugins: [],
}

