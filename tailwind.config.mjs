/** @type {import('tailwindcss').Config} */
const config = {
  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        warm: {
          50: '#F9F6F2',
          100: '#F5F0EA',
          200: '#EBE3D5'
        }
      }
    }
  },
  plugins: []
}

export default config
