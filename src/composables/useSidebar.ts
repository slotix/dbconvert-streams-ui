import { ref, onUnmounted } from 'vue'
import { usePersistedBoolean, usePersistedNumber } from './usePersistedState'

export function useSidebar() {
  // Sidebar visibility + resizer state (persisted)
  const sidebarVisible = usePersistedBoolean('explorer.sidebarVisible', true)
  const sidebarWidthPct = usePersistedNumber('explorer.sidebarWidthPct', 25)
  const lastSidebarWidthPct = usePersistedNumber('explorer.lastSidebarWidthPct', 25)

  // Non-persisted UI state
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

  function onSidebarDividerDoubleClick() {
    // Reset sidebar width to default 25% (auto-persisted by usePersistedNumber)
    sidebarWidthPct.value = 25
    lastSidebarWidthPct.value = 25
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
    const newLeft = sbStartLeftWidth + dx
    const pct = Math.max(15, Math.min(50, (newLeft / sbContainerWidth) * 100))
    sidebarWidthPct.value = pct
  }

  function onSidebarDividerMouseUp() {
    isSidebarResizing.value = false
    document.body.style.userSelect = prevBodySelect || ''
    window.removeEventListener('mousemove', onSidebarDividerMouseMove)
    // Auto-persisted by usePersistedNumber watcher
    lastSidebarWidthPct.value = sidebarWidthPct.value
  }

  function toggleSidebar() {
    if (sidebarVisible.value) {
      // Hide and remember width (auto-persisted)
      lastSidebarWidthPct.value = sidebarWidthPct.value
      sidebarVisible.value = false
    } else {
      // Show and restore last width (auto-persisted)
      sidebarVisible.value = true
      sidebarWidthPct.value = clamp(lastSidebarWidthPct.value, 15, 50)
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
    // State
    sidebarVisible,
    sidebarWidthPct,
    lastSidebarWidthPct,
    isSidebarResizing,
    sidebarContainerRef,
    sidebarRef,

    // Methods
    onSidebarDividerDoubleClick,
    onSidebarDividerMouseDown,
    toggleSidebar
  }
}
