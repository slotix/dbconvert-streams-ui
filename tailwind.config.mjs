/** @type {import('tailwindcss').Config} */
const config = {
  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  darkMode: 'class',
  safelist: [
    // Database icon background colors (muted, for cognitive grouping)
    // Using -100 variants for better visibility while staying subtle
    'bg-violet-100',
    'bg-cyan-100',
    'bg-emerald-100',
    'bg-rose-100',
    'bg-slate-100',
    'bg-sky-100',
    'bg-amber-100',
    'bg-purple-100',
    'bg-yellow-100',
    'bg-blue-100',
    'bg-gray-50',
    'bg-gray-100',
    // Dark mode variants for database icons
    'dark:bg-violet-900/20',
    'dark:bg-cyan-900/20',
    'dark:bg-emerald-900/20',
    'dark:bg-rose-900/20',
    'dark:bg-slate-900/20',
    'dark:bg-sky-900/20',
    'dark:bg-amber-900/20',
    'dark:bg-purple-900/20',
    'dark:bg-yellow-900/20',
    'dark:bg-blue-900/20',
    'dark:bg-gray-800',
    'dark:bg-gray-850',
    // Icon filters/tints
    'brightness-95',
    'brightness-100',
    'saturate-75',
    'saturate-90',
    'saturate-50'
  ],
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
