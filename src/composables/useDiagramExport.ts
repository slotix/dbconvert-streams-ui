import { ref } from 'vue'
import type * as d3 from 'd3'

export type ExportFormat = 'svg' | 'png' | 'pdf'

export function useDiagramExport() {
  const exportOptions = ref(false)
  const exportProgress = ref(false)
  const exportType = ref<ExportFormat>('svg')

  /**
   * Export diagram as SVG
   */
  function exportAsSVG(svg: d3.Selection<SVGSVGElement, unknown, null, undefined>) {
    const svgCopy = svg.node()?.cloneNode(true) as SVGElement
    if (!svgCopy) return

    // Set white background
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
    rect.setAttribute('width', '100%')
    rect.setAttribute('height', '100%')
    rect.setAttribute('fill', 'white')
    svgCopy.insertBefore(rect, svgCopy.firstChild)

    // Get SVG content
    const svgData = new XMLSerializer().serializeToString(svgCopy)
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' })

    // Download SVG file
    const url = URL.createObjectURL(svgBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'database-diagram.svg'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  /**
   * Export diagram as PNG using html2canvas
   */
  async function exportAsPNG(container: HTMLElement) {
    exportProgress.value = true

    try {
      const html2canvasModule = await import('html2canvas')
      const html2canvas = html2canvasModule.default

      const canvas = await html2canvas(container, {
        allowTaint: true,
        useCORS: true,
        backgroundColor: 'white',
        scale: 2 // Higher quality
      })

      // Convert to data URL
      const dataUrl = canvas.toDataURL('image/png')

      // Create download link
      const link = document.createElement('a')
      link.download = 'database-diagram.png'
      link.href = dataUrl
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (error) {
      console.error('Error exporting as PNG:', error)
      alert('Failed to export as PNG. Please try SVG format instead.')
    } finally {
      exportProgress.value = false
    }
  }

  /**
   * Export diagram as PDF using html2canvas and jsPDF
   */
  async function exportAsPDF(container: HTMLElement) {
    exportProgress.value = true

    try {
      const html2canvasModule = await import('html2canvas')
      const html2canvas = html2canvasModule.default

      const canvas = await html2canvas(container, {
        allowTaint: true,
        useCORS: true,
        backgroundColor: 'white',
        scale: 2 // Higher quality
      })

      const jsPDFModule = await import('jspdf')
      const jsPDF = jsPDFModule.default

      // Get dimensions
      const imgWidth = canvas.width
      const imgHeight = canvas.height

      // Determine orientation
      const orientation = imgWidth > imgHeight ? 'landscape' : 'portrait'

      // Create PDF document with proper size
      const pdf = new jsPDF({
        orientation: orientation,
        unit: 'px',
        format: [imgWidth, imgHeight]
      })

      // Add image to PDF
      const imgData = canvas.toDataURL('image/png')
      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight)

      // Save PDF
      pdf.save('database-diagram.pdf')
    } catch (error) {
      console.error('Error exporting as PDF:', error)
      alert('Failed to export as PDF. Please try SVG format instead.')
    } finally {
      exportProgress.value = false
    }
  }

  /**
   * Main export function that delegates to appropriate format handler
   */
  async function saveDiagram(
    svg: d3.Selection<SVGSVGElement, unknown, null, undefined> | null,
    container: HTMLElement | null
  ) {
    if (!svg || !container) return

    exportProgress.value = true

    try {
      // Use timeout to allow UI to update before processing
      await new Promise((resolve) => setTimeout(resolve, 100))

      if (exportType.value === 'svg') {
        exportAsSVG(svg)
        exportProgress.value = false
      } else if (exportType.value === 'png') {
        await exportAsPNG(container)
      } else if (exportType.value === 'pdf') {
        await exportAsPDF(container)
      }

      exportOptions.value = false
    } catch (error) {
      console.error('Error exporting diagram:', error)
      exportProgress.value = false
    }
  }

  /**
   * Toggle export options panel
   */
  function toggleExportOptions() {
    exportOptions.value = !exportOptions.value
  }

  return {
    // State
    exportOptions,
    exportProgress,
    exportType,

    // Methods
    saveDiagram,
    toggleExportOptions,
    exportAsSVG,
    exportAsPNG,
    exportAsPDF
  }
}
