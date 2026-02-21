import { ref, onUnmounted } from 'vue'
import { usePersistedBoolean, usePersistedNumber } from './usePersistedState'

const MIN_PCT = 15
const MAX_PCT = 65
const DEFAULT_PCT = 25

export function useSidebar() {
  const sidebarVisible = usePersistedBoolean('explorer.sidebarVisible', true)
  const sidebarWidthPct = usePersistedNumber('explorer.sidebarWidthPct', DEFAULT_PCT)
  const lastSidebarWidthPct = usePersistedNumber('explorer.lastSidebarWidthPct', DEFAULT_PCT)

  const isSidebarResizing = ref(false)
  const sidebarContainerRef = ref<HTMLElement | null>(null)
  const sidebarRef = ref<HTMLElement | null>(null)

  let sbStartX = 0
  let sbStartLeftWidth = 0
  let sbContainerWidth = 0
  let prevBodySelect: string | null = null

  function clamp(n: number, min: number, max: number) {
    return Math.max(min, Math.min(max, n))
  }

  function onSidebarDividerMouseDown(e: MouseEvent) {
    if (!sidebarContainerRef.value || !sidebarRef.value) return
    isSidebarResizing.value = true
    sbStartX = e.clientX
    const leftRect = sidebarRef.value.getBoundingClientRect()
    const contRect = sidebarContainerRef.value.getBoundingClientRect()
    sbStartLeftWidth = leftRect.width
    sbContainerWidth = contRect.width
    window.addEventListener('mousemove', onSidebarDividerMouseMove)
    window.addEventListener('mouseup', onSidebarDividerMouseUp, { once: true })
    prevBodySelect = document.body.style.userSelect
    document.body.style.userSelect = 'none'
  }

  function onSidebarDividerMouseMove(e: MouseEvent) {
    if (!isSidebarResizing.value || !sbContainerWidth) return
    const dx = e.clientX - sbStartX
    const pct = ((sbStartLeftWidth + dx) / sbContainerWidth) * 100
    sidebarWidthPct.value = clamp(pct, MIN_PCT, MAX_PCT)
  }

  function onSidebarDividerMouseUp() {
    isSidebarResizing.value = false
    document.body.style.userSelect = prevBodySelect || ''
    window.removeEventListener('mousemove', onSidebarDividerMouseMove)
    lastSidebarWidthPct.value = sidebarWidthPct.value
  }

  // Double-click divider or click collapsed edge: toggle visibility
  function toggleSidebar() {
    if (sidebarVisible.value) {
      lastSidebarWidthPct.value = sidebarWidthPct.value
      sidebarVisible.value = false
    } else {
      sidebarVisible.value = true
      sidebarWidthPct.value = clamp(lastSidebarWidthPct.value, MIN_PCT, MAX_PCT)
    }
  }

  onUnmounted(() => {
    window.removeEventListener('mousemove', onSidebarDividerMouseMove)
    window.removeEventListener('mouseup', onSidebarDividerMouseUp)
    if (isSidebarResizing.value) {
      document.body.style.userSelect = prevBodySelect || ''
      isSidebarResizing.value = false
    }
  })

  return {
    sidebarVisible,
    sidebarWidthPct,
    lastSidebarWidthPct,
    isSidebarResizing,
    sidebarContainerRef,
    sidebarRef,
    onSidebarDividerMouseDown,
    toggleSidebar,
    onSidebarDividerDoubleClick: toggleSidebar,
  }
}
