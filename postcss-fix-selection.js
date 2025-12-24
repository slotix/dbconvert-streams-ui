/**
 * PostCSS plugin to fix invalid :is() usage with ::selection pseudo-elements
 * Tailwind CSS v4 generates invalid CSS like ::selection:is() which violates CSS spec
 */
const plugin = (_opts = {}) => {
  return {
    postcssPlugin: 'postcss-fix-selection',
    Once(root) {
      root.walkRules((rule) => {
        // Fix ::selection:is() and ::-moz-selection:is()
        if (
          rule.selector.includes('::selection:is()') ||
          rule.selector.includes('::-moz-selection:is()')
        ) {
          // Remove the invalid :is() pseudo-class
          rule.selector = rule.selector
            .replace(/::selection:is\(\)/g, '::selection')
            .replace(/::-moz-selection:is\(\)/g, '::-moz-selection')
        }
      })
    }
  }
}

plugin.postcss = true

export default plugin
