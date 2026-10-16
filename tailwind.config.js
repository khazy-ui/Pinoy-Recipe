/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./app/**/*.{js,jsx,ts,tsx}', './components/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        cream: '#d2a36e',
        bark: '#fff1e3',
        clay: '#ab855d',
        amber: '#D97706',
        sand: '#f8e9d4',
      },
    },
  },
  plugins: [],
};