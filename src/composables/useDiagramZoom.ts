import { ref } from 'vue'
import type { Selection } from 'd3-selection'
import { zoom as createZoom, zoomIdentity } from 'd3-zoom'
import type { D3ZoomEvent, ZoomBehavior, ZoomTransform } from 'd3-zoom'
import 'd3-transition'

export interface DiagramZoomOptions {
  minZoom?: number
  maxZoom?: number
  initialZoom?: number
}

export function useDiagramZoom(options: DiagramZoomOptions = {}) {
  const { minZoom = 0.2, maxZoom = 3, initialZoom = 1 } = options

  const currentZoom = ref(initialZoom)
  let zoom: ZoomBehavior<SVGSVGElement, unknown> | null = null
  let svg: Selection<SVGSVGElement, unknown, null, undefined> | null = null
  let initialTransform: ZoomTransform | null = null

  /**
   * Initialize zoom behavior for the SVG
   */
  function initializeZoom(
    svgElement: Selection<SVGSVGElement, unknown, null, undefined>,
    zoomGroupSelector: string = 'g.zoom-group'
  ) {
    svg = svgElement

    zoom = createZoom<SVGSVGElement, unknown>()
      .scaleExtent([minZoom, maxZoom])
      .on('zoom', (event: D3ZoomEvent<SVGSVGElement, unknown>) => {
        currentZoom.value = event.transform.k
        svg?.select(zoomGroupSelector).attr('transform', event.transform.toString())
      })

    svg.call(zoom)
    return zoom
  }

  /**
   * Handle zoom in/out
   */
  function handleZoom(direction: 'in' | 'out') {
    if (!svg || !zoom) return

    const factor = direction === 'in' ? 1.2 : 0.8
    const newZoom = Math.max(minZoom, Math.min(maxZoom, currentZoom.value * factor))

    svg.transition().duration(300).call(zoom.scaleTo, newZoom)
  }

  /**
   * Set initial transform for reset functionality
   */
  function setInitialTransform() {
    initialTransform = zoomIdentity.scale(initialZoom)
  }

  /**
   * Reset view to original position and zoom
   */
  function resetView() {
    if (svg && zoom && initialTransform) {
      svg.transition().duration(750).call(zoom.transform, initialTransform)
    }
  }

  function fitToBounds(
    bounds: { minX: number; minY: number; maxX: number; maxY: number },
    viewportWidth: number,
    viewportHeight: number,
    padding: number = 120,
    duration: number = 550
  ) {
    if (!svg || !zoom) return

    const width = Math.max(1, viewportWidth)
    const height = Math.max(1, viewportHeight)
    const paddedWidth = Math.max(1, width - padding * 2)
    const paddedHeight = Math.max(1, height - padding * 2)

    const boundsWidth = Math.max(1, bounds.maxX - bounds.minX)
    const boundsHeight = Math.max(1, bounds.maxY - bounds.minY)

    const scale = Math.max(
      minZoom,
      Math.min(maxZoom, Math.min(paddedWidth / boundsWidth, paddedHeight / boundsHeight))
    )

    const cx = (bounds.minX + bounds.maxX) / 2
    const cy = (bounds.minY + bounds.maxY) / 2
    const transform = zoomIdentity
      .translate(width / 2 - scale * cx, height / 2 - scale * cy)
      .scale(scale)

    svg.transition().duration(duration).call(zoom.transform, transform)
  }

  /**
   * Programmatically set zoom level
   */
  function setZoom(level: number) {
    if (!svg || !zoom) return

    const clampedLevel = Math.max(minZoom, Math.min(maxZoom, level))
    svg.transition().duration(300).call(zoom.scaleTo, clampedLevel)
  }

  return {
    // State
    currentZoom,
    minZoom,
    maxZoom,

    // Methods
    initializeZoom,
    handleZoom,
    setInitialTransform,
    resetView,
    fitToBounds,
    setZoom,

    // Access to D3 zoom behavior if needed
    getZoomBehavior: () => zoom
  }
}
