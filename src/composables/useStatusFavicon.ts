import { computed, onUnmounted, watch } from 'vue'
import { useCommonStore } from '@/stores/common'

type StatusFaviconOptions = {
  baseTitle?: string
}

export function useStatusFavicon(options: StatusFaviconOptions = {}) {
  const commonStore = useCommonStore()
  const baseTitle = options.baseTitle ?? 'DBConvert Streams'

  const statusText = computed(() => {
    if (commonStore.isBackendConnected) {
      return 'Connected to backend'
    }
    if (commonStore.error) {
      return 'Connection to backend lost'
    }
    return 'Backend not available'
  })

  const showStatusDot = computed(
    () => !commonStore.isBackendConnected || Boolean(commonStore.error)
  )

  const createStatusFavicon = (color: string) => {
    if (typeof document === 'undefined') {
      return ''
    }
    // Create a simple colored circle favicon
    const canvas = document.createElement('canvas')
    canvas.width = 32
    canvas.height = 32
    const ctx = canvas.getContext('2d')

    if (ctx) {
      // Clear canvas
      ctx.clearRect(0, 0, 32, 32)

      // Draw background circle
      ctx.fillStyle = '#1f2937' // Dark gray background
      ctx.beginPath()
      ctx.arc(16, 16, 15, 0, 2 * Math.PI)
      ctx.fill()

      // Draw status circle
      ctx.fillStyle = color
      ctx.beginPath()
      ctx.arc(16, 16, 10, 0, 2 * Math.PI)
      ctx.fill()

      // Add a subtle border
      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.arc(16, 16, 10, 0, 2 * Math.PI)
      ctx.stroke()
    }

    return canvas.toDataURL()
  }

  const updateFavicon = (dataUrl: string) => {
    if (typeof document === 'undefined') {
      return
    }
    let link = document.querySelector("link[rel*='icon']") as HTMLLinkElement | null
    if (!link) {
      link = document.createElement('link')
      link.rel = 'icon'
      document.head.appendChild(link)
    }
    link.href = dataUrl
  }

  const updateBrowserTabTitle = () => {
    if (typeof document === 'undefined') {
      return
    }
    const status = statusText.value
    const faviconColor = commonStore.isBackendConnected ? '#10b981' : '#ef4444'

    // Update tab title (no emoji prefix since we have the favicon)
    document.title = `${baseTitle} - ${status}`

    // Update favicon
    const faviconDataUrl = createStatusFavicon(faviconColor)
    if (faviconDataUrl) {
      updateFavicon(faviconDataUrl)
    }
  }

  const originalFavicon =
    typeof document !== 'undefined'
      ? (document.querySelector("link[rel*='icon']")?.getAttribute('href') ?? '/favicon.svg')
      : null

  watch(
    () => [commonStore.isBackendConnected, commonStore.error],
    () => {
      updateBrowserTabTitle()
    },
    { immediate: true }
  )

  onUnmounted(() => {
    if (typeof document === 'undefined') {
      return
    }
    document.title = baseTitle
    if (originalFavicon) {
      updateFavicon(originalFavicon)
    }
  })

  return {
    statusText,
    showStatusDot
  }
}
