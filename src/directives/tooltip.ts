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

function getPopupPositionDivisor(el: HTMLElement, rect: DOMRect): number {
  const zoom =
    parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--app-zoom')) || 1

  const offsetWidth = el.offsetWidth
  if (offsetWidth > 0 && rect.width > 0) {
    const measured = rect.width / offsetWidth
    if (Number.isFinite(measured) && measured > 0 && Math.abs(measured - 1) > 0.01) {
      return measured
    }
  }

  return zoom < 1 ? zoom : 1
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
  const divisor = getPopupPositionDivisor(el, rect)
  const viewportWidth = window.innerWidth * divisor
  const viewportHeight = window.innerHeight * divisor

  let left = rect.left + (rect.width - tooltipRect.width) / 2
  let top = rect.top - tooltipRect.height - 5

  if (left + tooltipRect.width > viewportWidth) left = viewportWidth - tooltipRect.width
  if (left < 0) left = 0
  if (top + tooltipRect.height > viewportHeight) top = viewportHeight - tooltipRect.height
  if (top < 0) top = 0

  tooltip.style.left = `${left / divisor}px`
  tooltip.style.top = `${top / divisor}px`
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
