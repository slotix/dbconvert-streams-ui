<script setup lang="ts">
import { ref, onMounted, watch, onBeforeUnmount, computed } from 'vue'
import { drag } from 'd3-drag'
import type { D3DragEvent } from 'd3-drag'
import { select } from 'd3-selection'
import type { Selection } from 'd3-selection'
import type { ForceLink } from 'd3-force'
import 'd3-transition'
import { zoomTransform } from 'd3-zoom'
import type { ZoomTransform } from 'd3-zoom'
import type { Relationship, Table } from '@/types/schema'
import type { TableNode, TableLink } from '@/types/diagram'
import { useThemeStore } from '@/stores/theme'
import { BRAND_COLORS, getDiagramColors, createMarkerDefinitions } from '@/utils/d3DiagramConfig'
import {
  buildDiagramLinks,
  buildRoundedOrthogonalPath,
  formatColumnType,
  getColumnAnchorY
} from '@/utils/databaseDiagramD3'
import { useDiagramZoom } from '@/composables/useDiagramZoom'
import { useDiagramForces } from '@/composables/useDiagramForces'
import { useDiagramExport } from '@/composables/useDiagramExport'
import { useDiagramHighlighting } from '@/composables/useDiagramHighlighting'
import DiagramControls from './DiagramControls.vue'
import DiagramLegend from './DiagramLegend.vue'

const props = withDefaults(
  defineProps<{
    tables: Table[]
    relations: Relationship[]
    views: Table[]
  }>(),
  {
    tables: () => [],
    relations: () => [],
    views: () => []
  }
)

// Template refs
const svgContainer = ref<HTMLElement>()

// D3 selections (not reactive)
let svg: Selection<SVGSVGElement, unknown, null, undefined> | null = null
let zoomGroup: Selection<SVGGElement, unknown, null, undefined> | null = null
let node: Selection<SVGGElement, TableNode, SVGGElement, unknown> | null = null
let linkGroup: Selection<SVGGElement, TableLink, SVGGElement, unknown> | null = null
let linkPaths: Selection<SVGPathElement, TableLink, SVGGElement, unknown> | null = null
let gridLayer: Selection<SVGGElement, unknown, null, undefined> | null = null
let links: TableLink[] = []
let currentNodes: TableNode[] = []
let preservedZoomTransform: ZoomTransform | null = null
let resizeObserver: ResizeObserver | null = null

let nodeHeightById = new Map<string, number>()
let tableByName = new Map<string, Table>()
let viewByName = new Map<string, Table>()

const nodePositionCache = new Map<
  string,
  { x: number; y: number; vx: number; vy: number; fx?: number | null; fy?: number | null }
>()
let resizeTimer: ReturnType<typeof setTimeout> | null = null
let lastSize: { width: number; height: number } | null = null

// Theme store
const themeStore = useThemeStore()

// Composables
const zoomComposable = useDiagramZoom()
const forcesComposable = useDiagramForces()
const exportComposable = useDiagramExport()
const highlightingComposable = useDiagramHighlighting()

// Theme-aware colors
const colors = computed(() => getDiagramColors(themeStore.isDark))

// Grid size for background
const gridSize = ref(10)
const staticLayout = ref(true)
const hasUserAdjustedForces = ref(false)

// Helper functions moved to `src/utils/databaseDiagramD3.ts`

// Create background grid
function createBackgroundGrid(
  container: Selection<SVGGElement, unknown, null, undefined>,
  width: number,
  height: number
) {
  const currentGridSize = gridSize.value
  const majorGridSize = currentGridSize * 4
  const defs = container.append('defs')

  const pattern = defs
    .append('pattern')
    .attr('id', 'grid')
    .attr('width', currentGridSize)
    .attr('height', currentGridSize)
    .attr('patternUnits', 'userSpaceOnUse')

  pattern
    .append('path')
    .attr('d', `M ${currentGridSize} 0 L 0 0 0 ${currentGridSize}`)
    .attr('fill', 'none')
    .attr('stroke', colors.value.gridLine)
    .attr('stroke-width', 0.5)

  container
    .append('rect')
    .attr('width', width * 4)
    .attr('height', height * 4)
    .attr('x', -width)
    .attr('y', -height)
    .attr('fill', 'url(#grid)')
    .attr('class', 'grid-background')

  const majorGrid = container.append('g').attr('class', 'major-grid')
  const majorGridColor = colors.value.gridLineMajor
  for (let i = 0; i < (width * 4) / majorGridSize; i++) {
    majorGrid
      .append('line')
      .attr('x1', i * majorGridSize - width)
      .attr('y1', -height)
      .attr('x2', i * majorGridSize - width)
      .attr('y2', height * 3)
      .attr('stroke', majorGridColor)
      .attr('stroke-width', 0.8)
  }
  for (let i = 0; i < (height * 4) / majorGridSize; i++) {
    majorGrid
      .append('line')
      .attr('x1', -width)
      .attr('y1', i * majorGridSize - height)
      .attr('x2', width * 3)
      .attr('y2', i * majorGridSize - height)
      .attr('stroke', majorGridColor)
      .attr('stroke-width', 0.8)
  }
}

function recreateGrid(width: number, height: number) {
  if (!zoomGroup) return

  gridLayer?.remove()
  gridLayer = zoomGroup.insert('g', ':first-child').attr('class', 'grid-layer')
  createBackgroundGrid(gridLayer, width, height)
}

function applyTheme() {
  if (!zoomGroup) return

  if (gridLayer) {
    gridLayer.select('pattern#grid path').attr('stroke', colors.value.gridLine)
    gridLayer
      .selectAll<SVGLineElement, unknown>('.major-grid line')
      .attr('stroke', colors.value.gridLineMajor)
  }

  if (node) {
    node
      .selectAll<SVGRectElement, TableNode>('rect.table-background')
      .attr('fill', (d) => (d.isView ? colors.value.viewBg : colors.value.tableBg))
      .attr('stroke', (d) => (d.isView ? colors.value.viewBorder : colors.value.tableBorder))

    node
      .selectAll<SVGRectElement, TableNode>('.table-header rect')
      .attr('fill', (d) => (d.isView ? colors.value.viewHeader : colors.value.tableHeader))
      .attr('stroke', (d) => (d.isView ? colors.value.viewBorder : colors.value.tableBorder))

    node
      .selectAll<SVGTextElement, TableNode>('.table-header text')
      .attr('fill', colors.value.headerText)

    node
      .selectAll<SVGRectElement, TableNode>('rect.table-body')
      .attr('fill', (d) => (d.isView ? colors.value.viewBg : colors.value.tableBg))
      .attr('stroke', (d) => (d.isView ? colors.value.viewBorder : colors.value.tableBorder))

    node
      .selectAll<SVGTextElement, unknown>('text.column-type')
      .attr('fill', colors.value.columnText)

    node
      .selectAll<SVGRectElement, unknown>('rect.alternate-row')
      .attr('fill', colors.value.alternateRowBg)

    node.selectAll<SVGTextElement, unknown>('text.column-name').each(function () {
      const text = select(this)
      const currentFill = text.attr('fill')
      if (currentFill === BRAND_COLORS.primary || currentFill === BRAND_COLORS.secondary) return
      text.attr('fill', colors.value.columnText)
    })
  }

  zoomGroup.selectAll<SVGTextElement, unknown>('text.no-data').attr('fill', colors.value.noDataText)

  if (highlightingComposable.selectedTable.value) updateHighlighting()
}

// Create drop shadow filter
function createDropShadowFilter(defs: Selection<SVGDefsElement, unknown, null, undefined>) {
  const filter = defs.append('filter').attr('id', 'drop-shadow').attr('height', '130%')
  filter.append('feOffset').attr('dx', 0).attr('dy', 3).attr('result', 'offsetBlur')
  filter
    .append('feGaussianBlur')
    .attr('in', 'SourceAlpha')
    .attr('stdDeviation', 3)
    .attr('result', 'blur')
  filter.append('feComponentTransfer').append('feFuncA').attr('type', 'linear').attr('slope', 0.2)
  filter
    .append('feMerge')
    .selectAll('feMergeNode')
    .data(['offsetBlur', 'SourceGraphic'])
    .enter()
    .append('feMergeNode')
    .attr('in', (d: string) => d)
}

// Create table/view nodes
function createNodes(
  zoomGroup: Selection<SVGGElement, unknown, null, undefined>,
  nodes: TableNode[]
) {
  node = zoomGroup
    .append('g')
    .selectAll<SVGGElement, TableNode>('g')
    .data(nodes)
    .join('g')
    .attr('class', (d: TableNode) => (d.isView ? 'view-node' : 'table-node'))
    .call(
      drag<SVGGElement, TableNode>()
        .on('start', dragstarted)
        .on('drag', dragged)
        .on('end', dragended)
    )
    .on('click', (event: MouseEvent, d: TableNode) => {
      event.stopPropagation()
      highlightingComposable.toggleSelection(d.name)
      updateHighlighting()
    })

  // Table background
  node
    .append('rect')
    .attr('class', 'table-background')
    .attr('width', 200)
    .attr('height', (d: TableNode) => {
      const columnCount = (tableByName.get(d.name) || viewByName.get(d.name))?.columns.length || 0
      return 30 + columnCount * 20
    })
    .attr('rx', 8)
    .attr('ry', 8)
    .attr('fill', (d: TableNode) => (d.isView ? colors.value.viewBg : colors.value.tableBg))
    .attr('stroke', (d: TableNode) =>
      d.isView ? colors.value.viewBorder : colors.value.tableBorder
    )
    .attr('stroke-width', (d: TableNode) => (d.isView ? 1.5 : 1))
    .attr('stroke-dasharray', (d: TableNode) => (d.isView ? '5,2' : 'none'))
    .attr('filter', 'url(#drop-shadow)')

  // Header
  const header = node.append('g').attr('class', 'table-header')
  header
    .append('rect')
    .attr('width', 200)
    .attr('height', 30)
    .attr('rx', 8)
    .attr('ry', 8)
    .attr('fill', (d: TableNode) => (d.isView ? colors.value.viewHeader : colors.value.tableHeader))
    .attr('stroke', (d: TableNode) =>
      d.isView ? colors.value.viewBorder : colors.value.tableBorder
    )
    .attr('stroke-width', 1.5)
    .attr('stroke-dasharray', (d: TableNode) => (d.isView ? '5,2' : 'none'))
    .attr('clip-path', 'path("M0,30 L0,8 Q0,0 8,0 L192,0 Q200,0 200,8 L200,30 Z")')

  // View icon
  header
    .filter((d: TableNode) => d.isView)
    .append('foreignObject')
    .attr('width', 20)
    .attr('height', 20)
    .attr('x', 172)
    .attr('y', 5)
    .attr('class', 'view-icon').html(`
      <div xmlns="http://www.w3.org/1999/xhtml" style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5" style="color: #7e22ce;">
          <path stroke-linecap="round" stroke-linejoin="round" d="M7.5 3.75H6A2.25 2.25 0 0 0 3.75 6v1.5M16.5 3.75H18A2.25 2.25 0 0 1 20.25 6v1.5m0 9V18A2.25 2.25 0 0 1 18 20.25h-1.5m-9 0H6A2.25 2.25 0 0 1 3.75 18v-1.5M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
        </svg>
      </div>
    `)

  // Table body
  node
    .append('rect')
    .attr('class', 'table-body')
    .attr('width', 200)
    .attr('height', (d: TableNode) => {
      const columnCount = (tableByName.get(d.name) || viewByName.get(d.name))?.columns.length || 0
      return columnCount * 20
    })
    .attr('y', 30)
    .attr('fill', (d: TableNode) => (d.isView ? colors.value.viewBg : colors.value.tableBg))
    .attr('stroke', (d: TableNode) =>
      d.isView ? colors.value.viewBorder : colors.value.tableBorder
    )
    .attr('stroke-width', (d: TableNode) => (d.isView ? 0.8 : 0.5))
    .attr('stroke-dasharray', (d: TableNode) => (d.isView ? '5,2' : 'none'))

  // Header text
  header
    .append('text')
    .text((d: TableNode) => {
      if (d.schema && d.schema !== 'public' && d.schema !== '') {
        return `${d.schema}.${d.name}`
      }
      return d.name
    })
    .attr('x', 10)
    .attr('y', 20)
    .attr('fill', colors.value.headerText)
    .attr('font-weight', (d: TableNode) => (d.isView ? 400 : 600))
    .attr('font-style', (d: TableNode) => (d.isView ? 'italic' : 'normal'))
    .style('font-size', '13px')

  // Columns
  const columnGroup = node
    .append('g')
    .attr('class', 'column-group')
    .attr('transform', 'translate(0, 30)')

  columnGroup.each(function (this: SVGGElement, d: TableNode) {
    const group = select(this)
    const table = tableByName.get(d.name) || viewByName.get(d.name)
    if (!table) return

    table.columns.forEach((col, i) => {
      const row = group
        .append('g')
        .attr('transform', `translate(0, ${i * 20})`)
        .attr('class', 'column-row')

      if (i % 2 === 1) {
        row
          .append('rect')
          .attr('class', 'alternate-row')
          .attr('width', 200)
          .attr('height', 20)
          .attr('fill', colors.value.alternateRowBg)
          .attr('opacity', 0.4)
      }

      const isPK = table.primaryKeys?.includes(col.name)
      const isFK = table.foreignKeys?.some((fk) => fk.sourceColumn === col.name)
      const prefix = isPK ? '🔑 ' : isFK ? '🔗 ' : ''
      const formattedType = formatColumnType(col)

      const columnNameText = row
        .append('text')
        .attr('x', 10)
        .attr('y', 14)
        .attr('class', 'column-name')
        .attr('data-column-name', col.name)
        .attr(
          'fill',
          isPK ? BRAND_COLORS.primary : isFK ? BRAND_COLORS.secondary : colors.value.columnText
        )
        .style('font-size', '11px')
        .style('font-weight', isPK || isFK ? '500' : '400')
        .text(prefix + col.name)
        .style('cursor', isPK || isFK ? 'help' : 'default')

      if (isPK || isFK) {
        const tooltipLines: string[] = []
        tooltipLines.push(`${d.name}.${col.name}`)
        tooltipLines.push(
          `Type: ${formattedType}${isPK ? ', Primary Key' : ''}${isFK ? ', Foreign Key' : ''}`
        )

        if (isFK) {
          table.foreignKeys
            ?.filter((fk) => fk.sourceColumn === col.name)
            .forEach((fk) => {
              const actions =
                fk.onUpdate || fk.onDelete
                  ? ` (ON UPDATE ${fk.onUpdate || 'NO ACTION'}, ON DELETE ${fk.onDelete || 'NO ACTION'})`
                  : ''
              tooltipLines.push(`References ${fk.referencedTable}.${fk.referencedColumn}${actions}`)
            })
        }

        if (isPK) {
          props.tables.forEach((t) => {
            t.foreignKeys?.forEach((fk) => {
              if (fk.referencedTable === d.name && fk.referencedColumn === col.name) {
                tooltipLines.push(`Referenced by ${t.name}.${fk.sourceColumn}`)
              }
            })
          })
        }

        columnNameText.append('title').text(tooltipLines.join('\n'))
      }

      row
        .append('text')
        .attr('class', 'column-type')
        .attr('x', 190)
        .attr('y', 14)
        .attr('text-anchor', 'end')
        .attr('fill', colors.value.columnText)
        .style('font-size', '11px')
        .text(formattedType)
    })
  })
}

// Create relationship lines
function createLinks(
  zoomGroup: Selection<SVGGElement, unknown, null, undefined>,
  linksData: TableLink[]
) {
  linkGroup = zoomGroup
    .append('g')
    .selectAll<SVGGElement, TableLink>('g')
    .data(linksData)
    .join('g')
    .attr('class', 'relationship')

  linkGroup
    .append('path')
    .attr('class', 'relationship-line')
    .attr('fill', 'none')
    .attr('stroke', (d: TableLink) => {
      if (d.isViewDependency) return BRAND_COLORS.gray
      if (d.isJunctionRelation) return BRAND_COLORS.secondary
      return BRAND_COLORS.primary
    })
    .attr('stroke-width', '1.5')
    .attr('stroke-dasharray', (d: TableLink) => (d.isViewDependency ? '3,3' : 'none'))
    .attr('marker-start', (d: TableLink) => (d.sourceMarker ? `url(#${d.sourceMarker})` : ''))
    .attr('marker-end', (d: TableLink) => (d.targetMarker ? `url(#${d.targetMarker})` : ''))
}

// Drag handlers
function dragstarted(event: D3DragEvent<SVGGElement, TableNode, TableNode>) {
  if (!event.active) forcesComposable.restartSimulation(0.1)
  event.subject.fx = event.subject.x
  event.subject.fy = event.subject.y
}

function dragged(event: D3DragEvent<SVGGElement, TableNode, TableNode>) {
  event.subject.fx = event.x
  event.subject.fy = event.y
}

function dragended(event: D3DragEvent<SVGGElement, TableNode, TableNode>) {
  if (!event.active) forcesComposable.getSimulation()?.alphaTarget(0)
  event.subject.fx = event.x
  event.subject.fy = event.y
  forcesComposable.stopSimulation()
}

// Update highlighting based on selection
function updateHighlighting() {
  if (!node) return

  const selectedTableName = highlightingComposable.selectedTable.value
  const relatedTables = selectedTableName
    ? highlightingComposable.findRelatedTables(selectedTableName, links)
    : new Set<string>()
  const { relationships } = selectedTableName
    ? highlightingComposable.findRelatedFields(selectedTableName, props.tables)
    : { relationships: [] }

  // Update table highlighting
  node.each(function (d: TableNode) {
    const element = select(this as SVGGElement)
    const isSelected = d.name === selectedTableName
    const isRelated = relatedTables.has(d.name)

    element
      .select('.table-header rect')
      .transition()
      .duration(300)
      .attr(
        'stroke',
        isSelected
          ? colors.value.selectedBorder
          : isRelated
            ? colors.value.relatedBorder
            : colors.value.tableBorder
      )
      .attr('stroke-width', isSelected || isRelated ? 2.5 : 1.5)
      .attr(
        'fill',
        isSelected
          ? colors.value.selectedHeaderBg
          : isRelated
            ? colors.value.relatedHeaderBg
            : colors.value.tableHeader
      )

    element
      .select('rect.table-body')
      .transition()
      .duration(300)
      .attr(
        'fill',
        isSelected
          ? colors.value.selectedBodyBg
          : isRelated
            ? colors.value.relatedBodyBg
            : colors.value.tableBg
      )
      .attr(
        'stroke',
        isSelected
          ? colors.value.selectedBorder
          : isRelated
            ? colors.value.relatedBorder
            : colors.value.tableBorder
      )
      .attr('stroke-width', isSelected || isRelated ? 1.5 : 1)

    element
      .transition()
      .duration(300)
      .style('opacity', !selectedTableName || isSelected || isRelated ? 1 : 0.4)

    element.selectAll<SVGTextElement, unknown>('.column-name').each(function (
      this: SVGTextElement
    ) {
      const text = select<SVGTextElement, unknown>(this)
      const fieldName = this.getAttribute('data-column-name') || ''
      const fieldRelationships = relationships.filter(
        (r) =>
          (r.tableName === d.name && r.fieldName === fieldName) ||
          (r.relatedTableName === d.name && r.relatedFieldName === fieldName)
      )

      if (fieldRelationships.length > 0) {
        const isPrimaryKey = fieldRelationships.some(
          (r) => r.relatedTableName === d.name && r.relatedFieldName === fieldName
        )
        text
          .transition()
          .duration(300)
          .style('font-weight', '600')
          .attr('fill', isPrimaryKey ? BRAND_COLORS.primary : BRAND_COLORS.secondary)
      } else if (selectedTableName) {
        text
          .transition()
          .duration(300)
          .style('font-weight', '400')
          .attr('fill', colors.value.columnText)
      }
    })
  })

  // Update link highlighting
  if (linkPaths) {
    linkPaths
      .transition()
      .duration(300)
      .attr('stroke-width', function (d: TableLink) {
        const source = typeof d.source === 'string' ? d.source : d.source.id
        const target = typeof d.target === 'string' ? d.target : d.target.id
        return selectedTableName && (source === selectedTableName || target === selectedTableName)
          ? '2'
          : '1.5'
      })
      .style('opacity', function (d: TableLink) {
        if (!selectedTableName) return 1
        const source = typeof d.source === 'string' ? d.source : d.source.id
        const target = typeof d.target === 'string' ? d.target : d.target.id
        return source === selectedTableName || target === selectedTableName ? 1 : 0.15
      })
  }
}

function applyPositions() {
  if (!linkPaths || !node) return

  const nodeWidth = 200
  const halfWidth = nodeWidth / 2
  const stub = 28
  const cornerRadius = 10
  const parallelSpacing = 14

  linkPaths.attr('d', (d: TableLink) => {
    const source = d.source as TableNode
    const target = d.target as TableNode

    const sourceX = source.x || 0
    const targetX = target.x || 0
    const sourceHeight = nodeHeightById.get(source.id) ?? 30
    const targetHeight = nodeHeightById.get(target.id) ?? 30

    const sourceTable = tableByName.get(source.name) || viewByName.get(source.name)
    const targetTable = tableByName.get(target.name) || viewByName.get(target.name)

    const startY = getColumnAnchorY({
      table: sourceTable,
      columnName: d.sourceColumn,
      nodeCenterY: source.y || 0,
      nodeHeight: sourceHeight,
      headerHeight: 30,
      rowHeight: 20
    })

    const endY = getColumnAnchorY({
      table: targetTable,
      columnName: d.targetColumn,
      nodeCenterY: target.y || 0,
      nodeHeight: targetHeight,
      headerHeight: 30,
      rowHeight: 20
    })

    const direction = targetX >= sourceX ? 1 : -1

    const startEdge = { x: sourceX + direction * halfWidth, y: startY }
    const startOut = { x: startEdge.x + direction * stub, y: startEdge.y }
    const endEdge = { x: targetX - direction * halfWidth, y: endY }
    const endOut = { x: endEdge.x - direction * stub, y: endEdge.y }

    const index = d.parallelIndex ?? 0
    const count = d.parallelCount ?? 1
    const offset = (index - (count - 1) / 2) * parallelSpacing

    const midX = (startOut.x + endOut.x) / 2 + offset

    const points = [
      startEdge,
      startOut,
      { x: midX, y: startOut.y },
      { x: midX, y: endOut.y },
      endOut,
      endEdge
    ]

    return buildRoundedOrthogonalPath(points, cornerRadius)
  })

  node.attr('transform', (d: TableNode) => {
    const height = nodeHeightById.get(d.id) ?? 30
    const x = (d.x || 0) - 100
    const y = (d.y || 0) - height / 2
    return `translate(${x},${y})`
  })
}

function settleSimulation(ticks: number) {
  const simulation = forcesComposable.getSimulation()
  if (!simulation) return

  simulation.stop()
  for (let i = 0; i < ticks; i++) simulation.tick()
  applyPositions()
  simulation.stop()
}

function clampNumber(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function median(values: number[]): number {
  if (!values.length) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid]
}

function computeRecommendedForces(params: {
  nodeHeightById: Map<string, number>
  nodes: TableNode[]
  links: TableLink[]
}): { linkDistance: number; chargeStrength: number; collisionRadius: number } {
  const nodeWidth = 200
  const heights = Array.from(params.nodeHeightById.values()).filter((h) => Number.isFinite(h))
  const typicalHeight = median(heights) || 150
  const baseSize = Math.max(nodeWidth, typicalHeight)

  const nodeCount = Math.max(1, params.nodes.length)
  const linkCount = params.links.length
  const avgDegree = nodeCount > 0 ? (2 * linkCount) / nodeCount : 0
  const densityFactor = 1 + clampNumber(avgDegree / 10, 0, 1) * 0.25

  const collisionRadius = clampNumber(
    Math.round((Math.hypot(nodeWidth, typicalHeight) / 2 + 24) * densityFactor),
    60,
    320
  )

  const linkDistance = clampNumber(Math.round((baseSize + 110) * densityFactor), 100, 800)

  const chargeStrengthRaw = -Math.round(
    ((collisionRadius * 4 + linkDistance) * Math.log2(nodeCount + 1)) / 2
  )
  const chargeStrength = clampNumber(chargeStrengthRaw, -6000, -200)

  return { linkDistance, chargeStrength, collisionRadius }
}

let suppressForcesWatcher = false

function applyForceParams(params: {
  linkDistance: number
  chargeStrength: number
  collisionRadius: number
  userInitiated?: boolean
}) {
  suppressForcesWatcher = true
  forcesComposable.linkDistance.value = params.linkDistance
  forcesComposable.chargeStrength.value = params.chargeStrength
  forcesComposable.collisionRadius.value = params.collisionRadius
  suppressForcesWatcher = false

  if (params.userInitiated) hasUserAdjustedForces.value = true

  const simulation = forcesComposable.getSimulation()
  if (!simulation) return

  forcesComposable.updateForces()
  if (staticLayout.value) {
    settleSimulation(35)
    if (highlightingComposable.selectedTable.value) updateHighlighting()
  } else {
    forcesComposable.restartSimulation(0.2)
  }
}

function autoTuneForces() {
  if (!currentNodes.length) return
  const recommended = computeRecommendedForces({
    nodeHeightById,
    nodes: currentNodes,
    links
  })
  applyForceParams({ ...recommended, userInitiated: true })
}

function computeDiagramBounds(params: {
  nodes: TableNode[]
  nodeHeightById: Map<string, number>
}): { minX: number; minY: number; maxX: number; maxY: number } | null {
  const nodeWidth = 200
  const halfWidth = nodeWidth / 2

  let minX = Number.POSITIVE_INFINITY
  let maxX = Number.NEGATIVE_INFINITY
  let minY = Number.POSITIVE_INFINITY
  let maxY = Number.NEGATIVE_INFINITY

  for (const n of params.nodes) {
    if (typeof n.x !== 'number' || typeof n.y !== 'number') continue
    const height = params.nodeHeightById.get(n.id) ?? 30
    minX = Math.min(minX, n.x - halfWidth)
    maxX = Math.max(maxX, n.x + halfWidth)
    minY = Math.min(minY, n.y - height / 2)
    maxY = Math.max(maxY, n.y + height / 2)
  }

  if (
    !Number.isFinite(minX) ||
    !Number.isFinite(minY) ||
    !Number.isFinite(maxX) ||
    !Number.isFinite(maxY)
  ) {
    return null
  }

  return { minX, minY, maxX, maxY }
}

function autoLayout() {
  autoTuneForces()

  if (!svgContainer.value) return
  const bounds = computeDiagramBounds({ nodes: currentNodes, nodeHeightById })
  if (!bounds) return

  const width = svgContainer.value.clientWidth
  const height = svgContainer.value.clientHeight || 1200
  zoomComposable.fitToBounds(bounds, width, height)
}

// Main visualization function
function createVisualization(reason: 'init' | 'resize' | 'data' | 'theme' = 'data') {
  if (!svgContainer.value) return

  if (svg && reason !== 'init') {
    const svgNode = svg.node()
    if (svgNode) preservedZoomTransform = zoomTransform(svgNode)
  }

  if (currentNodes.length) {
    currentNodes.forEach((n) => {
      if (typeof n.x !== 'number' || typeof n.y !== 'number') return
      nodePositionCache.set(n.id, {
        x: n.x,
        y: n.y,
        vx: typeof n.vx === 'number' ? n.vx : 0,
        vy: typeof n.vy === 'number' ? n.vy : 0,
        fx: typeof n.fx === 'number' ? n.fx : (n.fx ?? null),
        fy: typeof n.fy === 'number' ? n.fy : (n.fy ?? null)
      })
    })
  }

  forcesComposable.stopSimulation()

  // Clear previous visualization
  select(svgContainer.value).selectAll('*').remove()

  const width = svgContainer.value.clientWidth
  const height = svgContainer.value.clientHeight || 1200
  lastSize = { width, height }

  svg = select(svgContainer.value).append('svg').attr('width', width).attr('height', height)

  // Zoom group must exist before initializing zoom (so zoom handler can apply transforms)
  const zoomContent = svg.append('g').attr('class', 'zoom-group')
  zoomGroup = zoomContent

  // Initialize zoom
  const zoomBehavior = zoomComposable.initializeZoom(svg)
  zoomComposable.setInitialTransform()

  if (preservedZoomTransform && reason !== 'init') {
    svg.call(zoomBehavior.transform, preservedZoomTransform)
  }

  // Background grid
  recreateGrid(width, height)

  // Create defs for markers and filters
  const defs = zoomContent.append('defs')
  createDropShadowFilter(defs)
  createMarkerDefinitions(defs)

  tableByName = new Map((props.tables || []).map((t) => [t.name, t]))
  viewByName = new Map((props.views || []).map((v) => [v.name, v]))

  // Prepare nodes
  const nodes: TableNode[] = [
    ...(props.tables || []).map((table) => ({
      id: table.name,
      name: table.name,
      schema: table.schema || '',
      isView: false
    })),
    ...(props.views || []).map((view) => ({
      id: view.name,
      name: view.name,
      schema: view.schema || '',
      isView: true
    }))
  ]

  nodes.sort((a, b) => {
    if (a.isView !== b.isView) return Number(a.isView) - Number(b.isView)
    const schemaCompare = a.schema.localeCompare(b.schema)
    if (schemaCompare !== 0) return schemaCompare
    return a.name.localeCompare(b.name)
  })

  const spacingX = 260
  const spacingY = 130
  const cols = Math.max(1, Math.floor(width / spacingX))
  const rows = Math.max(1, Math.ceil(nodes.length / cols))
  const originX = width / 2 - ((Math.min(cols, nodes.length) - 1) * spacingX) / 2
  const originY = height / 2 - ((rows - 1) * spacingY) / 2

  nodes.forEach((n, i) => {
    const cached = nodePositionCache.get(n.id)
    if (cached) {
      n.x = cached.x
      n.y = cached.y
      n.vx = cached.vx
      n.vy = cached.vy
      n.fx = cached.fx ?? undefined
      n.fy = cached.fy ?? undefined
      return
    }

    const col = i % cols
    const row = Math.floor(i / cols)
    n.x = originX + col * spacingX
    n.y = originY + row * spacingY
    n.vx = 0
    n.vy = 0
  })

  // Process relationships
  links = buildDiagramLinks({
    tables: props.tables,
    views: props.views,
    relations: props.relations
  })

  // No data message
  if (nodes.length === 0) {
    zoomContent
      .append('text')
      .attr('class', 'no-data')
      .attr('x', width / 2)
      .attr('y', height / 2)
      .attr('text-anchor', 'middle')
      .attr('fill', colors.value.noDataText)
      .text('No tables or views to display')
    return
  }

  // Create links first (so they render behind nodes)
  createLinks(zoomContent, links)
  linkPaths = linkGroup ? linkGroup.selectAll<SVGPathElement, TableLink>('path') : null

  // Create nodes
  createNodes(zoomContent, nodes)

  const columnCountByName = new Map<string, number>()
  for (const table of props.tables || []) {
    columnCountByName.set(table.name, table.columns?.length ?? 0)
  }
  for (const view of props.views || []) {
    columnCountByName.set(view.name, view.columns?.length ?? 0)
  }

  nodeHeightById = new Map<string, number>()
  nodes.forEach((n) => {
    const columnCount = columnCountByName.get(n.name) ?? 0
    nodeHeightById.set(n.id, 30 + columnCount * 20)
  })

  if (!hasUserAdjustedForces.value && (reason === 'init' || reason === 'data')) {
    const recommended = computeRecommendedForces({ nodeHeightById, nodes, links })
    forcesComposable.linkDistance.value = recommended.linkDistance
    forcesComposable.chargeStrength.value = recommended.chargeStrength
    forcesComposable.collisionRadius.value = recommended.collisionRadius
  }

  // Initialize simulation
  const simulation = forcesComposable.initializeSimulation(width, height)
  simulation.nodes(nodes)

  const linkForce = simulation.force('link') as ForceLink<TableNode, TableLink>
  linkForce.links(links).distance(forcesComposable.linkDistance.value)

  const preTicks = reason === 'init' ? 110 : reason === 'data' ? 70 : 0
  if (preTicks > 0) settleSimulation(preTicks)

  applyPositions()

  simulation.on('tick', applyPositions)
  if (!staticLayout.value) {
    simulation.alpha(reason === 'data' ? 0.08 : 0.12).restart()
  }

  // Clear selection on background click
  svg.on('click', () => {
    highlightingComposable.clearSelection()
    updateHighlighting()
  })

  currentNodes = nodes

  if (highlightingComposable.selectedTable.value) {
    updateHighlighting()
  }

  applyTheme()
}

function updateSize() {
  if (!svgContainer.value || !svg || !zoomGroup) return
  const width = svgContainer.value.clientWidth
  const height = svgContainer.value.clientHeight || 1200
  if (lastSize && lastSize.width === width && lastSize.height === height) return

  lastSize = { width, height }
  svg.attr('width', width).attr('height', height)
  zoomComposable.setInitialTransform()
  forcesComposable.setCenter(width, height)
  recreateGrid(width, height)
  applyTheme()
  applyPositions()
}

function handleContainerResize() {
  if (resizeTimer) clearTimeout(resizeTimer)
  resizeTimer = setTimeout(() => updateSize(), 120)
}

// Lifecycle
onMounted(() => {
  createVisualization('init')

  if (svgContainer.value) {
    resizeObserver = new ResizeObserver(() => handleContainerResize())
    resizeObserver.observe(svgContainer.value)
  }
})

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
  resizeObserver = null
  if (resizeTimer) clearTimeout(resizeTimer)
  forcesComposable.stopSimulation()
})

// Watchers
watch(
  [() => props.tables, () => props.relations, () => props.views],
  () => createVisualization('data'),
  { deep: true }
)

watch(
  () => themeStore.isDark,
  () => applyTheme()
)

watch(
  [
    forcesComposable.linkDistance,
    forcesComposable.chargeStrength,
    forcesComposable.collisionRadius
  ],
  () => {
    if (suppressForcesWatcher) return
    const simulation = forcesComposable.getSimulation()
    if (!simulation) return

    forcesComposable.updateForces()
    if (staticLayout.value) {
      settleSimulation(35)
      if (highlightingComposable.selectedTable.value) updateHighlighting()
    } else {
      forcesComposable.restartSimulation(0.2)
    }
  }
)

// Event handlers for controls
function handleExport() {
  if (!svg) return
  exportComposable.saveDiagram(svg, svgContainer.value || null)
}

function handleUpdateLinkDistance(value: number) {
  hasUserAdjustedForces.value = true
  forcesComposable.linkDistance.value = value
}

function handleUpdateChargeStrength(value: number) {
  hasUserAdjustedForces.value = true
  forcesComposable.chargeStrength.value = value
}

function handleUpdateCollisionRadius(value: number) {
  hasUserAdjustedForces.value = true
  forcesComposable.collisionRadius.value = value
}
</script>

<template>
  <div class="relative">
    <div ref="svgContainer" class="w-full h-[2000px] bg-gray-50 dark:bg-gray-900 rounded-lg"></div>

    <DiagramControls
      :current-zoom="zoomComposable.currentZoom.value"
      :link-distance="forcesComposable.linkDistance.value"
      :charge-strength="forcesComposable.chargeStrength.value"
      :collision-radius="forcesComposable.collisionRadius.value"
      :export-options="exportComposable.exportOptions.value"
      :export-progress="exportComposable.exportProgress.value"
      :export-type="exportComposable.exportType.value"
      @zoom="zoomComposable.handleZoom"
      @auto="autoLayout"
      @toggle-export="exportComposable.toggleExportOptions"
      @export="handleExport"
      @update:link-distance="handleUpdateLinkDistance"
      @update:charge-strength="handleUpdateChargeStrength"
      @update:collision-radius="handleUpdateCollisionRadius"
      @update:export-type="exportComposable.exportType.value = $event"
    />

    <DiagramLegend />
  </div>
</template>

<style scoped>
.table-node,
.view-node {
  cursor: move;
  transition: transform 0.2s ease;
}

.table-node:hover,
.view-node:hover {
  filter: drop-shadow(0 4px 6px rgba(0, 0, 0, 0.1));
}

.table-node:hover .table-header rect,
.view-node:hover .table-header rect {
  stroke: var(--brand-primary-color, #00b2d6);
  stroke-width: 2px;
}

.relationship-line {
  stroke-width: 1.5px;
  shape-rendering: geometricPrecision;
  transition:
    stroke-width 0.2s ease,
    opacity 0.2s ease;
}

.relationship-line:hover {
  stroke-width: 2px;
}

marker {
  overflow: visible;
}

marker path {
  stroke-width: 2px;
  fill: none;
  shape-rendering: geometricPrecision;
}

.table-header rect {
  transition:
    fill 0.3s ease,
    stroke 0.3s ease;
}

.view-icon {
  opacity: 0.8;
}

line,
marker path,
rect,
text {
  transition:
    stroke 0.3s ease,
    stroke-width 0.3s ease,
    fill 0.3s ease,
    font-weight 0.3s ease;
}

.column-group text[data-tooltip] {
  cursor: help;
}

:root {
  --brand-primary-color: #00b2d6;
  --brand-secondary-color: #f26627;
}
</style>
