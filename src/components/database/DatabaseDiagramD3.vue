<script setup lang="ts">
import { ref, onMounted, watch, onBeforeUnmount } from 'vue'
import * as d3 from 'd3'
import type { Table, Relationship } from '@/types/schema'
import {
  PlusIcon,
  MinusIcon,
  ArrowPathIcon,
  ViewfinderCircleIcon,
  ArrowDownTrayIcon
} from '@heroicons/vue/24/outline'

interface TableNode extends d3.SimulationNodeDatum {
  id: string
  name: string
  schema: string
  isView: boolean
  x?: number
  y?: number
}

interface TableLink extends d3.SimulationLinkDatum<TableNode> {
  source: string | TableNode
  target: string | TableNode
  relationship: 'one-to-one' | 'one-to-many' | 'many-to-one' | 'many-to-many'
  cardinality?: string
  isViewDependency?: boolean
  isJunctionRelation?: boolean
  sourceMarker?: string
  targetMarker?: string
}

// Add this type to help track related fields
interface RelatedField {
  tableName: string
  fieldName: string
  relatedTableName: string
  relatedFieldName: string
}

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

const svgContainer = ref<HTMLElement>()
let simulation: d3.Simulation<TableNode, TableLink>
let svg: d3.Selection<SVGSVGElement, unknown, null, undefined>

// Add after the props definition:
const linkDistance = ref(180)
const chargeStrength = ref(-600)
const collisionRadius = ref(150)
const gridSize = ref(10)

// Add zoom state
const currentZoom = ref(1)
const minZoom = 0.2
const maxZoom = 3

// Add zoom behavior
let zoom: d3.ZoomBehavior<SVGSVGElement, unknown>

// Add new state for selected table
const selectedTable = ref<string | null>(null)

// Add these variables at the top with other refs
let node: d3.Selection<SVGGElement, TableNode, SVGGElement, unknown>
let linkGroup: d3.Selection<SVGGElement, TableLink, SVGGElement, unknown>
let links: TableLink[] = []

// Define brand colors as constants for consistency
const BRAND_COLORS = {
  primary: '#00B2D6', // Teal/Cyan blue (from logo)
  secondary: '#F26627', // Orange (from logo)
  gray: '#94A3B8', // Slate gray for neutral elements
  grayLight: '#E2E8F0', // Light gray for backgrounds
  grayDark: '#334155', // Dark gray for text
  background: '#F8FAFC', // Very light gray for backgrounds
  white: '#FFFFFF', // White
  highlight: {
    blue: '#DBEAFE', // Light blue highlight
    orange: '#FFEDD5' // Light orange highlight
  }
}

// Add initial transform to track the original diagram state
let initialTransform: d3.ZoomTransform | null = null

// Add after the initialTransform declaration
const exportOptions = ref(false)
const exportProgress = ref(false)
const exportType = ref<'svg' | 'png' | 'pdf'>('svg')

// Initialize the force simulation
function initializeSimulation(width: number, height: number) {
  return (
    d3
      .forceSimulation<TableNode>()
      .force(
        'link',
        d3
          .forceLink<TableNode, TableLink>()
          .id((d: TableNode) => d.id)
          .distance(180) // more spacing between linked nodes
          .strength(0.8)
      ) // tighter pull between connected nodes
      .force('charge', d3.forceManyBody().strength(-600)) // less aggressive repulsion than -1000
      // d3.forceCenter has no strength() API; keep mild pull via forceX/forceY below
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(150)) // increased from 90 to 150 for more spacing
      .force('x', d3.forceX(width / 2).strength(0.05)) // weaker X pull
      .force('y', d3.forceY(height / 2).strength(0.05)) // weaker Y pull
      .velocityDecay(0.6) // more damping = faster stabilization
      .alphaMin(0.002) // a bit higher: stops earlier
      .alphaDecay(0.03)
  ) // cools down faster
}

// Add this helper function before determineRelationshipType
function isJunctionTable(tableName: string): boolean {
  const table = props.tables.find((t) => t.name === tableName)
  if (!table?.foreignKeys) return false

  // A junction table typically has exactly 2 foreign keys and they are also part of its primary key
  return (
    table.foreignKeys.length === 2 &&
    table.primaryKeys?.length === 2 &&
    table.foreignKeys.every((fk) => table.primaryKeys?.includes(fk.sourceColumn))
  )
}

// determineRelationshipType helper removed (unused)

function formatColumnType(column: { type?: string }): string {
  // The schema store already formats types with size info, so we just need to apply shortcuts
  let type = column.type || ''

  // Shorten common long type names while preserving size information
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

  // Apply shortcuts while preserving size information
  for (const [longForm, shortForm] of Object.entries(typeShortcuts)) {
    if (type.toLowerCase().startsWith(longForm)) {
      // Replace the type name but keep any size info that follows
      const sizeMatch = type.match(/\(.*\)$/)
      type = shortForm + (sizeMatch ? sizeMatch[0] : '')
      break
    }
  }

  return type
}

// Create the visualization
function createVisualization() {
  if (!svgContainer.value) return

  // Clear previous visualization
  d3.select(svgContainer.value).selectAll('*').remove()

  // Setup SVG
  const width = svgContainer.value.clientWidth
  const height = svgContainer.value.clientHeight || 1200

  svg = d3.select(svgContainer.value).append('svg').attr('width', width).attr('height', height)

  // Initialize zoom
  initializeZoom()
  svg.call(zoom)

  // Create a group for zoomable content
  const zoomGroup = svg.append('g').attr('class', 'zoom-group')

  // Add background grid
  createBackgroundGrid(zoomGroup, width, height)

  // Create markers for different relationship types
  const defs = zoomGroup.append('defs')

  // Create filter for drop shadow
  const filter = defs.append('filter').attr('id', 'drop-shadow').attr('height', '130%')

  // Shadow offset
  filter.append('feOffset').attr('dx', 0).attr('dy', 3).attr('result', 'offsetBlur')

  // Shadow blur
  filter
    .append('feGaussianBlur')
    .attr('in', 'SourceAlpha')
    .attr('stdDeviation', 3)
    .attr('result', 'blur')

  // Shadow opacity
  filter.append('feComponentTransfer').append('feFuncA').attr('type', 'linear').attr('slope', 0.2)

  // Merge source with shadow
  filter
    .append('feMerge')
    .selectAll('feMergeNode')
    .data(['offsetBlur', 'SourceGraphic'])
    .enter()
    .append('feMergeNode')
    .attr('in', (d: string) => d)

  // Create marker definitions for regular relationships (teal blue)
  // Mandatory One (|) - Teal blue version
  defs
    .append('marker')
    .attr('id', 'mandatory-one')
    .attr('viewBox', '-10 -10 20 20')
    .attr('refX', 10)
    .attr('refY', 0)
    .attr('markerWidth', 12)
    .attr('markerHeight', 12)
    .attr('orient', 'auto')
    .append('path')
    .attr('d', 'M-8,-8L-8,8') // Vertical bar
    .attr('stroke', BRAND_COLORS.primary) // Teal blue
    .attr('stroke-width', '2.5')

  // Mandatory Many (crow's foot) - Teal blue version - Smaller size when selected
  defs
    .append('marker')
    .attr('id', 'mandatory-many')
    .attr('viewBox', '-10 -10 20 20')
    .attr('refX', 8)
    .attr('refY', 0)
    .attr('markerWidth', 10) // Reduced from 12
    .attr('markerHeight', 10) // Reduced from 12
    .attr('orient', 'auto')
    .append('path')
    .attr('d', 'M-8,0L0,-7M-8,0L0,7M-8,-7L-8,7') // Slightly smaller crow's foot
    .attr('stroke', BRAND_COLORS.primary) // Teal blue
    .attr('stroke-width', '2') // Slightly thinner lines
    .attr('fill', 'none')

  // Double bar for one-to-one relationships - Teal blue version
  defs
    .append('marker')
    .attr('id', 'mandatory-one-to-one')
    .attr('viewBox', '-10 -10 20 20')
    .attr('refX', 10)
    .attr('refY', 0)
    .attr('markerWidth', 10) // Reduced from 12
    .attr('markerHeight', 10) // Reduced from 12
    .attr('orient', 'auto')
    .append('path')
    .attr('d', 'M-9,-7L-9,7M-5,-7L-5,7') // Slightly smaller bars
    .attr('stroke', BRAND_COLORS.primary) // Teal blue
    .attr('stroke-width', '2') // Slightly thinner lines

  // Optional One (O|) - Teal blue version
  defs
    .append('marker')
    .attr('id', 'optional-one')
    .attr('viewBox', '-10 -10 20 20')
    .attr('refX', 10)
    .attr('refY', 0)
    .attr('markerWidth', 10) // Reduced from 12
    .attr('markerHeight', 10) // Reduced from 12
    .attr('orient', 'auto')
    .append('path')
    .attr('d', 'M-8,0 A3,3 0 1 1 -8,0.01M-8,4L-8,-4') // Circle with vertical bar
    .attr('stroke', BRAND_COLORS.primary) // Teal blue
    .attr('stroke-width', '2') // Slightly thinner lines
    .attr('fill', 'none')

  // Optional Many (crow's foot with circle) - Teal blue version
  defs
    .append('marker')
    .attr('id', 'optional-many')
    .attr('viewBox', '-10 -10 20 20')
    .attr('refX', 8)
    .attr('refY', 0)
    .attr('markerWidth', 10) // Reduced from 12
    .attr('markerHeight', 10) // Reduced from 12
    .attr('orient', 'auto')
    .append('path')
    .attr('d', 'M-8,0 A3,3 0 1 1 -8,0.01M-8,0L0,-7M-8,0L0,7M-8,-7L-8,7') // Slightly smaller
    .attr('stroke', BRAND_COLORS.primary) // Teal blue
    .attr('stroke-width', '2') // Slightly thinner lines
    .attr('fill', 'none')

  // Create marker definitions for junction relationships (orange)
  // Mandatory One (|) - Orange version
  defs
    .append('marker')
    .attr('id', 'junction-mandatory-one')
    .attr('viewBox', '-10 -10 20 20')
    .attr('refX', 10)
    .attr('refY', 0)
    .attr('markerWidth', 10) // Reduced from 12
    .attr('markerHeight', 10) // Reduced from 12
    .attr('orient', 'auto')
    .append('path')
    .attr('d', 'M-8,-7L-8,7') // Slightly smaller vertical bar
    .attr('stroke', BRAND_COLORS.secondary) // Orange
    .attr('stroke-width', '2') // Slightly thinner lines

  // Mandatory Many (crow's foot) - Orange version
  defs
    .append('marker')
    .attr('id', 'junction-mandatory-many')
    .attr('viewBox', '-10 -10 20 20')
    .attr('refX', 8)
    .attr('refY', 0)
    .attr('markerWidth', 10) // Reduced from 12
    .attr('markerHeight', 10) // Reduced from 12
    .attr('orient', 'auto')
    .append('path')
    .attr('d', 'M-8,0L0,-7M-8,0L0,7M-8,-7L-8,7') // Slightly smaller crow's foot
    .attr('stroke', BRAND_COLORS.secondary) // Orange
    .attr('stroke-width', '2') // Slightly thinner lines
    .attr('fill', 'none')

  // Double bar for one-to-one relationships - Orange version
  defs
    .append('marker')
    .attr('id', 'junction-mandatory-one-to-one')
    .attr('viewBox', '-10 -10 20 20')
    .attr('refX', 10)
    .attr('refY', 0)
    .attr('markerWidth', 10) // Reduced from 12
    .attr('markerHeight', 10) // Reduced from 12
    .attr('orient', 'auto')
    .append('path')
    .attr('d', 'M-9,-7L-9,7M-5,-7L-5,7') // Slightly smaller double bars
    .attr('stroke', BRAND_COLORS.secondary) // Orange
    .attr('stroke-width', '2') // Slightly thinner lines

  // Prepare data - combine tables and views with null checks
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

  // Update the links creation to include view relationships
  links = []

  // Process relationships and handle junction tables
  props.relations?.forEach((relation) => {
    // Check if this relationship involves a junction table
    if (isJunctionTable(relation.sourceTable)) {
      // Find the other foreign key in the junction table that points to the target table
      const junctionTable = props.tables.find((t) => t.name === relation.sourceTable)
      const otherForeignKey = junctionTable?.foreignKeys?.find(
        (fk) =>
          fk.sourceColumn !== relation.sourceColumn && fk.referencedTable !== relation.targetTable
      )

      if (otherForeignKey) {
        // For the relationship from referenced table to junction table
        links.push({
          source: otherForeignKey.referencedTable,
          target: relation.sourceTable,
          relationship: 'one-to-many',
          sourceMarker: undefined,
          targetMarker: 'junction-mandatory-many', // Use green crow's foot for junction table
          isJunctionRelation: true
        })

        // For the relationship from junction table to second referenced table
        links.push({
          source: relation.sourceTable,
          target: relation.targetTable,
          relationship: 'many-to-one',
          sourceMarker: undefined,
          targetMarker: 'junction-mandatory-one-to-one', // Use green double bar for junction table
          isJunctionRelation: true
        })
      }
    } else if (!isJunctionTable(relation.targetTable)) {
      // Regular relationship (not involving junction tables)
      // For regular FK relationships, we use a single line with appropriate markers
      links.push({
        source: relation.sourceTable, // Table with FK (source)
        target: relation.targetTable, // Referenced table (target)
        relationship: 'many-to-one',
        sourceMarker: undefined,
        targetMarker: 'mandatory-one-to-one', // Double bar on target (PK) end in blue
        isJunctionRelation: false
      })

      // Add a second line for the opposite direction
      links.push({
        source: relation.targetTable, // Referenced table
        target: relation.sourceTable, // FK table
        relationship: 'one-to-many',
        sourceMarker: undefined,
        targetMarker: 'mandatory-many', // Crow's foot on source table in blue
        isJunctionRelation: false
      })
    }
  })

  // Add a helper function to check if there's a junction table between two tables
  function hasManyToManyRelationship(table1Name: string, table2Name: string): boolean {
    // Get all junction tables
    const junctionTables = props.tables.filter((table) => isJunctionTable(table.name))

    // Check if any of them connects these two tables
    return junctionTables.some((junctionTable) => {
      if (!junctionTable.foreignKeys || junctionTable.foreignKeys.length !== 2) return false

      const referencedTables = junctionTable.foreignKeys.map((fk) => fk.referencedTable)
      return referencedTables.includes(table1Name) && referencedTables.includes(table2Name)
    })
  }

  // Process many-to-many relationships
  const processedJunctionRelations = new Set<string>()

  props.tables.forEach((table) => {
    if (isJunctionTable(table.name) && table.foreignKeys && table.foreignKeys.length === 2) {
      const [fk1, fk2] = table.foreignKeys
      const table1 = fk1.referencedTable
      const table2 = fk2.referencedTable

      // Create a unique key for this relationship to avoid duplicates
      const relationKey = [table1, table2].sort().join('-')

      if (!processedJunctionRelations.has(relationKey)) {
        processedJunctionRelations.add(relationKey)

        // Add the relationships through the junction table
        links.push({
          source: table1,
          target: table.name,
          relationship: 'one-to-many',
          sourceMarker: undefined,
          targetMarker: 'junction-mandatory-many',
          isJunctionRelation: true
        })

        links.push({
          source: table.name,
          target: table2,
          relationship: 'many-to-one',
          sourceMarker: undefined,
          targetMarker: 'junction-mandatory-one',
          isJunctionRelation: true
        })
      }
    }
  })

  // Filter out any incorrect direct relationships between tables that should be connected via junction tables
  links = links.filter((link) => {
    const source = typeof link.source === 'string' ? link.source : link.source.id
    const target = typeof link.target === 'string' ? link.target : link.target.id

    // Keep relationship if it involves a junction table
    if (isJunctionTable(source) || isJunctionTable(target)) {
      return true
    }

    // Remove direct relationship if there's a junction table connecting these tables
    return !hasManyToManyRelationship(source, target)
  })

  // Add view dependencies
  if (props.views?.length) {
    props.views.forEach((view) => {
      props.tables
        .filter((table) => view.name.toLowerCase().includes(table.name.toLowerCase()))
        .forEach((table) => {
          links.push({
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

  // Only proceed with visualization if we have data
  if (nodes.length === 0) {
    // Show "No data" message
    zoomGroup
      .append('text')
      .attr('x', width / 2)
      .attr('y', height / 2)
      .attr('text-anchor', 'middle')
      .attr('fill', '#6b7280')
      .text('No tables or views to display')
    return
  }

  // Create relationship lines
  linkGroup = zoomGroup
    .append('g')
    .selectAll<SVGGElement, TableLink>('g')
    .data(links)
    .join('g')
    .attr('class', 'relationship')

  // Add the main line with improved marker handling
  linkGroup
    .append('line')
    .attr('class', 'relationship-line')
    .attr('stroke', (d: TableLink) => {
      if (d.isViewDependency) return BRAND_COLORS.gray // Gray for view dependencies
      if (d.isJunctionRelation) return BRAND_COLORS.secondary // Orange for junction relations
      return BRAND_COLORS.primary // Teal blue for regular relations
    })
    .attr('stroke-width', '1.5')
    .attr('stroke-dasharray', (d: TableLink) => (d.isViewDependency ? '3,3' : 'none'))
    // Add marker only at the appropriate end - use empty string to remove marker
    .attr('marker-start', '') // Remove the start marker
    .attr('marker-end', (d: TableLink) => (d.targetMarker ? `url(#${d.targetMarker})` : '')) // Keep only the end marker
    // Add hover information to relationship lines
    .on('mouseenter', function (event: MouseEvent, d: TableLink) {
      const sourceTable = typeof d.source === 'string' ? d.source : d.source.id
      const targetTable = typeof d.target === 'string' ? d.target : d.target.id

      // Find the relationship info if available
      let relationshipType = ''
      if (d.isJunctionRelation) {
        relationshipType = 'Junction table relationship'
      } else if (d.isViewDependency) {
        relationshipType = 'View dependency'
      } else {
        relationshipType = 'Foreign key relationship'
      }

      // Create the tooltip
      const tooltip = svg
        .append('g')
        .attr('class', 'relationship-tooltip')
        .attr('pointer-events', 'none')

      // Add background
      tooltip
        .append('rect')
        .attr('rx', 4)
        .attr('ry', 4)
        .attr('fill', '#1f2937')
        .attr('opacity', 0.9)

      // Add text
      const text = tooltip
        .append('text')
        .attr('fill', 'white')
        .attr('font-size', '12px')
        .attr('x', 8)
        .attr('y', 16)

      text.append('tspan').attr('x', 8).attr('dy', 0).text(`${sourceTable} → ${targetTable}`)

      text.append('tspan').attr('x', 8).attr('dy', 18).text(`Type: ${relationshipType}`)

      // Get source and target tables for more details
      const sourceTableObj = props.tables.find((t) => t.name === sourceTable)

      // If we have foreign key info, add it
      if (sourceTableObj?.foreignKeys) {
        const fk = sourceTableObj.foreignKeys.find((fk) => fk.referencedTable === targetTable)

        if (fk) {
          text
            .append('tspan')
            .attr('x', 8)
            .attr('dy', 18)
            .text(`${fk.sourceColumn} → ${fk.referencedColumn}`)
        }
      }

      // Size and position the background rectangle based on text
      const bbox = text.node()?.getBBox()
      if (bbox) {
        tooltip
          .select('rect')
          .attr('width', bbox.width + 16)
          .attr('height', bbox.height + 16)

        // Position tooltip near mouse but not on top of it
        const [mouseX, mouseY] = d3.pointer(event)
        tooltip.attr('transform', `translate(${mouseX + 15},${mouseY - bbox.height - 15})`)
      }
    })
    .on('mouseleave', function () {
      // Remove tooltip on mouse leave
      svg.selectAll('.relationship-tooltip').remove()
    })

  // Create table/view nodes
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
      selectedTable.value = selectedTable.value === d.name ? null : d.name
      updateHighlighting()
    })

  // Add table background
  node
    .append('rect')
    .attr('class', 'table-background')
    .attr('width', 200) // Reverted back to 200
    .attr('height', (d: TableNode) => {
      const columnCount =
        props.tables.find((t) => t.name === d.name)?.columns.length ||
        props.views.find((v) => v.name === d.name)?.columns.length ||
        0
      return 30 + columnCount * 20 // Header + rows
    })
    .attr('rx', 8)
    .attr('ry', 8)
    .attr('fill', (d: TableNode) => (d.isView ? '#f8fbfe' : '#f8fafc')) // Lighter blue tint for views instead of pattern
    .attr('stroke', (d: TableNode) => (d.isView ? '#94a3b8' : '#cbd5e1'))
    .attr('stroke-width', (d: TableNode) => (d.isView ? 1.5 : 1))
    .attr('stroke-dasharray', (d: TableNode) => (d.isView ? '5,2' : 'none'))
    .attr('filter', 'url(#drop-shadow)')

  // Add table header
  const header = node.append('g').attr('class', 'table-header')

  // Header background - rounded only at the top corners
  header
    .append('rect')
    .attr('width', 200) // Reverted back to 200
    .attr('height', 30)
    .attr('rx', 8)
    .attr('ry', 8)
    .attr('fill', (d: TableNode) => (d.isView ? '#cbd5e1' : '#e2e8f0'))
    .attr('stroke', (d: TableNode) => (d.isView ? '#94a3b8' : '#cbd5e1'))
    .attr('stroke-width', 1.5)
    .attr('stroke-dasharray', (d: TableNode) => (d.isView ? '5,2' : 'none'))
    // Clip bottom corners to make them square
    .attr('clip-path', 'path("M0,30 L0,8 Q0,0 8,0 L192,0 Q200,0 200,8 L200,30 Z")') // Reverted back to 200 width

  // Add small view icon for views in the header
  header
    .filter((d: TableNode) => d.isView)
    .append('foreignObject')
    .attr('width', 20)
    .attr('height', 20)
    .attr('x', 172) // Reverted back to 172
    .attr('y', 5)
    .attr('class', 'view-icon').html(`
            <div xmlns="http://www.w3.org/1999/xhtml" style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5" style="color: #7e22ce;">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M7.5 3.75H6A2.25 2.25 0 0 0 3.75 6v1.5M16.5 3.75H18A2.25 2.25 0 0 1 20.25 6v1.5m0 9V18A2.25 2.25 0 0 1 18 20.25h-1.5m-9 0H6A2.25 2.25 0 0 1 3.75 18v-1.5M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                </svg>
            </div>
        `)

  // Add table body with straight top edge
  node
    .append('rect')
    .attr('class', 'table-body')
    .attr('width', 200) // Reverted back to 200
    .attr('height', (d: TableNode) => {
      const columnCount =
        props.tables.find((t) => t.name === d.name)?.columns.length ||
        props.views.find((v) => v.name === d.name)?.columns.length ||
        0
      return columnCount * 20 // rows
    })
    .attr('y', 30) // Below header
    .attr('fill', (d: TableNode) => (d.isView ? '#f8fafc' : '#f8fafc'))
    .attr('stroke', (d: TableNode) => (d.isView ? '#94a3b8' : '#e2e8f0'))
    .attr('stroke-width', (d: TableNode) => (d.isView ? 0.8 : 0.5))
    .attr('stroke-dasharray', (d: TableNode) => (d.isView ? '5,2' : 'none'))

  header
    .append('text')
    .text((d: TableNode) => {
      // Show schema-qualified name for non-public schemas
      if (d.schema && d.schema !== 'public' && d.schema !== '') {
        return `${d.schema}.${d.name}`
      }
      return d.name
    })
    .attr('x', 10)
    .attr('y', 20)
    .attr('fill', '#1e293b')
    .attr('font-weight', (d: TableNode) => (d.isView ? 400 : 600))
    .attr('font-style', (d: TableNode) => (d.isView ? 'italic' : 'normal'))
    .style('font-size', '13px')

  // Add columns with improved styling
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

      // Subtle row background for alternating rows
      if (i % 2 === 1) {
        row
          .append('rect')
          .attr('width', 200) // Reverted back to 200
          .attr('height', 20)
          .attr('fill', '#f1f5f9')
          .attr('opacity', 0.5)
      }

      // Column name with icon
      const isPK = table.primaryKeys?.includes(col.name)
      const isFK = table.foreignKeys?.some((fk) => fk.sourceColumn === col.name)

      // Use better icons for primary and foreign keys
      const prefix = isPK ? '🔑 ' : isFK ? '🔗 ' : ''

      // Create a column field with enhanced hover
      const colField = row
        .append('text')
        .attr('x', 10)
        .attr('y', 14)
        .attr('class', 'column-name')
        .attr('data-column-name', col.name)
        .attr(
          'fill',
          isPK ? BRAND_COLORS.primary : isFK ? BRAND_COLORS.secondary : BRAND_COLORS.grayDark
        )
        .style('font-size', '11px')
        .style('font-weight', isPK || isFK ? '500' : '400')
        .text(prefix + col.name)
        .style('cursor', 'help')

      // Measure the column name text width to prevent overlap
      const colFieldNode = colField.node()
      const colFieldWidth = colFieldNode ? colFieldNode.getBBox().width : 0

      // Calculate safe position for type text (minimum 10px gap)
      const minGap = 10
      const maxTypeX = 190 // Original position
      const safeTypeX = Math.max(10 + colFieldWidth + minGap, maxTypeX - 60) // Ensure at least 60px for type

      // If the column name is too long, truncate it with ellipsis
      const maxColumnWidth = 190 - 10 - minGap - 60 // Available space for column name
      if (colFieldWidth > maxColumnWidth) {
        // Truncate the text and add ellipsis
        let truncatedText = prefix + col.name
        const colFieldNodeForTruncation = colField.node()
        while (
          colFieldNodeForTruncation &&
          colFieldNodeForTruncation.getBBox().width > maxColumnWidth &&
          truncatedText.length > prefix.length + 3
        ) {
          truncatedText = truncatedText.slice(0, -1)
          colField.text(truncatedText + '...')
        }
      }

      // Add hover functionality for fields
      if (isPK || isFK) {
        colField
          .on('mouseenter', function (event: MouseEvent) {
            // Build relationship information
            let relationships: string[] = []

            if (isPK) {
              // Find tables that reference this primary key
              props.tables.forEach((t) => {
                t.foreignKeys?.forEach((fk) => {
                  if (fk.referencedTable === d.name && fk.referencedColumn === col.name) {
                    // Show schema-qualified name for non-public schemas
                    const tableName =
                      t.schema && t.schema !== 'public' && t.schema !== ''
                        ? `${t.schema}.${t.name}`
                        : t.name
                    relationships.push(`${tableName}.${fk.sourceColumn} references this column`)
                  }
                })
              })
            }

            if (isFK) {
              // Find the referenced table/column
              table.foreignKeys?.forEach((fk) => {
                if (fk.sourceColumn === col.name) {
                  // Find the referenced table to get its schema
                  const referencedTable = props.tables.find((t) => t.name === fk.referencedTable)
                  const referencedTableName =
                    referencedTable?.schema &&
                    referencedTable.schema !== 'public' &&
                    referencedTable.schema !== ''
                      ? `${referencedTable.schema}.${referencedTable.name}`
                      : fk.referencedTable
                  relationships.push(`References ${referencedTableName}.${fk.referencedColumn}`)
                }
              })
            }

            // Create tooltip
            const tooltip = svg
              .append('g')
              .attr('class', 'field-tooltip')
              .attr('pointer-events', 'none')

            // Add background
            tooltip
              .append('rect')
              .attr('rx', 4)
              .attr('ry', 4)
              .attr('fill', '#1f2937')
              .attr('opacity', 0.9)

            // Add text
            const text = tooltip
              .append('text')
              .attr('fill', 'white')
              .attr('font-size', '12px')
              .attr('x', 8)
              .attr('y', 16)

            text
              .append('tspan')
              .attr('x', 8)
              .attr('dy', 0)
              .text(() => {
                // Show schema-qualified name for non-public schemas
                const tableName =
                  d.schema && d.schema !== 'public' && d.schema !== ''
                    ? `${d.schema}.${d.name}`
                    : d.name
                return `${tableName}.${col.name}`
              })

            text
              .append('tspan')
              .attr('x', 8)
              .attr('dy', 18)
              .text(
                `Type: ${formatColumnType(col)}${isPK ? ', Primary Key' : ''}${isFK ? ', Foreign Key' : ''}`
              )

            // Add relationship info
            relationships.forEach((rel) => {
              text.append('tspan').attr('x', 8).attr('dy', 18).text(rel)
            })

            // Size and position the background rectangle based on text
            const bbox = text.node()?.getBBox()
            if (bbox) {
              tooltip
                .select('rect')
                .attr('width', bbox.width + 16)
                .attr('height', bbox.height + 16)

              // Get SVG coordinates
              const svgPoint = svg.node()?.createSVGPoint()
              if (svgPoint) {
                svgPoint.x = event.clientX
                svgPoint.y = event.clientY

                // Get CTM for transformations
                const ctm = svg.node()?.getScreenCTM()
                if (ctm) {
                  // Transform client coordinates to SVG coordinates
                  const pt = svgPoint.matrixTransform(ctm.inverse())

                  // Get current transform to account for zoom/pan
                  const transform = d3.zoomTransform(svg.node() as Element)

                  // Position tooltip - ensure it stays within view
                  const xPos = pt.x + 15
                  const yPos = pt.y - bbox.height - 15

                  // Get container dimensions
                  const containerWidth = svgContainer.value?.clientWidth || 1000
                  const containerHeight = svgContainer.value?.clientHeight || 800

                  // Adjust position if tooltip would go out of bounds
                  const tooltipWidth = bbox.width + 16
                  const tooltipHeight = bbox.height + 16

                  // Adjust horizontal position if needed
                  let adjustedX = xPos
                  if (xPos + tooltipWidth > containerWidth / transform.k) {
                    adjustedX = Math.max(0, xPos - tooltipWidth - 15)
                  }

                  // Adjust vertical position if needed
                  let adjustedY = yPos
                  if (yPos < 0) {
                    adjustedY = pt.y + 25 // Show below the cursor instead
                  }

                  tooltip.attr('transform', `translate(${adjustedX},${adjustedY})`)
                }
              }
            }
          })
          .on('mouseleave', function () {
            // Remove tooltip on mouse leave
            svg.selectAll('.field-tooltip').remove()
          })
      }

      // Column type - positioned at the right with more space
      row
        .append('text')
        .attr('x', 190) // Reverted back to 190
        .attr('y', 14)
        .attr('text-anchor', 'end')
        .attr('fill', '#64748b')
        .style('font-size', '11px')
        .text(formatColumnType(col))
    })
  })

  // Initialize simulation
  simulation = initializeSimulation(width, height).nodes(nodes)

  simulation
    .force<d3.ForceLink<TableNode, TableLink>>('link')!
    .links(links)
    .distance(linkDistance.value)

  // Update positions on each tick
  simulation.on('tick', () => {
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
          200, // Reverted back to 200
          getTableHeight(source),
          true // Add padding for better visibility
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
          200, // Reverted back to 200
          getTableHeight(source),
          true // Add padding for better visibility
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
          200, // Reverted back to 200
          getTableHeight(target),
          true // Add padding for better visibility
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
          200, // Reverted back to 200
          getTableHeight(target),
          true // Add padding for better visibility
        )
        return (target.y || 0) + offsetY
      })
      // Re-apply marker attributes on each tick to ensure they're visible and properly positioned
      .attr('marker-start', '') // No marker on source
      .attr('marker-end', (d: TableLink) => (d.targetMarker ? `url(#${d.targetMarker})` : '')) // Only end marker

    // Update node positions
    node.attr('transform', (d: TableNode) => {
      const x = (d.x || 0) - 100 // Center horizontally (200/2)
      const y = (d.y || 0) - getTableHeight(d) / 2 // Center vertically
      return `translate(${x},${y})`
    })
  })

  // Add click handler to clear selection when clicking background
  svg.on('click', () => {
    selectedTable.value = null
    updateHighlighting()
  })

  // Store initial transform for reset functionality
  initialTransform = d3.zoomIdentity.translate(width / 2, height / 2).scale(1)
}

// Drag handlers
function dragstarted(event: d3.D3DragEvent<SVGGElement, TableNode, TableNode>) {
  if (!event.active) simulation.alphaTarget(0.1).restart() // Reduce alpha target
  event.subject.fx = event.subject.x
  event.subject.fy = event.subject.y
}

function dragged(event: d3.D3DragEvent<SVGGElement, TableNode, TableNode>) {
  event.subject.fx = event.x
  event.subject.fy = event.y
}

function dragended(event: d3.D3DragEvent<SVGGElement, TableNode, TableNode>) {
  if (!event.active) simulation.alphaTarget(0)
  // Fix the node position where it was dropped
  event.subject.fx = event.x
  event.subject.fy = event.y

  // Optional: To completely stop movement after drag, you can stop the simulation
  simulation.stop()
}

// Handle window resize
function handleResize() {
  if (svgContainer.value) {
    createVisualization()
  }
}

// Lifecycle hooks
onMounted(() => {
  createVisualization()
  window.addEventListener('resize', handleResize)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
  if (simulation) {
    simulation.stop()
  }
})

// Watch for data changes
watch(
  [() => props.tables, () => props.relations, () => props.views],
  () => {
    createVisualization()
  },
  { deep: true }
)

// Add after the initializeSimulation function:
function updateForces() {
  if (!simulation) return

  const linkForce = simulation.force('link') as d3.ForceLink<TableNode, TableLink> | undefined
  if (linkForce) {
    linkForce.distance(linkDistance.value)
  }

  const chargeForce = simulation.force('charge') as d3.ForceManyBody<TableNode> | undefined
  if (chargeForce) {
    chargeForce.strength(chargeStrength.value)
  }

  const collisionForce = simulation.force('collision') as d3.ForceCollide<TableNode> | undefined
  if (collisionForce) {
    collisionForce.radius(collisionRadius.value)
  }

  simulation.alpha(0.3).restart()
}

// Watch for control changes
watch(
  [linkDistance, chargeStrength, collisionRadius],
  () => {
    updateForces()
  },
  { immediate: true }
)

function initializeZoom() {
  zoom = d3
    .zoom<SVGSVGElement, unknown>()
    .scaleExtent([minZoom, maxZoom])
    .on('zoom', (event: d3.D3ZoomEvent<SVGSVGElement, unknown>) => {
      currentZoom.value = event.transform.k
      svg.select('g.zoom-group').attr('transform', event.transform.toString())
    })
}

function handleZoom(direction: 'in' | 'out') {
  if (!svg || !zoom) return

  const factor = direction === 'in' ? 1.2 : 0.8
  const newZoom = Math.max(minZoom, Math.min(maxZoom, currentZoom.value * factor))

  svg.transition().duration(300).call(zoom.scaleTo, newZoom)
}

// Update the findRelatedTables function
function findRelatedTables(tableName: string, currentLinks: TableLink[]): Set<string> {
  const related = new Set<string>()

  currentLinks.forEach((link: TableLink) => {
    const source = typeof link.source === 'string' ? link.source : link.source.id
    const target = typeof link.target === 'string' ? link.target : link.target.id

    if (source === tableName) {
      related.add(target)
    } else if (target === tableName) {
      related.add(source)
    }
  })

  return related
}

// Update the findRelatedFields function to track relationships between fields
function findRelatedFields(tableName: string): {
  fields: Set<string>
  relationships: RelatedField[]
} {
  const fields = new Set<string>()
  const relationships: RelatedField[] = []

  // Get foreign key relationships for the selected table
  const table = props.tables.find((t) => t.name === tableName)
  if (table?.foreignKeys) {
    table.foreignKeys.forEach((fk) => {
      fields.add(fk.sourceColumn)
      fields.add(fk.referencedColumn)
      relationships.push({
        tableName: tableName,
        fieldName: fk.sourceColumn,
        relatedTableName: fk.referencedTable,
        relatedFieldName: fk.referencedColumn
      })
    })
  }

  // Get foreign keys pointing to this table
  props.tables.forEach((t) => {
    t.foreignKeys?.forEach((fk) => {
      if (fk.referencedTable === tableName) {
        fields.add(fk.sourceColumn)
        fields.add(fk.referencedColumn)
        relationships.push({
          tableName: t.name,
          fieldName: fk.sourceColumn,
          relatedTableName: tableName,
          relatedFieldName: fk.referencedColumn
        })
      }
    })
  })

  return { fields, relationships }
}

// Update the updateHighlighting function
function updateHighlighting() {
  const relatedTables = selectedTable.value
    ? findRelatedTables(selectedTable.value, links)
    : new Set<string>()
  const { fields, relationships } = selectedTable.value
    ? findRelatedFields(selectedTable.value)
    : { fields: new Set<string>(), relationships: [] }

  // Update table highlighting
  node.each(function (d: TableNode) {
    const element = d3.select(this as SVGGElement)
    const isSelected = d.name === selectedTable.value
    const isRelated = relatedTables.has(d.name)

    // Update table header highlighting
    element
      .select('.table-header rect')
      .transition()
      .duration(300)
      .attr(
        'stroke',
        isSelected ? BRAND_COLORS.primary : isRelated ? BRAND_COLORS.secondary : '#cbd5e1'
      )
      .attr('stroke-width', isSelected || isRelated ? 2.5 : 1.5)
      .attr(
        'fill',
        isSelected
          ? BRAND_COLORS.highlight.blue
          : isRelated
            ? BRAND_COLORS.highlight.orange
            : BRAND_COLORS.grayLight
      )

    // Apply a subtle highlight effect to the whole table
    element
      .select('rect.table-body')
      .transition()
      .duration(300)
      .attr('fill', isSelected ? '#f1f5f9' : isRelated ? '#fff7ed' : BRAND_COLORS.background)
      .attr('stroke', isSelected ? '#bfdbfe' : isRelated ? '#fed7aa' : '#cbd5e1')
      .attr('stroke-width', isSelected || isRelated ? 1.5 : 1)

    // Dim unrelated tables
    element
      .transition()
      .duration(300)
      .style('opacity', !selectedTable.value || isSelected || isRelated ? 1 : 0.4)

    // Highlight related fields
    element.selectAll<SVGTextElement, unknown>('.column-name').each(function (
      this: SVGTextElement,
      _: unknown,
      i: number
    ) {
      const text = d3.select<SVGTextElement, unknown>(this)
      const fieldName = this.getAttribute('data-column-name') || ''

      // Find relationships for this field
      const fieldRelationships = relationships.filter(
        (r) =>
          (r.tableName === d.name && r.fieldName === fieldName) ||
          (r.relatedTableName === d.name && r.relatedFieldName === fieldName)
      )

      if (fieldRelationships.length > 0) {
        // This field is part of a relationship
        const isPrimaryKey = fieldRelationships.some(
          (r) => r.relatedTableName === d.name && r.relatedFieldName === fieldName
        )

        text
          .transition()
          .duration(300)
          .style('font-weight', '600')
          .attr('fill', isPrimaryKey ? BRAND_COLORS.primary : BRAND_COLORS.secondary)
          .attr(
            'data-tooltip',
            fieldRelationships
              .map(
                (r) => `${r.tableName}.${r.fieldName} → ${r.relatedTableName}.${r.relatedFieldName}`
              )
              .join('\n')
          )
      } else if (selectedTable.value) {
        // Reset style for unrelated fields when a table is selected
        text
          .transition()
          .duration(300)
          .style('font-weight', '400')
          .attr('fill', BRAND_COLORS.grayDark)
          .attr('data-tooltip', null)
      }
    })
  })

  // Update relationship line highlighting with more subtle thickness changes
  if (linkGroup) {
    linkGroup
      .selectAll<SVGLineElement, TableLink>('line')
      .transition()
      .duration(300)
      .attr('stroke-width', function (this: SVGLineElement, d: TableLink) {
        const source = typeof d.source === 'string' ? d.source : d.source.id
        const target = typeof d.target === 'string' ? d.target : d.target.id
        return selectedTable.value &&
          (source === selectedTable.value || target === selectedTable.value)
          ? '2'
          : '1.5'
      })
      .style('opacity', function (this: SVGLineElement, d: TableLink) {
        if (!selectedTable.value) return 1
        const source = typeof d.source === 'string' ? d.source : d.source.id
        const target = typeof d.target === 'string' ? d.target : d.target.id
        return source === selectedTable.value || target === selectedTable.value ? 1 : 0.15
      })
  }
}

// Calculate connection points to ensure lines connect properly to table borders
function calculateConnectionPoint(
  sourceX: number,
  sourceY: number,
  targetX: number,
  targetY: number,
  tableWidth: number,
  tableHeight: number,
  withPadding = false
): [number, number] {
  // Calculate the angle between source and target
  const angle = Math.atan2(targetY - sourceY, targetX - sourceX)

  // Table dimensions
  const padding = 0 // No padding to ensure lines reach table borders
  const width = tableWidth || 200
  const height = tableHeight || 30

  // Half dimensions
  const halfWidth = width / 2
  const halfHeight = height / 2

  // Calculate intersection point with rectangle
  let x, y

  // Determine which edge to intersect with based on angle
  if (Math.abs(Math.cos(angle)) > Math.abs(Math.sin(angle))) {
    // Intersect with left or right edge
    x = Math.cos(angle) > 0 ? halfWidth : -halfWidth
    y = Math.tan(angle) * x

    // If intersection point is beyond the top or bottom edge, adjust
    if (Math.abs(y) > halfHeight) {
      y = Math.sign(y) * halfHeight
      x = y / Math.tan(angle)
    }
  } else {
    // Intersect with top or bottom edge
    y = Math.sin(angle) > 0 ? halfHeight : -halfHeight
    x = y / Math.tan(angle)

    // If intersection point is beyond the left or right edge, adjust
    if (Math.abs(x) > halfWidth) {
      x = Math.sign(x) * halfWidth
      y = Math.tan(angle) * x
    }
  }

  return [x, y]
}

// Add helper function to calculate table height
function getTableHeight(table: TableNode): number {
  const baseHeight = 30 // Header height
  const rowHeight = 20 // Height per row
  const numColumns =
    props.tables.find((t) => t.name === table.name)?.columns.length ||
    props.views.find((v) => v.name === table.name)?.columns.length ||
    0
  return baseHeight + numColumns * rowHeight
}

// Add a function to create the background grid
function createBackgroundGrid(
  container: d3.Selection<SVGGElement, unknown, null, undefined>,
  width: number,
  height: number
) {
  const currentGridSize = gridSize.value // Use the ref value
  const majorGridSize = currentGridSize * 4 // Size for major grid lines (every 4 cells)

  // Create a pattern for the grid
  const defs = container.append('defs')

  // Create a pattern element
  const pattern = defs
    .append('pattern')
    .attr('id', 'grid')
    .attr('width', currentGridSize)
    .attr('height', currentGridSize)
    .attr('patternUnits', 'userSpaceOnUse')

  // Add minor grid lines
  pattern
    .append('path')
    .attr('d', `M ${currentGridSize} 0 L 0 0 0 ${currentGridSize}`)
    .attr('fill', 'none')
    .attr('stroke', '#e5e7eb')
    .attr('stroke-width', 0.5)

  // Create a background rectangle with the pattern
  container
    .append('rect')
    .attr('width', width * 4) // Make the grid larger than view
    .attr('height', height * 4)
    .attr('x', -width) // Position to ensure grid covers entire panning area
    .attr('y', -height)
    .attr('fill', 'url(#grid)')
    .attr('class', 'grid-background')

  // Create major grid lines
  const majorGrid = container.append('g').attr('class', 'major-grid')

  // Vertical major grid lines
  for (let i = 0; i < (width * 4) / majorGridSize; i++) {
    majorGrid
      .append('line')
      .attr('x1', i * majorGridSize - width)
      .attr('y1', -height)
      .attr('x2', i * majorGridSize - width)
      .attr('y2', height * 3)
      .attr('stroke', '#d1d5db')
      .attr('stroke-width', 1)
  }

  // Horizontal major grid lines
  for (let i = 0; i < (height * 4) / majorGridSize; i++) {
    majorGrid
      .append('line')
      .attr('x1', -width)
      .attr('y1', i * majorGridSize - height)
      .attr('x2', width * 3)
      .attr('y2', i * majorGridSize - height)
      .attr('stroke', '#d1d5db')
      .attr('stroke-width', 1)
  }
}

// Add function to reset view to original position and zoom
function resetView() {
  if (svg && initialTransform) {
    svg.transition().duration(750).call(zoom.transform, initialTransform)
  }
}

// Add before the end of the script setup
// Function to save the diagram as SVG or PNG
function saveDiagram() {
  if (!svgContainer.value || !svg) return

  exportProgress.value = true

  try {
    // Use timeout to allow UI to update before processing
    setTimeout(() => {
      if (exportType.value === 'svg') {
        exportAsSVG()
      } else if (exportType.value === 'png') {
        exportAsPNG()
      } else if (exportType.value === 'pdf') {
        exportAsPDF()
      }
      exportProgress.value = false
      exportOptions.value = false
    }, 100)
  } catch (error) {
    console.error('Error exporting diagram:', error)
    exportProgress.value = false
  }
}

function exportAsSVG() {
  // Clone the SVG to avoid modifying the displayed one
  const svgCopy = svg.node()?.cloneNode(true) as SVGElement

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

// Update the exportAsPNG function to include proper null check
function exportAsPNG() {
  if (!svgContainer.value) return

  exportProgress.value = true

  try {
    // We'll use html2canvas which is more reliable for capturing DOM elements
    import('html2canvas')
      .then((html2canvasModule) => {
        const html2canvas = html2canvasModule.default

        // Capture the SVG container with TypeScript null check
        const element = svgContainer.value
        if (!element) {
          alert('SVG container not found. Please try SVG format instead.')
          exportProgress.value = false
          return
        }

        html2canvas(element, {
          allowTaint: true,
          useCORS: true,
          backgroundColor: 'white',
          scale: 2 // Higher quality
        })
          .then((canvas) => {
            // Convert to data URL
            const dataUrl = canvas.toDataURL('image/png')

            // Create download link
            const link = document.createElement('a')
            link.download = 'database-diagram.png'
            link.href = dataUrl
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)

            exportProgress.value = false
          })
          .catch((error) => {
            console.error('Error rendering canvas:', error)
            alert('Failed to export as PNG. Please try SVG format instead.')
            exportProgress.value = false
          })
      })
      .catch((error) => {
        console.error('Error loading html2canvas:', error)
        alert('Failed to load html2canvas library. Please try SVG format instead.')
        exportProgress.value = false
      })
  } catch (error) {
    console.error('Error in PNG export:', error)
    alert('An unexpected error occurred. Please try SVG format instead.')
    exportProgress.value = false
  }
}

// Update the PDF export function to use html2canvas as well
function exportAsPDF() {
  if (!svgContainer.value) return

  exportProgress.value = true

  try {
    // First load html2canvas
    import('html2canvas')
      .then((html2canvasModule) => {
        const html2canvas = html2canvasModule.default

        // Capture the SVG container with TypeScript null check
        const element = svgContainer.value
        if (!element) {
          alert('SVG container not found. Please try SVG format instead.')
          exportProgress.value = false
          return
        }

        html2canvas(element, {
          allowTaint: true,
          useCORS: true,
          backgroundColor: 'white',
          scale: 2 // Higher quality
        })
          .then((canvas) => {
            // Now load jsPDF
            import('jspdf')
              .then((jsPDFModule) => {
                try {
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

                  exportProgress.value = false
                } catch (error) {
                  console.error('Error creating PDF:', error)
                  alert('Failed to create PDF. Please try SVG format instead.')
                  exportProgress.value = false
                }
              })
              .catch((error) => {
                console.error('Error loading jsPDF:', error)
                alert('Failed to load PDF library. Please try SVG format instead.')
                exportProgress.value = false
              })
          })
          .catch((error) => {
            console.error('Error rendering canvas:', error)
            alert('Failed to export as PDF. Please try SVG format instead.')
            exportProgress.value = false
          })
      })
      .catch((error) => {
        console.error('Error loading html2canvas:', error)
        alert('Failed to load html2canvas library. Please try SVG format instead.')
        exportProgress.value = false
      })
  } catch (error) {
    console.error('Error in PDF export:', error)
    alert('An unexpected error occurred. Please try SVG format instead.')
    exportProgress.value = false
  }
}
</script>

<template>
  <div class="relative">
    <div ref="svgContainer" class="w-full h-[2000px] bg-gray-50 rounded-lg"></div>

    <!-- Controls Panel with Tailwind classes -->
    <div
      class="absolute top-4 right-4 p-3 min-w-[220px] bg-white rounded-lg shadow-lg border border-gray-200 space-y-2.5 z-10"
    >
      <!-- Zoom Controls with Reset Button and Export Button -->
      <div class="flex items-center justify-between mb-1">
        <span class="text-xs font-medium text-gray-700">Zoom</span>
        <div class="flex items-center gap-1">
          <button
            class="p-1 hover:bg-gray-100 rounded text-gray-600 hover:text-gray-900 transition-colors focus:outline-none focus:ring-1 focus:ring-cyan-500 focus:ring-offset-1"
            @click="handleZoom('out')"
          >
            <MinusIcon class="w-3.5 h-3.5" />
          </button>
          <span class="text-xs text-gray-600 min-w-[40px] text-center tabular-nums">
            {{ Math.round(currentZoom * 100) }}%
          </span>
          <button
            class="p-1 hover:bg-gray-100 rounded text-gray-600 hover:text-gray-900 transition-colors focus:outline-none focus:ring-1 focus:ring-cyan-500 focus:ring-offset-1"
            @click="handleZoom('in')"
          >
            <PlusIcon class="w-3.5 h-3.5" />
          </button>
          <button
            class="p-1 ml-1 hover:bg-gray-100 rounded text-gray-600 hover:text-gray-900 transition-colors focus:outline-none focus:ring-1 focus:ring-cyan-500 focus:ring-offset-1"
            title="Reset view"
            @click="resetView"
          >
            <ArrowPathIcon class="w-3.5 h-3.5" />
          </button>
          <button
            class="p-1 ml-1 hover:bg-gray-100 rounded text-gray-600 hover:text-gray-900 transition-colors focus:outline-none focus:ring-1 focus:ring-cyan-500 focus:ring-offset-1"
            title="Export diagram"
            @click="exportOptions = !exportOptions"
          >
            <ArrowDownTrayIcon class="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <!-- Export Options Panel -->
      <div v-if="exportOptions" class="p-2 mb-1 bg-gray-50 rounded border border-gray-200">
        <div class="flex items-center mb-2">
          <span class="text-xs font-medium text-gray-700 mr-auto">Export Format</span>
        </div>
        <div class="flex gap-2 mb-2 flex-wrap">
          <label class="inline-flex items-center cursor-pointer">
            <input
              v-model="exportType"
              type="radio"
              value="svg"
              class="form-radio h-3.5 w-3.5 text-gray-500 focus:ring-gray-400"
            />
            <span class="ml-1.5 text-xs text-gray-700">SVG</span>
          </label>
          <label class="inline-flex items-center cursor-pointer">
            <input
              v-model="exportType"
              type="radio"
              value="png"
              class="form-radio h-3.5 w-3.5 text-gray-500 focus:ring-gray-400"
            />
            <span class="ml-1.5 text-xs text-gray-700">PNG</span>
          </label>
          <label class="inline-flex items-center cursor-pointer">
            <input
              v-model="exportType"
              type="radio"
              value="pdf"
              class="form-radio h-3.5 w-3.5 text-gray-500 focus:ring-gray-400"
            />
            <span class="ml-1.5 text-xs text-gray-700">PDF</span>
          </label>
        </div>
        <button
          class="w-full py-1 bg-gray-500 hover:bg-gray-600 text-white text-xs font-medium rounded focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-1 transition-colors"
          :disabled="exportProgress"
          @click="saveDiagram"
        >
          <span v-if="exportProgress">Exporting...</span>
          <span v-else>Download {{ exportType.toUpperCase() }}</span>
        </button>
      </div>

      <!-- Force Controls -->
      <div class="space-y-2">
        <div>
          <div class="flex items-center justify-between mb-1">
            <label class="text-xs font-medium text-gray-700">Link Distance</label>
            <span class="text-xs text-gray-500 tabular-nums">{{ linkDistance }}px</span>
          </div>
          <input
            v-model="linkDistance"
            type="range"
            min="100"
            max="500"
            step="20"
            class="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer slider-gray"
            @input="updateForces"
          />
        </div>

        <div>
          <div class="flex items-center justify-between mb-1">
            <label class="text-xs font-medium text-gray-700">Charge Strength</label>
            <span class="text-xs text-gray-500 tabular-nums">{{ chargeStrength }}</span>
          </div>
          <input
            v-model="chargeStrength"
            type="range"
            min="-3000"
            max="-200"
            step="100"
            class="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer slider-gray"
            @input="updateForces"
          />
        </div>

        <div>
          <div class="flex items-center justify-between mb-1">
            <label class="text-xs font-medium text-gray-700">Collision Radius</label>
            <span class="text-xs text-gray-500 tabular-nums">{{ collisionRadius }}px</span>
          </div>
          <input
            v-model="collisionRadius"
            type="range"
            min="60"
            max="200"
            step="10"
            class="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer slider-gray"
            @input="updateForces"
          />
        </div>
      </div>
    </div>

    <!-- Legend with Tailwind classes -->
    <div
      class="absolute top-4 left-4 p-3 bg-white bg-opacity-95 rounded-lg shadow-md border border-gray-200 z-10"
    >
      <h4 class="text-xs font-semibold text-gray-700 mb-1.5">Legend</h4>
      <div class="space-y-1.5">
        <div class="flex items-center">
          <div class="w-4 h-4 mr-2 bg-white border border-gray-300 rounded"></div>
          <span class="text-xs text-gray-700">Table</span>
        </div>
        <div class="flex items-center">
          <ViewfinderCircleIcon class="w-4 h-4 mr-2 text-purple-600" />
          <span class="text-xs text-gray-700 italic font-medium">View</span>
        </div>
        <div class="flex items-center">
          <div class="w-5 h-0.5 mr-2 bg-cyan-500"></div>
          <span class="text-xs text-gray-700">Foreign Key</span>
        </div>
        <div class="flex items-center">
          <div class="w-5 h-0.5 mr-2 bg-orange-500"></div>
          <span class="text-xs text-gray-700">Junction Table</span>
        </div>
        <div class="flex items-center">
          <div class="w-5 h-0.5 mr-2 border-t border-gray-400 border-dashed"></div>
          <span class="text-xs text-gray-700">View Dependency</span>
        </div>
      </div>
    </div>
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

/* Table header styling */
.table-header rect {
  transition:
    fill 0.3s ease,
    stroke 0.3s ease;
}

/* View icon styling */
.view-icon {
  opacity: 0.8;
}

/* Smooth transitions */
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

/* Add tooltip styles */
.column-group text[data-tooltip] {
  cursor: help;
}

.column-group text[data-tooltip]:hover::after {
  content: attr(data-tooltip);
  position: absolute;
  background: #1f2937;
  color: white;
  padding: 0.75rem;
  border-radius: 0.5rem;
  font-size: 0.75rem;
  white-space: pre;
  z-index: 10;
  max-width: 320px;
  transform: translateY(-100%);
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
}

/* Slider styles */
.slider-gray::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #64748b;
  /* slate-500 */
  cursor: pointer;
}

.slider-gray::-moz-range-thumb {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #64748b;
  /* slate-500 */
  cursor: pointer;
  border: none;
}

.slider-gray:focus {
  outline: none;
}

.slider-gray:focus::-webkit-slider-thumb {
  box-shadow: 0 0 0 2px rgba(100, 116, 139, 0.2);
}

.slider-gray:focus::-moz-range-thumb {
  box-shadow: 0 0 0 2px rgba(100, 116, 139, 0.2);
}

:root {
  --brand-primary-color: #00b2d6;
  --brand-secondary-color: #f26627;
}
</style>
