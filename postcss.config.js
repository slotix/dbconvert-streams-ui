import tailwindcss from '@tailwindcss/postcss'
import autoprefixer from 'autoprefixer'
import fixSelection from './postcss-fix-selection.js'

export default {
  plugins: [tailwindcss(), fixSelection(), autoprefixer()]
}
