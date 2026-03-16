import type { Selection } from 'd3-selection'

function readCssVar(varName: string, fallback: string): string {
  if (typeof window === 'undefined' || typeof document === 'undefined') return fallback
  const value = getComputedStyle(document.documentElement).getPropertyValue(varName).trim()
  return value || fallback
}

/**
 * Brand colors for the diagram (matches the main component colors)
 */
export const BRAND_COLORS = {
  primary: '#3894DC', // Blue accent for consistent theme
  secondary: '#DC6B6B', // Muted red for FK accents
  gray: '#9ca3af', // Neutral gray for elements
  grayLight: '#e5e7eb', // Light neutral gray for backgrounds
  grayDark: '#374151', // Dark neutral gray for text
  background: '#f9fafb', // Very light neutral gray for backgrounds
  white: '#FFFFFF',
  highlight: {
    blue: '#dbeafe', // Light blue highlight
    red: '#FEE2E2' // Light red highlight (FK relations)
  },
  // Dark theme colors
  dark: {
    background: '#1f2937', // Dark neutral background
    cardBg: '#374151', // Card background
    border: '#4b5563', // Border color
    text: '#e5e7eb', // Light text
    textMuted: '#9ca3af', // Muted text
    tableBg: '#1f2937', // Table background
    tableHeader: '#4b5563', // Table header
    viewBg: '#1f2937', // View background
    viewHeader: '#4b5563', // View header
    gridLine: '#374151' // Grid line
  }
} as const

/**
 * Creates theme-aware diagram colors based on dark mode state
 */
export function getDiagramColors(isDark: boolean) {
  const gray50 = readCssVar('--color-gray-50', '#f9fafb')
  const gray100 = readCssVar('--color-gray-100', '#f3f4f6')
  const gray200 = readCssVar('--color-gray-200', '#e5e7eb')
  const gray300 = readCssVar('--color-gray-300', '#d1d5db')
  const gray400 = readCssVar('--color-gray-400', '#9ca3af')
  const gray500 = readCssVar('--color-gray-500', '#6b7280')
  const gray600 = readCssVar('--color-gray-600', '#4b5563')
  const gray700 = readCssVar('--color-gray-700', '#374151')
  const gray800 = readCssVar('--color-gray-800', '#1f2937')
  const gray850 = readCssVar('--color-gray-850', '#1e1e1e')
  const gray900 = readCssVar('--color-gray-900', '#111827')
  const gray950 = readCssVar('--color-gray-950', '#0b0f19')

  return {
    gridLine: isDark ? gray800 : gray200,
    gridLineMajor: isDark ? gray700 : gray300,
    tableBg: isDark ? gray850 : '#ffffff',
    viewBg: isDark ? gray850 : '#ffffff',
    tableBorder: isDark ? gray700 : gray200,
    viewBorder: isDark ? gray600 : gray300,
    tableHeader: isDark ? gray800 : gray50,
    viewHeader: isDark ? gray800 : gray50,
    headerText: isDark ? gray100 : gray900,
    columnText: isDark ? gray200 : gray700,
    alternateRowBg: isDark ? gray800 : gray100,
    tooltipBg: isDark ? gray950 : gray900,
    noDataText: isDark ? gray400 : gray500,
    // Selection highlight colors
    selectedHeaderBg: isDark ? '#1e3a5f' : '#dbeafe', // Blue dark / Blue-100
    selectedBodyBg: isDark ? '#172d4d' : '#eff6ff', // Blue darker / Blue-50
    selectedBorder: isDark ? '#3894DC' : '#2264AF', // Blue accent / Blue dark
    relatedHeaderBg: isDark ? '#4a2020' : '#FEE2E2', // Red dark / Red-100
    relatedBodyBg: isDark ? '#3b1a1a' : '#FEF2F2', // Red darker / Red-50
    relatedBorder: isDark ? '#DC6B6B' : '#B45454' // Red accent / Red dark
  }
}

/**
 * Marker configuration for relationship lines
 */
interface MarkerConfig {
  id: string
  viewBox: string
  refX: number
  refY: number
  markerWidth: number
  markerHeight: number
  path: string
  strokeWidth: string
  fill?: string
}

/**
 * Base marker definitions (color-agnostic)
 */
const MARKER_DEFINITIONS: Record<string, Omit<MarkerConfig, 'id'>> = {
  'mandatory-one': {
    viewBox: '-10 -10 20 20',
    refX: 10,
    refY: 0,
    markerWidth: 12,
    markerHeight: 12,
    path: 'M-8,-8L-8,8',
    strokeWidth: '2'
  },
  'mandatory-many': {
    viewBox: '-10 -10 20 20',
    refX: 8,
    refY: 0,
    markerWidth: 10,
    markerHeight: 10,
    path: 'M-8,0L0,-7M-8,0L0,7M-8,-7L-8,7',
    strokeWidth: '1.5',
    fill: 'none'
  },
  'mandatory-one-to-one': {
    viewBox: '-10 -10 20 20',
    refX: 10,
    refY: 0,
    markerWidth: 10,
    markerHeight: 10,
    path: 'M-9,-7L-9,7M-5,-7L-5,7',
    strokeWidth: '1.5'
  },
  'optional-one': {
    viewBox: '-10 -10 20 20',
    refX: 10,
    refY: 0,
    markerWidth: 10,
    markerHeight: 10,
    path: 'M-8,0 A3,3 0 1 1 -8,0.01M-8,4L-8,-4',
    strokeWidth: '1.5',
    fill: 'none'
  },
  'optional-many': {
    viewBox: '-10 -10 20 20',
    refX: 8,
    refY: 0,
    markerWidth: 10,
    markerHeight: 10,
    path: 'M-8,0 A3,3 0 1 1 -8,0.01M-8,0L0,-7M-8,0L0,7M-8,-7L-8,7',
    strokeWidth: '1.5',
    fill: 'none'
  }
}

/**
 * Color variants for markers
 */
const MARKER_VARIANTS = {
  primary: {
    prefix: '',
    color: BRAND_COLORS.primary
  },
  junction: {
    prefix: 'junction-',
    color: BRAND_COLORS.secondary
  }
} as const

type MarkerVariant = keyof typeof MARKER_VARIANTS

/**
 * Creates all marker definitions on the given SVG defs element
 *
 * @param defs - D3 selection of the SVG defs element
 * @param variants - Which variants to create (defaults to all)
 */
export function createMarkerDefinitions(
  defs: Selection<SVGDefsElement, unknown, null, undefined>,
  variants: MarkerVariant[] = ['primary', 'junction']
): void {
  variants.forEach((variant) => {
    const { prefix, color } = MARKER_VARIANTS[variant]

    Object.entries(MARKER_DEFINITIONS).forEach(([name, config]) => {
      const markerId = `${prefix}${name}`

      const marker = defs
        .append('marker')
        .attr('id', markerId)
        .attr('viewBox', config.viewBox)
        .attr('refX', config.refX)
        .attr('refY', config.refY)
        .attr('markerWidth', config.markerWidth)
        .attr('markerHeight', config.markerHeight)
        .attr('orient', 'auto-start-reverse')

      const path = marker
        .append('path')
        .attr('d', config.path)
        .attr('stroke', color)
        .attr('stroke-width', config.strokeWidth)

      if (config.fill) {
        path.attr('fill', config.fill)
      }
    })
  })
}
