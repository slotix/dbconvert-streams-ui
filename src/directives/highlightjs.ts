import hljs from 'highlight.js/lib/core'
import type { Directive } from 'vue'

// Modern highlight.js directive using highlightElement (not deprecated highlightBlock)
export const vHighlightjs: Directive = {
  mounted(el: HTMLElement) {
    // Find all code elements within the directive element
    const codeElements = el.querySelectorAll('code')
    codeElements.forEach((codeEl) => {
      // Use the modern highlightElement API instead of deprecated highlightBlock
      hljs.highlightElement(codeEl as HTMLElement)
    })
  },
  updated(el: HTMLElement) {
    // Re-highlight when content changes
    const codeElements = el.querySelectorAll('code')
    codeElements.forEach((codeEl) => {
      // Clear existing highlighting first
      codeEl.removeAttribute('data-highlighted')
      // Use the modern highlightElement API
      hljs.highlightElement(codeEl as HTMLElement)
    })
  }
} 