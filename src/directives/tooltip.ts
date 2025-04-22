import type { Directive } from 'vue'

function createTooltip(text: string): HTMLElement {
  const tooltip = document.createElement('div')
  tooltip.className = 'fixed z-50 px-2 py-1 text-xs font-medium text-white bg-gray-900 rounded shadow-sm pointer-events-none opacity-0 transition-opacity duration-200'
  tooltip.textContent = text
  return tooltip
}

function positionTooltip(tooltip: HTMLElement, el: HTMLElement) {
  const rect = el.getBoundingClientRect()
  const tooltipRect = tooltip.getBoundingClientRect()

  tooltip.style.left = `${rect.left + (rect.width - tooltipRect.width) / 2}px`
  tooltip.style.top = `${rect.top - tooltipRect.height - 5}px`
}

export const vTooltip: Directive = {
  mounted(el, binding) {
    if (!binding.value) return

    const tooltip = createTooltip(binding.value)
    document.body.appendChild(tooltip)

    el.addEventListener('mouseenter', () => {
      positionTooltip(tooltip, el)
      tooltip.style.opacity = '1'
    })

    el.addEventListener('mouseleave', () => {
      tooltip.style.opacity = '0'
    })

    el.addEventListener('click', () => {
      tooltip.style.opacity = '0'
    })

    // Store tooltip reference for cleanup
    el._tooltip = tooltip
  },

  updated(el, binding) {
    if (el._tooltip) {
      el._tooltip.textContent = binding.value
    }
  },

  unmounted(el) {
    if (el._tooltip) {
      el._tooltip.remove()
      delete el._tooltip
    }
  }
}
