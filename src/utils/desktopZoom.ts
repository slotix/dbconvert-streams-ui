import { isWailsContext } from '@/composables/useWailsEvents'
import { getStorageValue, setStorageValue, STORAGE_KEYS } from '@/constants/storageKeys'

const DEFAULT_ZOOM = 1
const ZOOM_STEP = 0.1
const MIN_ZOOM = 0.7
const MAX_ZOOM = 1.6

const clampZoom = (value: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value))

const normalizeZoom = (value: number) => {
  if (!Number.isFinite(value)) {
    return DEFAULT_ZOOM
  }
  return clampZoom(value)
}

const roundZoom = (value: number) => Math.round(value * 100) / 100

export const setupDesktopZoom = () => {
  if (!isWailsContext()) {
    return
  }

  const root = document.documentElement

  let currentZoom = normalizeZoom(
    getStorageValue<number>(STORAGE_KEYS.DESKTOP_UI_ZOOM, DEFAULT_ZOOM)
  )

  const updateRootZoom = (value: number) => {
    if (value === DEFAULT_ZOOM) {
      root.classList.remove('desktop-zoom')
      root.style.removeProperty('--app-zoom')
      return
    }
    root.classList.add('desktop-zoom')
    root.style.setProperty('--app-zoom', value.toString())
  }

  const applyZoom = (value: number) => {
    const clamped = roundZoom(clampZoom(value))
    currentZoom = clamped
    updateRootZoom(clamped)
    setStorageValue(STORAGE_KEYS.DESKTOP_UI_ZOOM, clamped)
  }

  applyZoom(currentZoom)

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

    applyZoom(currentZoom + (isZoomIn ? ZOOM_STEP : -ZOOM_STEP))
  }

  window.addEventListener('keydown', handleKeydown)
}
