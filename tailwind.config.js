/** @type {import('tailwindcss').Config} */
import colors from 'tailwindcss/colors'
import forms from '@tailwindcss/forms'

export default {
  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  theme: {
    extend: {
      padding: {
        0.2: '0.2rem',
        0.3: '0.3rem'
      },
      colors: {
        transparent: 'transparent',
        current: 'currentColor',
        gray: colors.neutral,
        yellow: colors.orange,
        green: colors.cyan
      }
    }
  },
  plugins: [forms]
}
