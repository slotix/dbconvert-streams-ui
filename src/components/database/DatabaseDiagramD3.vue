<script setup lang="ts">
import { ref, onMounted, watch, onBeforeUnmount, computed } from 'vue'
import * as d3 from 'd3'
import type { Table } from '@/types/schema'
import type { TableNode, TableLink } from '@/types/diagram'
import { useThemeStore } from '@/stores/theme'
import { BRAND_COLORS, getDiagramColors, createMarkerDefinitions } from '@/utils/d3DiagramConfig'
import { useDiagramZoom } from '@/composables/useDiagramZoom'
import { useDiagramForces } from '@/composables/useDiagramForces'
import { useDiagramExport } from '@/composables/useDiagramExport'
import { useDiagramHighlighting } from '@/composables/useDiagramHighlighting'
import DiagramControls from './DiagramControls.vue'
import DiagramLegend from './DiagramLegend.vue'

const props = withDefaults(
  defineProps<{
    tables: Table[]
    relations: { sourceTable: string; targetTable: string; sourceColumn: string }[]
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
let svg: d3.Selection<SVGSVGElement, unknown, null, undefined>
let node: d3.Selection<SVGGElement, TableNode, SVGGElement, unknown>
let linkGroup: d3.Selection<SVGGElement, TableLink, SVGGElement, unknown>
let links: TableLink[] = []
let currentNodes: TableNode[] = []

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

// Helper: Check if table is a junction table
function isJunctionTable(tableName: string): boolean {
  const table = props.tables.find((t) => t.name === tableName)
  if (!table?.foreignKeys) return false
  return (
    table.foreignKeys.length === 2 &&
    table.primaryKeys?.length === 2 &&
    table.foreignKeys.every((fk) => table.primaryKeys?.includes(fk.sourceColumn))
  )
}

// Helper: Format column type
function formatColumnType(column: { type?: string }): string {
  let type = column.type || ''
  const typeShortcuts: { [key: string]: string } = {
    'timestamp without time zone': 'timestamp',
    'timestamp with time zone': 'timestamptz',
    'character varying': 'varchar',
    character: 'char',
    'double precision': 'double',
    bigint: 'bigint',
    smallint: 'smallint',
    boolean: 'bool',
    text: 'text',
    integer: 'int'
  }
  for (const [longForm, shortForm] of Object.entries(typeShortcuts)) {
    if (type.toLowerCase().startsWith(longForm)) {
      const sizeMatch = type.match(/\(.*\)$/)
      type = shortForm + (sizeMatch ? sizeMatch[0] : '')
      break
    }
  }
  return type
}

// Helper: Get table height based on columns
function getTableHeight(table: TableNode): number {
  const baseHeight = 30
  const rowHeight = 20
  const numColumns =
    props.tables.find((t) => t.name === table.name)?.columns.length ||
    props.views.find((v) => v.name === table.name)?.columns.length ||
    0
  return baseHeight + numColumns * rowHeight
}

// Helper: Calculate connection point on table border
function calculateConnectionPoint(
  sourceX: number,
  sourceY: number,
  targetX: number,
  targetY: number,
  tableWidth: number,
  tableHeight: number
): [number, number] {
  const angle = Math.atan2(targetY - sourceY, targetX - sourceX)
  const width = tableWidth || 200
  const height = tableHeight || 30
  const halfWidth = width / 2
  const halfHeight = height / 2

  let x, y
  if (Math.abs(Math.cos(angle)) > Math.abs(Math.sin(angle))) {
    x = Math.cos(angle) > 0 ? halfWidth : -halfWidth
    y = Math.tan(angle) * x
    if (Math.abs(y) > halfHeight) {
      y = Math.sign(y) * halfHeight
      x = y / Math.tan(angle)
    }
  } else {
    y = Math.sin(angle) > 0 ? halfHeight : -halfHeight
    x = y / Math.tan(angle)
    if (Math.abs(x) > halfWidth) {
      x = Math.sign(x) * halfWidth
      y = Math.tan(angle) * x
    }
  }
  return [x, y]
}

// Create background grid
function createBackgroundGrid(
  container: d3.Selection<SVGGElement, unknown, null, undefined>,
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

// Create drop shadow filter
function createDropShadowFilter(defs: d3.Selection<SVGDefsElement, unknown, null, undefined>) {
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

// Process relationships into links
function processRelationships(): TableLink[] {
  const processedLinks: TableLink[] = []

  function hasManyToManyRelationship(table1Name: string, table2Name: string): boolean {
    const junctionTables = props.tables.filter((table) => isJunctionTable(table.name))
    return junctionTables.some((junctionTable) => {
      if (!junctionTable.foreignKeys || junctionTable.foreignKeys.length !== 2) return false
      const referencedTables = junctionTable.foreignKeys.map((fk) => fk.referencedTable)
      return referencedTables.includes(table1Name) && referencedTables.includes(table2Name)
    })
  }

  // Process regular relationships
  props.relations?.forEach((relation) => {
    if (isJunctionTable(relation.sourceTable)) {
      const junctionTable = props.tables.find((t) => t.name === relation.sourceTable)
      const otherForeignKey = junctionTable?.foreignKeys?.find(
        (fk) =>
          fk.sourceColumn !== relation.sourceColumn && fk.referencedTable !== relation.targetTable
      )
      if (otherForeignKey) {
        processedLinks.push({
          source: otherForeignKey.referencedTable,
          target: relation.sourceTable,
          relationship: 'one-to-many',
          targetMarker: 'junction-mandatory-many',
          isJunctionRelation: true
        })
        processedLinks.push({
          source: relation.sourceTable,
          target: relation.targetTable,
          relationship: 'many-to-one',
          targetMarker: 'junction-mandatory-one-to-one',
          isJunctionRelation: true
        })
      }
    } else if (!isJunctionTable(relation.targetTable)) {
      processedLinks.push({
        source: relation.sourceTable,
        target: relation.targetTable,
        relationship: 'many-to-one',
        targetMarker: 'mandatory-one-to-one',
        isJunctionRelation: false
      })
      processedLinks.push({
        source: relation.targetTable,
        target: relation.sourceTable,
        relationship: 'one-to-many',
        targetMarker: 'mandatory-many',
        isJunctionRelation: false
      })
    }
  })

  // Process many-to-many relationships
  const processedJunctionRelations = new Set<string>()
  props.tables.forEach((table) => {
    if (isJunctionTable(table.name) && table.foreignKeys && table.foreignKeys.length === 2) {
      const [fk1, fk2] = table.foreignKeys
      const relationKey = [fk1.referencedTable, fk2.referencedTable].sort().join('-')
      if (!processedJunctionRelations.has(relationKey)) {
        processedJunctionRelations.add(relationKey)
        processedLinks.push({
          source: fk1.referencedTable,
          target: table.name,
          relationship: 'one-to-many',
          targetMarker: 'junction-mandatory-many',
          isJunctionRelation: true
        })
        processedLinks.push({
          source: table.name,
          target: fk2.referencedTable,
          relationship: 'many-to-one',
          targetMarker: 'junction-mandatory-one',
          isJunctionRelation: true
        })
      }
    }
  })

  // Add view dependencies
  if (props.views?.length) {
    props.views.forEach((view) => {
      props.tables
        .filter((table) => view.name.toLowerCase().includes(table.name.toLowerCase()))
        .forEach((table) => {
          processedLinks.push({
            source: view.name,
            target: table.name,
            relationship: 'one-to-one',
            sourceMarker: 'mandatory-one',
            targetMarker: 'mandatory-one',
            isViewDependency: true
          })
        })
    })
  }

  // Filter out incorrect direct relationships
  return processedLinks.filter((link) => {
    const source = typeof link.source === 'string' ? link.source : link.source.id
    const target = typeof link.target === 'string' ? link.target : link.target.id
    if (isJunctionTable(source) || isJunctionTable(target)) return true
    return !hasManyToManyRelationship(source, target)
  })
}

// Create table/view nodes
function createNodes(
  zoomGroup: d3.Selection<SVGGElement, unknown, null, undefined>,
  nodes: TableNode[]
) {
  node = zoomGroup
    .append('g')
    .selectAll<SVGGElement, TableNode>('g')
    .data(nodes)
    .join('g')
    .attr('class', (d: TableNode) => (d.isView ? 'view-node' : 'table-node'))
    .call(
      d3
        .drag<SVGGElement, TableNode>()
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
      const columnCount =
        props.tables.find((t) => t.name === d.name)?.columns.length ||
        props.views.find((v) => v.name === d.name)?.columns.length ||
        0
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
      const columnCount =
        props.tables.find((t) => t.name === d.name)?.columns.length ||
        props.views.find((v) => v.name === d.name)?.columns.length ||
        0
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
    const group = d3.select(this)
    const table =
      props.tables.find((t) => t.name === d.name) || props.views.find((v) => v.name === d.name)
    if (!table) return

    table.columns.forEach((col, i) => {
      const row = group
        .append('g')
        .attr('transform', `translate(0, ${i * 20})`)
        .attr('class', 'column-row')

      if (i % 2 === 1) {
        row
          .append('rect')
          .attr('width', 200)
          .attr('height', 20)
          .attr('fill', colors.value.alternateRowBg)
          .attr('opacity', 0.4)
      }

      const isPK = table.primaryKeys?.includes(col.name)
      const isFK = table.foreignKeys?.some((fk) => fk.sourceColumn === col.name)
      const prefix = isPK ? '🔑 ' : isFK ? '🔗 ' : ''

      row
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

      row
        .append('text')
        .attr('x', 190)
        .attr('y', 14)
        .attr('text-anchor', 'end')
        .attr('fill', colors.value.columnText)
        .style('font-size', '11px')
        .text(formatColumnType(col))
    })
  })
}

// Create relationship lines
function createLinks(
  zoomGroup: d3.Selection<SVGGElement, unknown, null, undefined>,
  linksData: TableLink[]
) {
  linkGroup = zoomGroup
    .append('g')
    .selectAll<SVGGElement, TableLink>('g')
    .data(linksData)
    .join('g')
    .attr('class', 'relationship')

  linkGroup
    .append('line')
    .attr('class', 'relationship-line')
    .attr('stroke', (d: TableLink) => {
      if (d.isViewDependency) return BRAND_COLORS.gray
      if (d.isJunctionRelation) return BRAND_COLORS.secondary
      return BRAND_COLORS.primary
    })
    .attr('stroke-width', '1.5')
    .attr('stroke-dasharray', (d: TableLink) => (d.isViewDependency ? '3,3' : 'none'))
    .attr('marker-start', '')
    .attr('marker-end', (d: TableLink) => (d.targetMarker ? `url(#${d.targetMarker})` : ''))
}

// Drag handlers
function dragstarted(event: d3.D3DragEvent<SVGGElement, TableNode, TableNode>) {
  if (!event.active) forcesComposable.restartSimulation(0.1)
  event.subject.fx = event.subject.x
  event.subject.fy = event.subject.y
}

function dragged(event: d3.D3DragEvent<SVGGElement, TableNode, TableNode>) {
  event.subject.fx = event.x
  event.subject.fy = event.y
}

function dragended(event: d3.D3DragEvent<SVGGElement, TableNode, TableNode>) {
  if (!event.active) forcesComposable.getSimulation()?.alphaTarget(0)
  event.subject.fx = event.x
  event.subject.fy = event.y
  forcesComposable.stopSimulation()
}

// Update highlighting based on selection
function updateHighlighting() {
  const selectedTableName = highlightingComposable.selectedTable.value
  const relatedTables = selectedTableName
    ? highlightingComposable.findRelatedTables(selectedTableName, links)
    : new Set<string>()
  const { relationships } = selectedTableName
    ? highlightingComposable.findRelatedFields(selectedTableName, props.tables)
    : { relationships: [] }

  // Update table highlighting
  node.each(function (d: TableNode) {
    const element = d3.select(this as SVGGElement)
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
      const text = d3.select<SVGTextElement, unknown>(this)
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
          .attr('fill', BRAND_COLORS.grayDark)
      }
    })
  })

  // Update link highlighting
  if (linkGroup) {
    linkGroup
      .selectAll<SVGLineElement, TableLink>('line')
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

// Main visualization function
function createVisualization(reason: 'init' | 'resize' | 'data' | 'theme' = 'data') {
  if (!svgContainer.value) return

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
  d3.select(svgContainer.value).selectAll('*').remove()

  const width = svgContainer.value.clientWidth
  const height = svgContainer.value.clientHeight || 1200
  lastSize = { width, height }

  svg = d3.select(svgContainer.value).append('svg').attr('width', width).attr('height', height)

  // Initialize zoom
  const zoomBehavior = zoomComposable.initializeZoom(svg)
  svg.call(zoomBehavior)
  zoomComposable.setInitialTransform(width, height)

  const zoomGroup = svg.append('g').attr('class', 'zoom-group')

  // Background grid
  createBackgroundGrid(zoomGroup, width, height)

  // Create defs for markers and filters
  const defs = zoomGroup.append('defs')
  createDropShadowFilter(defs)
  createMarkerDefinitions(defs)

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
  links = processRelationships()

  // No data message
  if (nodes.length === 0) {
    zoomGroup
      .append('text')
      .attr('x', width / 2)
      .attr('y', height / 2)
      .attr('text-anchor', 'middle')
      .attr('fill', colors.value.noDataText)
      .text('No tables or views to display')
    return
  }

  // Create links first (so they render behind nodes)
  createLinks(zoomGroup, links)

  // Create nodes
  createNodes(zoomGroup, nodes)

  function applyPositions() {
    linkGroup
      .selectAll<SVGLineElement, TableLink>('line')
      .attr('x1', (d: TableLink) => {
        const source = d.source as TableNode
        const target = d.target as TableNode
        const [offsetX] = calculateConnectionPoint(
          source.x || 0,
          source.y || 0,
          target.x || 0,
          target.y || 0,
          200,
          getTableHeight(source)
        )
        return (source.x || 0) + offsetX
      })
      .attr('y1', (d: TableLink) => {
        const source = d.source as TableNode
        const target = d.target as TableNode
        const [, offsetY] = calculateConnectionPoint(
          source.x || 0,
          source.y || 0,
          target.x || 0,
          target.y || 0,
          200,
          getTableHeight(source)
        )
        return (source.y || 0) + offsetY
      })
      .attr('x2', (d: TableLink) => {
        const source = d.source as TableNode
        const target = d.target as TableNode
        const [offsetX] = calculateConnectionPoint(
          target.x || 0,
          target.y || 0,
          source.x || 0,
          source.y || 0,
          200,
          getTableHeight(target)
        )
        return (target.x || 0) + offsetX
      })
      .attr('y2', (d: TableLink) => {
        const source = d.source as TableNode
        const target = d.target as TableNode
        const [, offsetY] = calculateConnectionPoint(
          target.x || 0,
          target.y || 0,
          source.x || 0,
          source.y || 0,
          200,
          getTableHeight(target)
        )
        return (target.y || 0) + offsetY
      })
      .attr('marker-start', '')
      .attr('marker-end', (d: TableLink) => (d.targetMarker ? `url(#${d.targetMarker})` : ''))

    node.attr('transform', (d: TableNode) => {
      const x = (d.x || 0) - 100
      const y = (d.y || 0) - getTableHeight(d) / 2
      return `translate(${x},${y})`
    })
  }

  // Initialize simulation
  const simulation = forcesComposable.initializeSimulation(width, height)
  simulation.nodes(nodes)

  const linkForce = simulation.force('link') as d3.ForceLink<TableNode, TableLink>
  linkForce.links(links).distance(forcesComposable.linkDistance.value)

  const preTicks = reason === 'init' ? 110 : reason === 'data' ? 70 : 0
  if (preTicks > 0) {
    simulation.stop()
    for (let i = 0; i < preTicks; i++) simulation.tick()
  }

  applyPositions()

  const startAlpha =
    reason === 'resize' ? 0.03 : reason === 'theme' ? 0.02 : reason === 'data' ? 0.08 : 0.12
  simulation.alpha(startAlpha).restart()

  // Update positions on tick
  simulation.on('tick', applyPositions)

  // Clear selection on background click
  svg.on('click', () => {
    highlightingComposable.clearSelection()
    updateHighlighting()
  })

  currentNodes = nodes
}

// Handle window resize
function handleResize() {
  if (!svgContainer.value) return

  if (resizeTimer) clearTimeout(resizeTimer)
  resizeTimer = setTimeout(() => {
    if (!svgContainer.value) return
    const width = svgContainer.value.clientWidth
    const height = svgContainer.value.clientHeight || 1200
    if (lastSize && lastSize.width === width && lastSize.height === height) return
    createVisualization('resize')
  }, 150)
}

// Lifecycle
onMounted(() => {
  createVisualization('init')
  window.addEventListener('resize', handleResize)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
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
  () => createVisualization('theme')
)

// Event handlers for controls
function handleExport() {
  exportComposable.saveDiagram(svg, svgContainer.value || null)
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
      @reset="zoomComposable.resetView"
      @toggle-export="exportComposable.toggleExportOptions"
      @export="handleExport"
      @update:link-distance="forcesComposable.linkDistance.value = $event"
      @update:charge-strength="forcesComposable.chargeStrength.value = $event"
      @update:collision-radius="forcesComposable.collisionRadius.value = $event"
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
