import { ref } from 'vue'
import * as d3 from 'd3'

export interface DiagramZoomOptions {
  minZoom?: number
  maxZoom?: number
  initialZoom?: number
}

export function useDiagramZoom(options: DiagramZoomOptions = {}) {
  const { minZoom = 0.2, maxZoom = 3, initialZoom = 1 } = options

  const currentZoom = ref(initialZoom)
  let zoom: d3.ZoomBehavior<SVGSVGElement, unknown> | null = null
  let svg: d3.Selection<SVGSVGElement, unknown, null, undefined> | null = null
  let initialTransform: d3.ZoomTransform | null = null

  /**
   * Initialize zoom behavior for the SVG
   */
  function initializeZoom(
    svgElement: d3.Selection<SVGSVGElement, unknown, null, undefined>,
    zoomGroupSelector: string = 'g.zoom-group'
  ) {
    svg = svgElement

    zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([minZoom, maxZoom])
      .on('zoom', (event: d3.D3ZoomEvent<SVGSVGElement, unknown>) => {
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
  function setInitialTransform(width: number, height: number) {
    initialTransform = d3.zoomIdentity.translate(width / 2, height / 2).scale(initialZoom)
  }

  /**
   * Reset view to original position and zoom
   */
  function resetView() {
    if (svg && zoom && initialTransform) {
      svg.transition().duration(750).call(zoom.transform, initialTransform)
    }
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
    setZoom,

    // Access to D3 zoom behavior if needed
    getZoomBehavior: () => zoom
  }
}
