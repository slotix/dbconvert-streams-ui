import type { Directive } from 'vue'

type TooltipHandlers = {
  onMouseEnter: () => void
  onMouseLeave: () => void
  onClick: () => void
}

type TooltipElement = HTMLElement & {
  _tooltip?: HTMLElement
  _tooltipHandlers?: TooltipHandlers
}

function createTooltip(text: string): HTMLElement {
  const tooltip = document.createElement('div')
  tooltip.className =
    'fixed z-50 px-2 py-1 text-xs font-medium text-white bg-gray-900 rounded shadow-sm pointer-events-none opacity-0 transition-opacity duration-200'
  tooltip.textContent = text
  return tooltip
}

function positionTooltip(tooltip: HTMLElement, el: HTMLElement) {
  const rect = el.getBoundingClientRect()
  const tooltipRect = tooltip.getBoundingClientRect()

  tooltip.style.left = `${rect.left + (rect.width - tooltipRect.width) / 2}px`
  tooltip.style.top = `${rect.top - tooltipRect.height - 5}px`
}

function cleanupTooltip(el: TooltipElement) {
  if (el._tooltipHandlers) {
    el.removeEventListener('mouseenter', el._tooltipHandlers.onMouseEnter)
    el.removeEventListener('mouseleave', el._tooltipHandlers.onMouseLeave)
    el.removeEventListener('click', el._tooltipHandlers.onClick)
    delete el._tooltipHandlers
  }

  if (el._tooltip) {
    el._tooltip.remove()
    delete el._tooltip
  }
}

function attachTooltip(el: TooltipElement, text: string) {
  const tooltip = createTooltip(text)
  document.body.appendChild(tooltip)

  const onMouseEnter = () => {
    positionTooltip(tooltip, el)
    tooltip.style.opacity = '1'
  }

  const onMouseLeave = () => {
    tooltip.style.opacity = '0'
  }

  const onClick = () => {
    tooltip.style.opacity = '0'
  }

  el.addEventListener('mouseenter', onMouseEnter)
  el.addEventListener('mouseleave', onMouseLeave)
  el.addEventListener('click', onClick)

  el._tooltip = tooltip
  el._tooltipHandlers = { onMouseEnter, onMouseLeave, onClick }
}

export const vTooltip: Directive = {
  mounted(el: TooltipElement, binding) {
    if (!binding.value) return
    attachTooltip(el, binding.value)
  },

  updated(el: TooltipElement, binding) {
    if (!binding.value) {
      cleanupTooltip(el)
      return
    }

    if (!el._tooltip) {
      attachTooltip(el, binding.value)
    }

    if (el._tooltip) {
      el._tooltip.textContent = binding.value
    }
  },

  unmounted(el: TooltipElement) {
    cleanupTooltip(el)
  }
}
