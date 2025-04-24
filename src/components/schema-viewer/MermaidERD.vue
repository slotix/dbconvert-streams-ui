<script setup lang="ts">
import { onMounted, computed, ref, nextTick, onUnmounted } from 'vue'
import mermaid from 'mermaid'
import type { Table, Relationship, Column } from '@/types/schema'

const props = defineProps<{
    tables: Table[]
    relationships: Relationship[]
}>()

const diagramContainer = ref<HTMLElement | null>(null)
const isLoading = ref(true)
const error = ref<string | null>(null)

// Pan and zoom state
const transform = ref({
    x: 0,
    y: 0,
    scale: 1
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
    const newScale = Math.max(0.1, Math.min(2, transform.value.scale * delta))

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
    transform.value = { x: 0, y: 0, scale: 1 }
}

// Initialize mermaid with ERD configuration
mermaid.initialize({
    startOnLoad: false,
    theme: 'default',
    er: {
        diagramPadding: 20,
        layoutDirection: 'TB',
        minEntityWidth: 100,
        minEntityHeight: 75,
        entityPadding: 15,
        stroke: 'gray',
        fill: 'white',
        fontSize: 12
    },
    securityLevel: 'loose'
})

// Generate Mermaid ERD diagram definition
const diagramDefinition = computed(() => {
    const lines = ['erDiagram']

    // Add entities (tables) with proper spacing
    props.tables.forEach(table => {
        lines.push('')
        lines.push(`    ${table.name} {`)
        table.columns.forEach((col: Column) => {
            let comment = []
            if (col.isPrimaryKey) comment.push('PK')
            if (col.isForeignKey) comment.push('FK')

            const baseType = col.type.replace(/\(.*\)/g, '').trim()
            const commentStr = comment.length > 0 ? ` "${comment.join(', ')}"` : ''
            lines.push(`        ${col.name} ${baseType}${commentStr}`)
        })
        lines.push('    }')
    })

    // Add relationships with dynamic cardinality
    props.relationships.forEach(rel => {
        lines.push('')

        // Find source and target tables
        const sourceTable = props.tables.find(t => t.name === rel.sourceTable)
        const targetTable = props.tables.find(t => t.name === rel.targetTable)

        if (!sourceTable || !targetTable) return

        // Find the relevant columns
        const sourceColumn = sourceTable.columns.find(c => c.name === rel.sourceColumn)
        const targetColumn = targetTable.columns.find(c => c.name === rel.targetColumn)

        if (!sourceColumn || !targetColumn) return

        // Determine cardinality based on column properties
        let relationshipType = ''

        // Check if source column is part of a composite key
        const isSourceComposite = sourceTable.primaryKeys.length > 1 &&
            sourceTable.primaryKeys.includes(rel.sourceColumn)

        // Check if target column is part of a composite key
        const isTargetComposite = targetTable.primaryKeys.length > 1 &&
            targetTable.primaryKeys.includes(rel.targetColumn)

        if (isSourceComposite || isTargetComposite) {
            relationshipType = 'n-n' // Many-to-many through junction table
        } else if (targetColumn.isPrimaryKey) {
            relationshipType = sourceColumn.isPrimaryKey ? '1-1' : 'n-1'
        } else {
            relationshipType = '1-n'
        }

        lines.push(`    ${rel.sourceTable} ||--o{ ${rel.targetTable} : "${relationshipType}"`)
    })

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
</script>

<template>
    <div class="mermaid-container">
        <div v-if="isLoading" class="loading">
            Loading diagram...
        </div>
        <div v-if="error" class="error">
            {{ error }}
        </div>
        <div ref="diagramContainer" class="diagram-wrapper" :style="transformStyle" @mousedown="handleMouseDown"
            @wheel.prevent="handleWheel"></div>
        <div class="controls">
            <button @click="transform.scale = Math.min(2, transform.scale * 1.1)" class="control-btn">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" stroke-width="2">
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
            </button>
            <button @click="transform.scale = Math.max(0.1, transform.scale * 0.9)" class="control-btn">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" stroke-width="2">
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
            </button>
            <button @click="resetTransform" class="control-btn">Reset</button>
        </div>
    </div>
</template>

<style scoped>
.mermaid-container {
    width: 100%;
    height: 100%;
    min-height: 400px;
    background: white;
    position: relative;
    overflow: hidden;
    touch-action: none;
}

.diagram-wrapper {
    padding: 1rem;
    min-height: 400px;
    transform-origin: 0 0;
    will-change: transform;
    user-select: none;
}

.loading,
.error {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    padding: 1rem;
    background: rgba(255, 255, 255, 0.9);
    border-radius: 4px;
    z-index: 10;
}

.error {
    color: red;
    border: 1px solid red;
}

.controls {
    position: absolute;
    bottom: 1rem;
    left: 1rem;
    display: flex;
    gap: 0.5rem;
    z-index: 20;
}

.control-btn {
    background: white;
    border: 1px solid #ccc;
    border-radius: 4px;
    padding: 0.5rem;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    transition: all 0.2s;
}

.control-btn:hover {
    background: #f0f0f0;
    transform: translateY(-1px);
    box-shadow: 0 3px 6px rgba(0, 0, 0, 0.15);
}

.control-btn:active {
    transform: translateY(0);
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

:deep(.mermaid) {
    text-align: center;
}

:deep(svg) {
    max-width: 100%;
    height: auto;
}
</style>