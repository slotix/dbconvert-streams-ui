<script setup lang="ts">
import { ref, onMounted, watch, onBeforeUnmount } from 'vue'
import * as d3 from 'd3'
import type { Table, Relationship } from '@/types/schema'
import { PlusIcon, MinusIcon } from '@heroicons/vue/24/outline'

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

const props = withDefaults(defineProps<{
    tables: Table[]
    relations: Relationship[]
    views: Table[]
}>(), {
    tables: () => [],
    relations: () => [],
    views: () => []
})

const svgContainer = ref<HTMLElement>()
let simulation: d3.Simulation<TableNode, TableLink>
let svg: d3.Selection<SVGSVGElement, unknown, null, undefined>

// Add after the props definition:
const linkDistance = ref(150)
const chargeStrength = ref(-1000)
const collisionRadius = ref(80)

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

// Initialize the force simulation
function initializeSimulation(width: number, height: number) {
    return d3.forceSimulation<TableNode>()
        .force('link', d3.forceLink<TableNode, TableLink>().id((d) => d.id).distance(linkDistance.value))
        .force('charge', d3.forceManyBody().strength(chargeStrength.value))
        .force('center', d3.forceCenter(width / 2, height / 2).strength(0.05)) // Reduce center force
        .force('collision', d3.forceCollide().radius(collisionRadius.value))
        .force('x', d3.forceX(width / 2).strength(0.1))
        .force('y', d3.forceY(height / 2).strength(0.1))
        .velocityDecay(0.7) // Add drag to slow down movement
        .alphaMin(0.001) // Reduce minimum alpha to stop simulation sooner
        .alphaDecay(0.02) // Increase decay rate to reach equilibrium faster
}

// Add this helper function before determineRelationshipType
function isJunctionTable(tableName: string): boolean {
    const table = props.tables.find(t => t.name === tableName)
    if (!table?.foreignKeys) return false

    // A junction table typically has exactly 2 foreign keys and they are also part of its primary key
    return table.foreignKeys.length === 2 &&
        table.primaryKeys?.length === 2 &&
        table.foreignKeys.every(fk => table.primaryKeys?.includes(fk.sourceColumn))
}

// Update the determineRelationshipType function to correctly handle relationships
function determineRelationshipType(relation: Relationship, isJunctionRelation = false): {
    type: TableLink['relationship'];
    sourceMarker: string;
    targetMarker: string;
} {
    const sourceTable = props.tables.find(t => t.name === relation.sourceTable)
    const targetTable = props.tables.find(t => t.name === relation.targetTable)

    // For junction table relationships
    if (isJunctionRelation) {
        // When source is the junction table
        if (sourceTable?.foreignKeys?.length === 2) {
            return {
                type: 'many-to-one',
                sourceMarker: 'junction-mandatory-many',  // Use green crow's foot for junction table
                targetMarker: 'junction-mandatory-one'    // Vertical bar on referenced table side
            }
        }
        // When target is the junction table
        if (targetTable?.foreignKeys?.length === 2) {
            return {
                type: 'one-to-many',
                sourceMarker: 'junction-mandatory-one',    // Vertical bar on referenced table side
                targetMarker: 'junction-mandatory-many'    // Crow's foot on junction table side
            }
        }
    }

    // For regular foreign key relationships
    const sourceColumn = sourceTable?.columns.find(c => c.name === relation.sourceColumn)
    const targetColumn = targetTable?.columns.find(c => c.name === relation.targetColumn)

    const isSourceNullable = sourceColumn?.nullable || false
    const isTargetNullable = targetColumn?.nullable || false

    // Default to many-to-one for foreign key relationships
    // Source table (with foreign key) has the crow's foot (many), Target table (referenced) has the vertical bar (one)
    return {
        type: 'many-to-one',
        sourceMarker: isSourceNullable ? 'optional-many' : 'mandatory-many',  // Crow's foot on FK side
        targetMarker: isTargetNullable ? 'optional-one' : 'mandatory-one'     // Vertical bar on PK side
    }
}

// Add this function before createVisualization
function isViewRelationship(link: TableLink, nodes: TableNode[]): boolean {
    const sourceNode = nodes.find(n => n.id === (typeof link.source === 'string' ? link.source : link.source.id))
    const targetNode = nodes.find(n => n.id === (typeof link.target === 'string' ? link.target : link.target.id))
    return (sourceNode?.isView || targetNode?.isView) || false
}

// Create the visualization
function createVisualization() {
    if (!svgContainer.value) return

    // Clear previous visualization
    d3.select(svgContainer.value).selectAll('*').remove()

    // Setup SVG
    const width = svgContainer.value.clientWidth
    const height = svgContainer.value.clientHeight || 1200

    svg = d3.select(svgContainer.value)
        .append('svg')
        .attr('width', width)
        .attr('height', height)

    // Initialize zoom
    initializeZoom()
    svg.call(zoom)

    // Create a group for zoomable content
    const zoomGroup = svg.append('g')
        .attr('class', 'zoom-group')

    // Create markers for different relationship types
    const defs = zoomGroup.append('defs')

    // Create filter for drop shadow
    const filter = defs.append('filter')
        .attr('id', 'drop-shadow')
        .attr('height', '130%')

    // Shadow offset
    filter.append('feOffset')
        .attr('dx', 0)
        .attr('dy', 3)
        .attr('result', 'offsetBlur')

    // Shadow blur
    filter.append('feGaussianBlur')
        .attr('in', 'SourceAlpha')
        .attr('stdDeviation', 3)
        .attr('result', 'blur')

    // Shadow opacity
    filter.append('feComponentTransfer')
        .append('feFuncA')
        .attr('type', 'linear')
        .attr('slope', 0.2)

    // Merge source with shadow
    filter.append('feMerge')
        .selectAll('feMergeNode')
        .data(['offsetBlur', 'SourceGraphic'])
        .enter()
        .append('feMergeNode')
        .attr('in', d => d)

    // Create marker definitions for regular relationships (blue)
    // Mandatory One (|) - Blue version
    defs.append('marker')
        .attr('id', 'mandatory-one')
        .attr('viewBox', '-10 -10 20 20')
        .attr('refX', 10)
        .attr('refY', 0)
        .attr('markerWidth', 12)
        .attr('markerHeight', 12)
        .attr('orient', 'auto')
        .append('path')
        .attr('d', 'M-8,-8L-8,8')  // Vertical bar
        .attr('stroke', '#3b82f6')  // Blue to match regular relationship lines
        .attr('stroke-width', '2.5')

    // Mandatory Many (crow's foot) - Blue version
    defs.append('marker')
        .attr('id', 'mandatory-many')
        .attr('viewBox', '-10 -10 20 20')
        .attr('refX', 8)
        .attr('refY', 0)
        .attr('markerWidth', 12)
        .attr('markerHeight', 12)
        .attr('orient', 'auto')
        .append('path')
        .attr('d', 'M-8,0L0,-8M-8,0L0,8M-8,-8L-8,8')  // Corrected crow's foot orientation with vertical bar
        .attr('stroke', '#3b82f6')  // Blue to match regular relationship lines
        .attr('stroke-width', '2.5')
        .attr('fill', 'none')

    // Double bar for one-to-one relationships - Blue version
    defs.append('marker')
        .attr('id', 'mandatory-one-to-one')
        .attr('viewBox', '-10 -10 20 20')
        .attr('refX', 10)
        .attr('refY', 0)
        .attr('markerWidth', 12)
        .attr('markerHeight', 12)
        .attr('orient', 'auto')
        .append('path')
        .attr('d', 'M-9,-8L-9,8M-5,-8L-5,8')  // Double vertical bars
        .attr('stroke', '#3b82f6')  // Blue to match regular relationship lines
        .attr('stroke-width', '2.5')

    // Optional One (O|) - Blue version
    defs.append('marker')
        .attr('id', 'optional-one')
        .attr('viewBox', '-10 -10 20 20')
        .attr('refX', 10)
        .attr('refY', 0)
        .attr('markerWidth', 12)
        .attr('markerHeight', 12)
        .attr('orient', 'auto')
        .append('path')
        .attr('d', 'M-8,0 A3,3 0 1 1 -8,0.01M-8,4L-8,-4')  // Circle with vertical bar
        .attr('stroke', '#3b82f6')  // Blue to match regular relationship lines
        .attr('stroke-width', '2.5')
        .attr('fill', 'none')

    // Optional Many (crow's foot with circle) - Blue version
    defs.append('marker')
        .attr('id', 'optional-many')
        .attr('viewBox', '-10 -10 20 20')
        .attr('refX', 8)
        .attr('refY', 0)
        .attr('markerWidth', 12)
        .attr('markerHeight', 12)
        .attr('orient', 'auto')
        .append('path')
        .attr('d', 'M-8,0 A3,3 0 1 1 -8,0.01M-8,0L0,-8M-8,0L0,8M-8,-8L-8,8')  // Corrected orientation
        .attr('stroke', '#3b82f6')  // Blue to match regular relationship lines
        .attr('stroke-width', '2.5')
        .attr('fill', 'none')

    // Create marker definitions for junction relationships (green)
    // Mandatory One (|) - Green version
    defs.append('marker')
        .attr('id', 'junction-mandatory-one')
        .attr('viewBox', '-10 -10 20 20')
        .attr('refX', 10)
        .attr('refY', 0)
        .attr('markerWidth', 12)
        .attr('markerHeight', 12)
        .attr('orient', 'auto')
        .append('path')
        .attr('d', 'M-8,-8L-8,8')  // Vertical bar
        .attr('stroke', '#10b981')  // Green to match junction relationship lines
        .attr('stroke-width', '2.5')

    // Mandatory Many (crow's foot) - Green version
    defs.append('marker')
        .attr('id', 'junction-mandatory-many')
        .attr('viewBox', '-10 -10 20 20')
        .attr('refX', 8)
        .attr('refY', 0)
        .attr('markerWidth', 12)
        .attr('markerHeight', 12)
        .attr('orient', 'auto')
        .append('path')
        .attr('d', 'M-8,0L0,-8M-8,0L0,8M-8,-8L-8,8')  // Corrected crow's foot orientation with vertical bar
        .attr('stroke', '#10b981')  // Green to match junction relationship lines
        .attr('stroke-width', '2.5')
        .attr('fill', 'none')

    // Double bar for one-to-one relationships - Green version
    defs.append('marker')
        .attr('id', 'junction-mandatory-one-to-one')
        .attr('viewBox', '-10 -10 20 20')
        .attr('refX', 10)
        .attr('refY', 0)
        .attr('markerWidth', 12)
        .attr('markerHeight', 12)
        .attr('orient', 'auto')
        .append('path')
        .attr('d', 'M-9,-8L-9,8M-5,-8L-5,8')  // Double vertical bars
        .attr('stroke', '#10b981')  // Green to match junction relationship lines
        .attr('stroke-width', '2.5')

    // Prepare data - combine tables and views with null checks
    const nodes: TableNode[] = [
        ...(props.tables || []).map(table => ({
            id: table.name,
            name: table.name,
            schema: table.schema || '',
            isView: false
        })),
        ...(props.views || []).map(view => ({
            id: view.name,
            name: view.name,
            schema: view.schema || '',
            isView: true
        }))
    ]

    // Update the links creation to include view relationships
    links = []

    // Process relationships and handle junction tables
    props.relations?.forEach(relation => {
        // Check if this relationship involves a junction table
        if (isJunctionTable(relation.sourceTable)) {
            // Find the other foreign key in the junction table that points to the target table
            const junctionTable = props.tables.find(t => t.name === relation.sourceTable)
            const otherForeignKey = junctionTable?.foreignKeys?.find(fk =>
                fk.sourceColumn !== relation.sourceColumn &&
                fk.referencedTable !== relation.targetTable
            )

            if (otherForeignKey) {
                // For the relationship from referenced table to junction table
                links.push({
                    source: otherForeignKey.referencedTable,
                    target: relation.sourceTable,
                    relationship: 'one-to-many',
                    sourceMarker: undefined,
                    targetMarker: 'junction-mandatory-many',   // Use green crow's foot for junction table
                    isJunctionRelation: true
                })

                // For the relationship from junction table to second referenced table
                links.push({
                    source: relation.sourceTable,
                    target: relation.targetTable,
                    relationship: 'many-to-one',
                    sourceMarker: undefined,
                    targetMarker: 'junction-mandatory-one-to-one',   // Use green double bar for junction table
                    isJunctionRelation: true
                })
            }
        } else if (!isJunctionTable(relation.targetTable)) {
            // Regular relationship (not involving junction tables)
            const sourceTable = props.tables.find(t => t.name === relation.sourceTable)
            const targetTable = props.tables.find(t => t.name === relation.targetTable)

            const sourceColumn = sourceTable?.columns.find(c => c.name === relation.sourceColumn)
            const isSourceNullable = sourceColumn?.nullable || false

            // For regular FK relationships, we use a single line with appropriate markers
            links.push({
                source: relation.sourceTable,   // Table with FK (source)
                target: relation.targetTable,   // Referenced table (target)
                relationship: 'many-to-one',
                sourceMarker: undefined,
                targetMarker: 'mandatory-one-to-one',  // Double bar on target (PK) end in blue
                isJunctionRelation: false
            })

            // Add a second line for the opposite direction
            links.push({
                source: relation.targetTable,   // Referenced table
                target: relation.sourceTable,   // FK table
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
        const junctionTables = props.tables.filter(table => isJunctionTable(table.name))

        // Check if any of them connects these two tables
        return junctionTables.some(junctionTable => {
            if (!junctionTable.foreignKeys || junctionTable.foreignKeys.length !== 2) return false

            const referencedTables = junctionTable.foreignKeys.map(fk => fk.referencedTable)
            return referencedTables.includes(table1Name) && referencedTables.includes(table2Name)
        })
    }

    // Process many-to-many relationships
    const processedJunctionRelations = new Set<string>()

    props.tables.forEach(table => {
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
    links = links.filter(link => {
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
        props.views.forEach(view => {
            props.tables.filter(table =>
                view.name.toLowerCase().includes(table.name.toLowerCase())
            ).forEach(table => {
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
        zoomGroup.append('text')
            .attr('x', width / 2)
            .attr('y', height / 2)
            .attr('text-anchor', 'middle')
            .attr('fill', '#6b7280')
            .text('No tables or views to display')
        return
    }

    // Create relationship lines
    linkGroup = zoomGroup.append('g')
        .selectAll<SVGGElement, TableLink>('g')
        .data(links)
        .join('g')
        .attr('class', 'relationship')

    // Add the main line with improved marker handling
    linkGroup.append('line')
        .attr('class', 'relationship-line')
        .attr('stroke', d => {
            if ((d as any).isViewDependency) return '#94a3b8'  // Light slate gray for view dependencies
            if ((d as any).isJunctionRelation) return '#10b981'  // Emerald for junction relations
            return '#3b82f6'  // Blue for regular relations
        })
        .attr('stroke-width', '1.5')
        .attr('stroke-dasharray', d => (d as any).isViewDependency ? '3,3' : 'none')
        // Add marker only at the appropriate end - use empty string to remove marker
        .attr('marker-start', d => '')  // Remove the start marker
        .attr('marker-end', d => `url(#${(d as any).targetMarker})`) // Keep only the end marker

    // Create table/view nodes
    node = zoomGroup.append('g')
        .selectAll<SVGGElement, TableNode>('g')
        .data(nodes)
        .join('g')
        .attr('class', d => d.isView ? 'view-node' : 'table-node')
        .call(d3.drag<SVGGElement, TableNode>()
            .on('start', dragstarted)
            .on('drag', dragged)
            .on('end', dragended))
        .on('click', (event, d) => {
            event.stopPropagation()
            selectedTable.value = selectedTable.value === d.name ? null : d.name
            updateHighlighting()
        })

    // Add table background
    node.append('rect')
        .attr('class', 'table-background')
        .attr('width', 200)
        .attr('height', d => {
            const columnCount = props.tables.find(t => t.name === d.name)?.columns.length ||
                props.views.find(v => v.name === d.name)?.columns.length || 0
            return 30 + (columnCount * 20) // Header + rows
        })
        .attr('rx', 8)
        .attr('ry', 8)
        .attr('fill', '#f8fafc')
        .attr('stroke', '#cbd5e1')
        .attr('stroke-width', 1)
        .attr('filter', 'url(#drop-shadow)')

    // Add table header
    const header = node.append('g')
        .attr('class', 'table-header')

    header.append('rect')
        .attr('width', 200)
        .attr('height', 30)
        .attr('rx', 8)
        .attr('ry', 8)
        .attr('fill', d => d.isView ? '#e2e8f0' : '#e2e8f0')
        .attr('stroke', '#cbd5e1')
        .attr('stroke-width', 1.5)

    // Add table body
    node.append('rect')
        .attr('class', 'table-body')
        .attr('width', 200)
        .attr('height', d => {
            const columnCount = props.tables.find(t => t.name === d.name)?.columns.length ||
                props.views.find(v => v.name === d.name)?.columns.length || 0
            return columnCount * 20 // rows
        })
        .attr('y', 30) // Below header
        .attr('fill', '#f8fafc')
        .attr('stroke', '#e2e8f0')
        .attr('stroke-width', 0.5)

    header.append('text')
        .text(d => d.name)
        .attr('x', 10)
        .attr('y', 20)
        .attr('fill', '#1e293b')
        .attr('font-weight', 600)
        .style('font-size', '13px')

    // Add columns with improved styling
    const columnGroup = node.append('g')
        .attr('class', 'column-group')
        .attr('transform', 'translate(0, 30)')

    columnGroup.each(function (d) {
        const group = d3.select(this)
        const table = props.tables.find(t => t.name === d.name) ||
            props.views.find(v => v.name === d.name)

        if (!table) return

        table.columns.forEach((col, i) => {
            const row = group.append('g')
                .attr('transform', `translate(0, ${i * 20})`)
                .attr('class', 'column-row')

            // Subtle row background for alternating rows
            if (i % 2 === 1) {
                row.append('rect')
                    .attr('width', 200)
                    .attr('height', 20)
                    .attr('fill', '#f1f5f9')
                    .attr('opacity', 0.5)
            }

            // Column name with icon
            const isPK = table.primaryKeys?.includes(col.name)
            const isFK = table.foreignKeys?.some(fk => fk.sourceColumn === col.name)

            // Use better icons for primary and foreign keys
            const prefix = isPK ? '🔑 ' : isFK ? '🔗 ' : ''

            row.append('text')
                .attr('x', 10)
                .attr('y', 14)
                .attr('class', 'column-name')
                .attr('data-column-name', col.name)
                .attr('fill', isPK ? '#3b82f6' : isFK ? '#10b981' : '#334155')
                .style('font-size', '11px')
                .style('font-weight', isPK || isFK ? '500' : '400')
                .text(prefix + col.name)

            // Column type
            row.append('text')
                .attr('x', 190)
                .attr('y', 14)
                .attr('text-anchor', 'end')
                .attr('fill', '#64748b')
                .style('font-size', '11px')
                .text(col.type)
        })
    })

    // Initialize simulation
    simulation = initializeSimulation(width, height)
        .nodes(nodes)

    const linkForce = simulation.force<d3.ForceLink<TableNode, TableLink>>('link')!
        .links(links)
        .distance(linkDistance.value)

    // Update positions on each tick
    simulation.on('tick', () => {
        linkGroup.selectAll<SVGLineElement, TableLink>('line')
            .attr('x1', d => {
                const source = d.source as TableNode
                const target = d.target as TableNode
                const [offsetX] = calculateConnectionPoint(
                    source.x || 0,
                    source.y || 0,
                    target.x || 0,
                    target.y || 0,
                    200,
                    getTableHeight(source),
                    true // Add padding for better visibility
                )
                return (source.x || 0) + offsetX
            })
            .attr('y1', d => {
                const source = d.source as TableNode
                const target = d.target as TableNode
                const [, offsetY] = calculateConnectionPoint(
                    source.x || 0,
                    source.y || 0,
                    target.x || 0,
                    target.y || 0,
                    200,
                    getTableHeight(source),
                    true // Add padding for better visibility
                )
                return (source.y || 0) + offsetY
            })
            .attr('x2', d => {
                const source = d.source as TableNode
                const target = d.target as TableNode
                const [offsetX] = calculateConnectionPoint(
                    target.x || 0,
                    target.y || 0,
                    source.x || 0,
                    source.y || 0,
                    200,
                    getTableHeight(target),
                    true // Add padding for better visibility
                )
                return (target.x || 0) + offsetX
            })
            .attr('y2', d => {
                const source = d.source as TableNode
                const target = d.target as TableNode
                const [, offsetY] = calculateConnectionPoint(
                    target.x || 0,
                    target.y || 0,
                    source.x || 0,
                    source.y || 0,
                    200,
                    getTableHeight(target),
                    true // Add padding for better visibility
                )
                return (target.y || 0) + offsetY
            })
            // Re-apply marker attributes on each tick to ensure they're visible and properly positioned
            .attr('marker-start', d => '')  // No marker on source
            .attr('marker-end', d => `url(#${(d as any).targetMarker})`) // Only end marker

        // Update node positions
        node.attr('transform', d => {
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
}

// Drag handlers
function dragstarted(event: d3.D3DragEvent<any, TableNode, any>) {
    if (!event.active) simulation.alphaTarget(0.1).restart() // Reduce alpha target
    event.subject.fx = event.subject.x
    event.subject.fy = event.subject.y
}

function dragged(event: d3.D3DragEvent<any, TableNode, any>) {
    event.subject.fx = event.x
    event.subject.fy = event.y
}

function dragended(event: d3.D3DragEvent<any, TableNode, any>) {
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
watch([() => props.tables, () => props.relations], () => {
    createVisualization()
}, { deep: true })

// Add after the initializeSimulation function:
function updateForces() {
    if (!simulation) return

    const linkForce = simulation.force<d3.ForceLink<TableNode, TableLink>>('link')
    if (linkForce) {
        linkForce.distance(linkDistance.value)
    }

    const chargeForce = simulation.force<d3.ForceManyBody<TableNode>>('charge')
    if (chargeForce) {
        chargeForce.strength(chargeStrength.value)
    }

    const collisionForce = simulation.force<d3.ForceCollide<TableNode>>('collision')
    if (collisionForce) {
        collisionForce.radius(collisionRadius.value)
    }

    simulation
        .alpha(0.3)
        .restart()
}

// Watch for control changes
watch([linkDistance, chargeStrength, collisionRadius], () => {
    updateForces()
}, { immediate: true })

function initializeZoom() {
    zoom = d3.zoom<SVGSVGElement, unknown>()
        .scaleExtent([minZoom, maxZoom])
        .on('zoom', (event) => {
            currentZoom.value = event.transform.k
            svg.select('g.zoom-group').attr('transform', event.transform.toString())
        })
}

function handleZoom(direction: 'in' | 'out') {
    if (!svg || !zoom) return

    const factor = direction === 'in' ? 1.2 : 0.8
    const newZoom = Math.max(minZoom, Math.min(maxZoom, currentZoom.value * factor))

    svg.transition()
        .duration(300)
        .call(zoom.scaleTo, newZoom)
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
    fields: Set<string>,
    relationships: RelatedField[]
} {
    const fields = new Set<string>()
    const relationships: RelatedField[] = []

    // Get foreign key relationships for the selected table
    const table = props.tables.find(t => t.name === tableName)
    if (table?.foreignKeys) {
        table.foreignKeys.forEach(fk => {
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
    props.tables.forEach(t => {
        t.foreignKeys?.forEach(fk => {
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
    const relatedTables = selectedTable.value ? findRelatedTables(selectedTable.value, links) : new Set<string>()
    const { fields, relationships } = selectedTable.value ? findRelatedFields(selectedTable.value) : { fields: new Set<string>(), relationships: [] }

    // Update table highlighting
    node.each(function (d: TableNode) {
        const element = d3.select(this as SVGGElement)
        const isSelected = d.name === selectedTable.value
        const isRelated = relatedTables.has(d.name)

        // Update table header highlighting
        element.select('rect.table-header')
            .transition()
            .duration(300)
            .attr('stroke', isSelected ? '#2563eb' : isRelated ? '#10b981' : '#cbd5e1')
            .attr('stroke-width', isSelected || isRelated ? 2.5 : 1.5)
            .attr('fill', isSelected ? '#dbeafe' : isRelated ? '#ecfdf5' : '#e2e8f0')

        // Apply a subtle highlight effect to the whole table
        element.select('rect.table-body')
            .transition()
            .duration(300)
            .attr('fill', isSelected ? '#f1f5f9' : isRelated ? '#f8fafc' : '#f8fafc')
            .attr('stroke', isSelected ? '#bfdbfe' : isRelated ? '#d1fae5' : '#cbd5e1')
            .attr('stroke-width', isSelected || isRelated ? 1.5 : 1)

        // Dim unrelated tables
        element.transition()
            .duration(300)
            .style('opacity', !selectedTable.value || isSelected || isRelated ? 1 : 0.4)

        // Highlight related fields
        element.selectAll<SVGTextElement, unknown>('.column-name')
            .each(function (this: SVGTextElement, _: unknown, i: number) {
                const text = d3.select<SVGTextElement, unknown>(this)
                const fieldName = this.getAttribute('data-column-name') || ''

                // Find relationships for this field
                const fieldRelationships = relationships.filter(r =>
                    (r.tableName === d.name && r.fieldName === fieldName) ||
                    (r.relatedTableName === d.name && r.relatedFieldName === fieldName)
                )

                if (fieldRelationships.length > 0) {
                    // This field is part of a relationship
                    const isPrimaryKey = fieldRelationships.some(r =>
                        r.relatedTableName === d.name && r.relatedFieldName === fieldName
                    )

                    text
                        .transition()
                        .duration(300)
                        .style('font-weight', '600')
                        .attr('fill', isPrimaryKey ? '#2563eb' : '#10b981')
                        .attr('data-tooltip', fieldRelationships.map(r =>
                            `${r.tableName}.${r.fieldName} → ${r.relatedTableName}.${r.relatedFieldName}`
                        ).join('\n'))
                } else if (selectedTable.value) {
                    // Reset style for unrelated fields when a table is selected
                    text
                        .transition()
                        .duration(300)
                        .style('font-weight', '400')
                        .attr('fill', '#334155')
                        .attr('data-tooltip', null)
                }
            })
    })

    // Update relationship line highlighting
    if (linkGroup) {
        linkGroup.selectAll<SVGLineElement, TableLink>('line')
            .transition()
            .duration(300)
            .attr('stroke-width', function (this: SVGLineElement, d: TableLink) {
                const source = typeof d.source === 'string' ? d.source : d.source.id
                const target = typeof d.target === 'string' ? d.target : d.target.id
                return (selectedTable.value &&
                    (source === selectedTable.value || target === selectedTable.value)) ? '2.5' : '1.5'
            })
            .style('opacity', function (this: SVGLineElement, d: TableLink) {
                if (!selectedTable.value) return 1
                const source = typeof d.source === 'string' ? d.source : d.source.id
                const target = typeof d.target === 'string' ? d.target : d.target.id
                return (source === selectedTable.value || target === selectedTable.value) ? 1 : 0.15
            })
    }
}

// Calculate connection points to ensure lines connect properly to table borders
function calculateConnectionPoint(sourceX: number, sourceY: number, targetX: number, targetY: number, tableWidth: number, tableHeight: number, withPadding = false): [number, number] {
    // Calculate the angle between source and target
    const angle = Math.atan2(targetY - sourceY, targetX - sourceX)

    // Table dimensions
    const padding = 0  // No padding to ensure lines reach table borders
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
    const numColumns = props.tables.find(t => t.name === table.name)?.columns.length ||
        props.views.find(v => v.name === table.name)?.columns.length ||
        0
    return baseHeight + (numColumns * rowHeight)
}
</script>

<template>
    <div class="relative">
        <div ref="svgContainer" class="w-full h-[1200px] bg-gray-50 rounded-lg"></div>

        <!-- Controls Panel -->
        <div class="absolute top-4 right-4 controls-panel p-4 min-w-[240px] space-y-4">
            <!-- Zoom Controls -->
            <div class="flex items-center justify-between border-b border-gray-200 pb-3">
                <span class="text-sm font-medium text-gray-700">Zoom</span>
                <div class="flex items-center gap-2">
                    <button @click="handleZoom('out')"
                        class="p-1.5 hover:bg-gray-100 rounded text-gray-600 hover:text-gray-900 transition-colors">
                        <MinusIcon class="w-4 h-4" />
                    </button>
                    <span class="text-sm text-gray-600 min-w-[48px] text-center">
                        {{ Math.round(currentZoom * 100) }}%
                    </span>
                    <button @click="handleZoom('in')"
                        class="p-1.5 hover:bg-gray-100 rounded text-gray-600 hover:text-gray-900 transition-colors">
                        <PlusIcon class="w-4 h-4" />
                    </button>
                </div>
            </div>

            <!-- Force Controls -->
            <div class="space-y-3">
                <div>
                    <div class="flex items-center justify-between mb-1.5">
                        <label class="text-sm font-medium text-gray-700">Link Distance</label>
                        <span class="text-xs text-gray-500 tabular-nums">{{ linkDistance }}px</span>
                    </div>
                    <input type="range" v-model="linkDistance" min="100" max="500" step="20" class="w-full"
                        @input="updateForces" />
                </div>

                <div>
                    <div class="flex items-center justify-between mb-1.5">
                        <label class="text-sm font-medium text-gray-700">Charge Strength</label>
                        <span class="text-xs text-gray-500 tabular-nums">{{ chargeStrength }}</span>
                    </div>
                    <input type="range" v-model="chargeStrength" min="-3000" max="-200" step="100" class="w-full"
                        @input="updateForces" />
                </div>

                <div>
                    <div class="flex items-center justify-between mb-1.5">
                        <label class="text-sm font-medium text-gray-700">Collision Radius</label>
                        <span class="text-xs text-gray-500 tabular-nums">{{ collisionRadius }}px</span>
                    </div>
                    <input type="range" v-model="collisionRadius" min="60" max="200" step="10" class="w-full"
                        @input="updateForces" />
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
    stroke: #3b82f6;
    stroke-width: 2px;
}

.relationship-line {
    stroke-width: 1.5px;
    shape-rendering: geometricPrecision;
    transition: stroke-width 0.2s ease, opacity 0.2s ease;
}

.relationship-line:hover {
    stroke-width: 2.5px;
}

marker {
    overflow: visible;
}

marker path {
    stroke-width: 2px;
    fill: none;
    shape-rendering: geometricPrecision;
}

/* Smooth transitions */
line,
marker path,
rect,
text {
    transition: stroke 0.3s ease, stroke-width 0.3s ease, fill 0.3s ease, font-weight 0.3s ease;
}

input[type="range"] {
    @apply h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer;

    &::-webkit-slider-thumb {
        @apply appearance-none w-5 h-5 bg-blue-600 rounded-full hover:bg-blue-700 transition-colors;
    }

    &::-moz-range-thumb {
        @apply w-5 h-5 bg-blue-600 border-0 rounded-full hover:bg-blue-700 transition-colors;
    }
}

button {
    @apply focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1;
}

.space-y-3> :not([hidden])~ :not([hidden]) {
    @apply mt-3;
}

.space-y-4> :not([hidden])~ :not([hidden]) {
    @apply mt-4;
}

.tabular-nums {
    font-variant-numeric: tabular-nums;
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

/* Controls Panel styling */
.controls-panel {
    background-color: white;
    border-radius: 0.75rem;
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
    border: 1px solid #e2e8f0;
}

.controls-panel h3 {
    color: #1e293b;
    font-weight: 600;
    font-size: 0.875rem;
}

.controls-panel label {
    color: #475569;
    font-size: 0.875rem;
    font-weight: 500;
}
</style>