/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        dark: {
          bg: '#0B0F19',
          card: 'rgba(17, 24, 39, 0.75)',
          border: 'rgba(255, 255, 255, 0.08)',
          hover: 'rgba(255, 255, 255, 0.05)',
        },
        brand: {
          primary: '#00F0FF',
          secondary: '#7000FF',
          accent: '#00FF85',
          warning: '#FFB800',
          danger: '#FF3366',
        }
      },
      backdropBlur: {
        xs: '2px',
      }
    },
  },
  plugins: [],
}
