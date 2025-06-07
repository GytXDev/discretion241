/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        primary: "#4B0082",
      },
      keyframes: {
        'float-up': {
          '0%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
          '100%': { transform: 'translateY(-12px)', opacity: '0.9' },
        },
        'fade-in': {
          '0%': { opacity: '0.3', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
      animation: {
        'bounce-slow': 'bounce 3s infinite ease-in-out',
        'float-up': 'float-up 2.2s ease-in-out infinite',
        'fadeIn': 'fade-in 1s ease-in-out forwards',
      },
    },
  },
  plugins: [],
};