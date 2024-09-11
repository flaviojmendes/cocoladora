/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    colors: {
      'primary': '#815028',
      'primary-dark': '#693a20',
      'primary-light': '#a95d2f',
      'secondary': '#292420',
      'secondary-light': '#413831',
      'background': '#fcf9ea',
      
      
    },
    extend: {
      fontFamily: {
        'primary': ['"Chicle"', 'sans-serif'],
        'secondary': ['"Boogaloo"', 'sans-serif'],
      },
    },
  },
  plugins: [],
}