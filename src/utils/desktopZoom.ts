import { computed, ref } from 'vue'
import { isWailsContext } from '@/composables/useWailsEvents'
import { getStorageValue, setStorageValue, STORAGE_KEYS } from '@/constants/storageKeys'

const DEFAULT_ZOOM = 1
const ZOOM_STEP = 0.25
const MIN_ZOOM = 0.75
const MAX_ZOOM = 2

const clampZoom = (value: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value))

const normalizeZoom = (value: number) => {
  if (!Number.isFinite(value)) {
    return DEFAULT_ZOOM
  }
  return clampZoom(value)
}

const roundZoom = (value: number) => {
  const snapped = Math.round(value / ZOOM_STEP) * ZOOM_STEP
  return Math.round(snapped * 1000) / 1000
}

const zoomLevel = ref(DEFAULT_ZOOM)
const isDesktopZoom = ref(false)
let initialized = false
let root: HTMLElement | null = null

const updateRootZoom = (value: number) => {
  if (!root) {
    return
  }

  if (value === DEFAULT_ZOOM) {
    root.classList.remove('desktop-zoom')
    root.style.removeProperty('--app-zoom')
    return
  }

  root.classList.add('desktop-zoom')
  root.style.setProperty('--app-zoom', value.toString())
  // CSS zoom is applied via CSS rules in style.css based on .desktop-zoom class
  // and --app-zoom variable. This ensures both html and fixed elements are zoomed.
}

const applyZoom = (value: number) => {
  const clamped = roundZoom(clampZoom(value))
  zoomLevel.value = clamped
  updateRootZoom(clamped)
  setStorageValue(STORAGE_KEYS.DESKTOP_UI_ZOOM, clamped)
}

const initDesktopZoom = () => {
  if (initialized) {
    return
  }

  if (!isWailsContext()) {
    return
  }

  initialized = true
  isDesktopZoom.value = true
  root = document.documentElement

  const storedZoom = normalizeZoom(
    getStorageValue<number>(STORAGE_KEYS.DESKTOP_UI_ZOOM, DEFAULT_ZOOM)
  )

  applyZoom(storedZoom)

  const handleKeydown = (event: KeyboardEvent) => {
    if (!(event.ctrlKey || event.metaKey) || event.altKey) {
      return
    }

    const key = event.key
    const isZoomIn = key === '+' || key === '=' || event.code === 'NumpadAdd'
    const isZoomOut = key === '-' || key === '_' || event.code === 'NumpadSubtract'
    const isReset = key === '0' || event.code === 'Numpad0'

    if (!isZoomIn && !isZoomOut && !isReset) {
      return
    }

    event.preventDefault()
    event.stopPropagation()

    if (isReset) {
      applyZoom(DEFAULT_ZOOM)
      return
    }

    applyZoom(zoomLevel.value + (isZoomIn ? ZOOM_STEP : -ZOOM_STEP))
  }

  window.addEventListener('keydown', handleKeydown)
}

export const setupDesktopZoom = () => {
  initDesktopZoom()
}

export const useDesktopZoom = () => {
  initDesktopZoom()

  const zoomPercent = computed(() => `${Math.round(zoomLevel.value * 100)}%`)
  const canZoomIn = computed(() => zoomLevel.value < MAX_ZOOM - 0.001)
  const canZoomOut = computed(() => zoomLevel.value > MIN_ZOOM + 0.001)

  const zoomIn = () => {
    if (!isDesktopZoom.value) return
    applyZoom(zoomLevel.value + ZOOM_STEP)
  }

  const zoomOut = () => {
    if (!isDesktopZoom.value) return
    applyZoom(zoomLevel.value - ZOOM_STEP)
  }

  const resetZoom = () => {
    if (!isDesktopZoom.value) return
    applyZoom(DEFAULT_ZOOM)
  }

  const setZoom = (value: number) => {
    if (!isDesktopZoom.value) return
    applyZoom(value)
  }

  return {
    isDesktopZoom,
    zoomLevel,
    zoomPercent,
    canZoomIn,
    canZoomOut,
    zoomIn,
    zoomOut,
    resetZoom,
    setZoom
  }
}
