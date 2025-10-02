import { ref, onUnmounted } from 'vue'

export function useSidebar() {
  // Sidebar visibility + resizer state
  const sidebarVisible = ref<boolean>(true)
  const sidebarWidthPct = ref(25) // percentage width for left sidebar
  const lastSidebarWidthPct = ref<number>(25)
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
    // Reset sidebar width to default 25%
    sidebarWidthPct.value = 25
    try {
      localStorage.setItem('explorer.sidebarWidthPct', '25')
      localStorage.setItem('explorer.lastSidebarWidthPct', '25')
    } catch {
      /* ignore */
    }
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
    // persist current width
    try {
      localStorage.setItem('explorer.sidebarWidthPct', String(Math.round(sidebarWidthPct.value)))
    } catch {
      /* ignore persistence errors */
    }
    lastSidebarWidthPct.value = sidebarWidthPct.value
  }

  function toggleSidebar() {
    if (sidebarVisible.value) {
      // hide and remember width
      lastSidebarWidthPct.value = sidebarWidthPct.value
      sidebarVisible.value = false
      try {
        localStorage.setItem('explorer.sidebarVisible', 'false')
        localStorage.setItem(
          'explorer.lastSidebarWidthPct',
          String(Math.round(lastSidebarWidthPct.value))
        )
        localStorage.setItem('explorer.sidebarWidthPct', String(Math.round(sidebarWidthPct.value)))
      } catch {
        /* ignore persistence errors */
      }
    } else {
      // show and restore last width
      sidebarVisible.value = true
      try {
        const stored = Number(
          localStorage.getItem('explorer.lastSidebarWidthPct') || lastSidebarWidthPct.value
        )
        sidebarWidthPct.value = clamp(isNaN(stored) ? 25 : stored, 15, 50)
        localStorage.setItem('explorer.sidebarVisible', 'true')
      } catch {
        /* ignore persistence errors */
      }
    }
  }

  function initializeSidebar() {
    try {
      const storedVisible = localStorage.getItem('explorer.sidebarVisible')
      if (storedVisible !== null) sidebarVisible.value = storedVisible === 'true'
      const storedPct = Number(localStorage.getItem('explorer.sidebarWidthPct') || '')
      if (!isNaN(storedPct)) sidebarWidthPct.value = clamp(storedPct, 15, 50)
      const storedLast = Number(localStorage.getItem('explorer.lastSidebarWidthPct') || '')
      if (!isNaN(storedLast)) lastSidebarWidthPct.value = clamp(storedLast, 15, 50)
    } catch {
      /* ignore persistence errors */
    }
  }

  onUnmounted(() => {
    window.removeEventListener('mousemove', onSidebarDividerMouseMove)
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
    toggleSidebar,
    initializeSidebar
  }
}
