<script setup lang="ts">
import { onMounted, computed, ref, nextTick, onUnmounted } from 'vue'
import mermaid from 'mermaid'
import type { Table, Relationship, Column } from '@/types/schema'

// Define props with default values
const props = withDefaults(defineProps<{
    tables: Table[]
    relationships: Relationship[]
    views: Table[]  // Add views prop
}>(), {
    tables: () => [],
    relationships: () => [],
    views: () => []  // Default empty array for views
})

const diagramContainer = ref<HTMLElement | null>(null)
const isLoading = ref(true)
const error = ref<string | null>(null)

// Pan and zoom state
const transform = ref({
    x: 0,
    y: 0,
    scale: 1  // Start at 100%
})

// Pan state
const isPanning = ref(false)
const startPan = ref({ x: 0, y: 0 })

// Transform style computed property
const transformStyle = computed(() => ({
    transform: `translate(${transform.value.x}px, ${transform.value.y}px) scale(${transform.value.scale})`,
    cursor: isPanning.value ? 'grabbing' : 'grab'
}))

// Pan handlers
function handleMouseDown(e: MouseEvent) {
    if (e.button !== 0) return // Only handle left click
    isPanning.value = true
    startPan.value = {
        x: e.clientX - transform.value.x,
        y: e.clientY - transform.value.y
    }
}

function handleMouseMove(e: MouseEvent) {
    if (!isPanning.value) return
    transform.value.x = e.clientX - startPan.value.x
    transform.value.y = e.clientY - startPan.value.y
}

function handleMouseUp() {
    isPanning.value = false
}

// Zoom handler
function handleWheel(e: WheelEvent) {
    e.preventDefault()

    const delta = e.deltaY > 0 ? 0.9 : 1.1
    const newScale = Math.max(0.5, Math.min(3, transform.value.scale * delta))  // Limit between 50% and 300%

    // Calculate mouse position relative to the container
    const rect = diagramContainer.value?.getBoundingClientRect()
    if (!rect) return

    const mouseX = e.clientX - rect.left
    const mouseY = e.clientY - rect.top

    // Calculate new position to zoom towards mouse
    transform.value = {
        scale: newScale,
        x: transform.value.x + (mouseX - mouseX * delta),
        y: transform.value.y + (mouseY - mouseY * delta)
    }
}

// Reset transform
function resetTransform() {
    transform.value = { x: 0, y: 0, scale: 1 }  // Reset to 100%
}

// Initialize mermaid with ERD configuration
mermaid.initialize({
    startOnLoad: false,
    theme: 'neutral',
    er: {
        diagramPadding: 20,
        layoutDirection: 'LR',  // Left to Right layout
        minEntityWidth: 150,
        minEntityHeight: 100,
        entityPadding: 30,
        useMaxWidth: false
    },
    themeVariables: {
        lineColor: '#666',
        textColor: '#333',
        mainBkg: 'transparent',
        nodeBorder: '#e5e5e5',
        clusterBkg: 'transparent',
        fontSize: '14px'
    },
    securityLevel: 'loose'
})

// Generate Mermaid ERD diagram definition
const diagramDefinition = computed(() => {
    const lines = ['erDiagram']

    // Helper function to sanitize names for Mermaid compatibility
    function sanitizeName(name: string): string {
        // Replace any characters that might cause issues with underscores
        return name.replace(/[^a-zA-Z0-9]/g, '_')
    }

    // Helper function to format column definition
    function formatColumnDef(col: Column): string {
        // Simplify the type by removing everything after first space or parenthesis
        const baseType = col.type.split(/[\s(]/)[0].toLowerCase()
        const comment = [
            col.isPrimaryKey && 'PK',
            col.isForeignKey && 'FK'
        ].filter(Boolean).join(', ')

        // Ensure proper spacing and format for Mermaid ERD
        const name = sanitizeName(col.name)
        const commentStr = comment ? ` "` + comment + `"` : ''
        return `        ${name} ${baseType}${commentStr}`
    }

    // Add entities (tables)
    if (props.tables?.length) {
        // Sort tables by name for consistent layout
        const sortedTables = [...props.tables].sort((a, b) => a.name.localeCompare(b.name))

        sortedTables.forEach(table => {
            if (!table?.columns?.length) return

            const tableName = sanitizeName(table.name)
            lines.push('')
            lines.push(`    ${tableName} {`)
            table.columns.forEach(col => {
                lines.push(formatColumnDef(col))
            })
            lines.push('    }')
        })
    }

    // Add views
    if (props.views?.length) {
        const sortedViews = [...props.views].sort((a, b) => a.name.localeCompare(b.name))

        sortedViews.forEach(view => {
            if (!view?.columns?.length) return

            const viewName = sanitizeName(view.name)
            lines.push('')
            lines.push('    %% View')
            lines.push(`    ${viewName} {`)
            view.columns.forEach(col => {
                lines.push(formatColumnDef(col))
            })
            lines.push('    }')
        })

        // Add relationships between views and their dependent tables
        props.tables.forEach(table => {
            const tableName = sanitizeName(table.name)
            sortedViews.forEach(view => {
                const viewName = sanitizeName(view.name)
                // Check if view name contains table name (simple dependency check)
                if (view.name.toLowerCase().includes(table.name.toLowerCase())) {
                    lines.push(`    ${tableName} ||..|| ${viewName} : "depends on"`)
                }
            })
        })
    }

    // Add relationships
    if (props.relationships?.length) {
        const processedRelationships = new Set<string>()
        lines.push('')

        // Helper to determine if a table is a junction table
        const isJunctionTable = (columns: Column[]) => {
            const fkColumns = columns.filter(col => col.isForeignKey)
            return fkColumns.length === 2
        }

        props.relationships.forEach(rel => {
            if (processedRelationships.has(rel.id)) return
            processedRelationships.add(rel.id)

            const sourceTable = props.tables.find(t => t.name === rel.sourceTable)
            const targetTable = props.tables.find(t => t.name === rel.targetTable)

            if (!sourceTable || !targetTable) return

            const sourceName = sanitizeName(rel.sourceTable)
            const targetName = sanitizeName(rel.targetTable)

            if (isJunctionTable(sourceTable.columns)) {
                // Show N:1 relationship from junction table
                lines.push(`    ${sourceName} }|--|| ${targetName} : "N:1"`)

                // Add M:N relationship between main tables
                const otherRel = props.relationships.find(r =>
                    r.sourceTable === rel.sourceTable &&
                    r.id !== rel.id
                )
                if (otherRel) {
                    const otherTargetName = sanitizeName(otherRel.targetTable)
                    lines.push(`    ${targetName} }|--|{ ${otherTargetName} : "M:N"`)
                }
            } else {
                // Standard N:1 relationship
                lines.push(`    ${sourceName} }|--|| ${targetName} : "N:1"`)
            }
        })
    }

    return lines.join('\n')
})

async function renderDiagram() {
    if (!diagramContainer.value) return

    try {
        isLoading.value = true
        error.value = null

        // Clear previous content
        diagramContainer.value.innerHTML = ''

        // Create a new div for mermaid
        const mermaidDiv = document.createElement('div')
        mermaidDiv.className = 'mermaid'
        mermaidDiv.textContent = diagramDefinition.value
        diagramContainer.value.appendChild(mermaidDiv)

        // Wait for DOM update
        await nextTick()

        // Render diagram
        await mermaid.run({
            nodes: [mermaidDiv]
        })

        // Apply custom styles after rendering
        await nextTick()

        isLoading.value = false
    } catch (err) {
        console.error('Failed to render diagram:', err)
        error.value = err instanceof Error ? err.message : 'Failed to render diagram'
        isLoading.value = false
    }
}

// Watch for changes and re-render
let renderTimeout: number | null = null
async function debouncedRender() {
    if (renderTimeout) {
        window.clearTimeout(renderTimeout)
    }
    renderTimeout = window.setTimeout(() => {
        renderDiagram()
    }, 100)
}

// Initial render
onMounted(() => {
    debouncedRender()

    // Add global mouse event listeners
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)

    // Clean up listeners on unmount
    onUnmounted(() => {
        window.removeEventListener('mousemove', handleMouseMove)
        window.removeEventListener('mouseup', handleMouseUp)
    })
})

// Function to save diagram as SVG
function saveDiagram() {
    const svgElement = diagramContainer.value?.querySelector('svg')
    if (!svgElement) return

    // Create a copy of the SVG to modify
    const svgCopy = svgElement.cloneNode(true) as SVGElement

    // Add white background to ensure visibility
    svgCopy.style.backgroundColor = 'white'

    // Convert SVG to string
    const serializer = new XMLSerializer()
    const svgString = serializer.serializeToString(svgCopy)

    // Create blob and download link
    const blob = new Blob([svgString], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'database-diagram.svg'

    // Trigger download
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
}
</script>

<template>
    <div class="mermaid-container">
        <div class="controls">
            <button @click="transform.scale = Math.min(3, transform.scale * 1.2)" class="control-btn" title="Zoom in">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" stroke-width="2">
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
            </button>
            <button @click="transform.scale = Math.max(0.5, transform.scale * 0.9)" class="control-btn"
                title="Zoom out">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" stroke-width="2">
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
            </button>
            <span class="zoom-level">{{ Math.round(transform.scale * 100) }}%</span>
            <button @click="resetTransform" class="control-btn">Reset</button>
            <button @click="saveDiagram" class="control-btn save-btn" title="Save as SVG">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" stroke-width="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="7 10 12 15 17 10"></polyline>
                    <line x1="12" y1="15" x2="12" y2="3"></line>
                </svg>
                Save
            </button>
        </div>

        <div v-if="isLoading" class="loading">
            Loading diagram...
        </div>
        <div v-if="error" class="error">
            {{ error }}
        </div>
        <div ref="diagramContainer" class="diagram-wrapper" :style="transformStyle" @mousedown="handleMouseDown"
            @wheel.prevent="handleWheel"></div>
    </div>
</template>

<style scoped>
.mermaid-container {
    width: 100%;
    height: 100%;
    min-height: 400px;
    background-color: #fafafa;
    background-image:
        linear-gradient(rgba(130, 130, 130, 0.1) 1px, transparent 1px),
        linear-gradient(90deg, rgba(130, 130, 130, 0.1) 1px, transparent 1px);
    background-size: 20px 20px;
    position: relative;
    overflow: hidden;
}

.diagram-wrapper {
    width: 100%;
    height: 100%;
    transform-origin: 0 0;
}

.loading,
.error {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    padding: 1rem;
    background: rgba(255, 255, 255, 0.9);
    border-radius: 0.5rem;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.error {
    color: #dc2626;
}

.controls {
    position: absolute;
    top: 1rem;
    right: 1rem;
    display: flex;
    gap: 0.5rem;
    background: white;
    padding: 0.5rem;
    border-radius: 0.5rem;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    z-index: 10;
}

.control-btn {
    padding: 0.5rem;
    border: 1px solid #e5e7eb;
    border-radius: 0.375rem;
    background: white;
    color: #4b5563;
    cursor: pointer;
    transition: all 150ms;
}

.control-btn:hover {
    background: #f3f4f6;
    border-color: #d1d5db;
}

.control-btn:focus {
    outline: 2px solid #60a5fa;
    outline-offset: 2px;
}

.zoom-level {
    padding: 0.5rem;
    min-width: 4rem;
    text-align: center;
    color: #4b5563;
    border: 1px solid #e5e7eb;
    border-radius: 0.375rem;
    background: white;
}

.save-btn {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding-left: 0.75rem;
    padding-right: 0.75rem;
}
</style>