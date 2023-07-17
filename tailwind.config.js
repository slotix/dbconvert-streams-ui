/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      padding: {
        '0.2': '0.2rem',
        '0.3': '0.3rem',
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
}

