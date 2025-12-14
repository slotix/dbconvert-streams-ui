import type * as d3 from 'd3'

/**
 * Brand colors for the diagram (matches the main component colors)
 */
export const BRAND_COLORS = {
  primary: '#00B2D6', // Teal/Cyan blue (from logo)
  secondary: '#F26627', // Orange (from logo)
  gray: '#94A3B8', // Slate gray for neutral elements
  grayLight: '#E2E8F0', // Light gray for backgrounds
  grayDark: '#334155', // Dark gray for text
  background: '#F8FAFC', // Very light gray for backgrounds
  white: '#FFFFFF',
  highlight: {
    blue: '#DBEAFE', // Light blue highlight
    orange: '#FFEDD5' // Light orange highlight
  }
} as const

/**
 * Marker configuration for relationship lines
 */
export interface MarkerConfig {
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
export const MARKER_DEFINITIONS: Record<string, Omit<MarkerConfig, 'id'>> = {
  'mandatory-one': {
    viewBox: '-10 -10 20 20',
    refX: 10,
    refY: 0,
    markerWidth: 12,
    markerHeight: 12,
    path: 'M-8,-8L-8,8',
    strokeWidth: '2.5'
  },
  'mandatory-many': {
    viewBox: '-10 -10 20 20',
    refX: 8,
    refY: 0,
    markerWidth: 10,
    markerHeight: 10,
    path: 'M-8,0L0,-7M-8,0L0,7M-8,-7L-8,7',
    strokeWidth: '2',
    fill: 'none'
  },
  'mandatory-one-to-one': {
    viewBox: '-10 -10 20 20',
    refX: 10,
    refY: 0,
    markerWidth: 10,
    markerHeight: 10,
    path: 'M-9,-7L-9,7M-5,-7L-5,7',
    strokeWidth: '2'
  },
  'optional-one': {
    viewBox: '-10 -10 20 20',
    refX: 10,
    refY: 0,
    markerWidth: 10,
    markerHeight: 10,
    path: 'M-8,0 A3,3 0 1 1 -8,0.01M-8,4L-8,-4',
    strokeWidth: '2',
    fill: 'none'
  },
  'optional-many': {
    viewBox: '-10 -10 20 20',
    refX: 8,
    refY: 0,
    markerWidth: 10,
    markerHeight: 10,
    path: 'M-8,0 A3,3 0 1 1 -8,0.01M-8,0L0,-7M-8,0L0,7M-8,-7L-8,7',
    strokeWidth: '2',
    fill: 'none'
  }
}

/**
 * Color variants for markers
 */
export const MARKER_VARIANTS = {
  primary: {
    prefix: '',
    color: BRAND_COLORS.primary
  },
  junction: {
    prefix: 'junction-',
    color: BRAND_COLORS.secondary
  }
} as const

export type MarkerVariant = keyof typeof MARKER_VARIANTS

/**
 * Creates all marker definitions on the given SVG defs element
 *
 * @param defs - D3 selection of the SVG defs element
 * @param variants - Which variants to create (defaults to all)
 */
export function createMarkerDefinitions(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  defs: d3.Selection<SVGDefsElement, unknown, null, undefined>,
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
        .attr('orient', 'auto')

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

/**
 * Get marker ID for a relationship
 *
 * @param type - Marker type (mandatory-one, mandatory-many, etc.)
 * @param variant - Color variant
 * @returns Marker ID string for use in marker-end/marker-start attributes
 */
export function getMarkerId(
  type: keyof typeof MARKER_DEFINITIONS,
  variant: MarkerVariant = 'primary'
): string {
  const { prefix } = MARKER_VARIANTS[variant]
  return `url(#${prefix}${type})`
}

/**
 * Diagram layout constants
 */
export const DIAGRAM_LAYOUT = {
  nodeWidth: 200,
  nodeMinHeight: 50,
  nodePadding: 20,
  fieldHeight: 24,
  headerHeight: 32,
  cornerRadius: 8,
  linkStrokeWidth: 2,
  linkStrokeWidthHover: 3
} as const

/**
 * Tooltip styling constants
 */
export const TOOLTIP_STYLE = {
  padding: 8,
  borderRadius: 6,
  fontSize: 12,
  lineHeight: 16,
  backgroundColor: {
    light: 'rgba(255, 255, 255, 0.95)',
    dark: 'rgba(31, 41, 55, 0.95)'
  },
  textColor: {
    light: '#1f2937',
    dark: '#f3f4f6'
  },
  borderColor: {
    light: '#e5e7eb',
    dark: '#374151'
  }
} as const
