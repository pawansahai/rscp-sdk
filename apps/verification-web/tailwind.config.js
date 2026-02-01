/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'rscp-gold': '#FFD700',
        'rscp-gold-dark': '#DAA520',
        'rscp-silver': '#C0C0C0',
        'rscp-silver-dark': '#708090',
        'rscp-bronze': '#CD7F32',
        'rscp-bronze-dark': '#8B4513',
      },
    },
  },
  plugins: [],
}
