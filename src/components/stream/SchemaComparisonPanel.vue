<template>
  <div
    v-if="comparison"
    class="bg-white dark:bg-gray-850 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden"
  >
    <!-- Collapsed State: Summary with Badges -->
    <button
      class="w-full px-6 py-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors border-b border-gray-200 dark:border-gray-700"
      @click="expanded = !expanded"
    >
      <div class="flex items-center gap-3 flex-1">
        <ChevronDown
          :class="[
            'w-6 h-6 transition-transform shrink-0',
            expanded
              ? 'rotate-180 text-blue-600 dark:text-blue-400'
              : 'text-gray-500 dark:text-gray-400'
          ]"
        />
        <Grid2X2 class="w-5 h-5 text-gray-500 dark:text-gray-400" />
        <span class="text-sm font-medium text-gray-900 dark:text-gray-100">Schema Comparison</span>

        <!-- Summary Badges -->
        <div class="flex items-center gap-2">
          <span
            v-if="comparison.matching > 0"
            class="inline-flex items-center gap-1 px-2 py-1 text-xs bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300 rounded-md font-medium"
          >
            <CheckCircle class="w-3.5 h-3.5" />
            {{ comparison.matching }} match
          </span>
          <span
            v-if="comparison.typeDiff > 0"
            class="inline-flex items-center gap-1 px-2 py-1 text-xs bg-yellow-50 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300 rounded-md font-medium"
          >
            <AlertTriangle class="w-3.5 h-3.5" />
            {{ comparison.typeDiff }} type diff
          </span>
          <span
            v-if="comparison.missingInTarget > 0"
            class="inline-flex items-center gap-1 px-2 py-1 text-xs bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300 rounded-md font-medium"
          >
            <MinusCircle class="w-3.5 h-3.5" />
            {{ comparison.missingInTarget }} removed
          </span>
          <span
            v-if="comparison.newInTarget > 0"
            class="inline-flex items-center gap-1 px-2 py-1 text-xs bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 rounded-md font-medium"
          >
            <PlusCircle class="w-3.5 h-3.5" />
            {{ comparison.newInTarget }} added
          </span>
        </div>
      </div>

      <!-- View Mode Toggle - always visible -->
      <div
        class="flex items-center gap-2 ml-4 pl-4 border-l border-gray-300 dark:border-gray-700"
        @click.stop
      >
        <button
          class="px-3 py-1 text-xs font-medium rounded-md transition-colors"
          :class="
            viewMode === 'columns'
              ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 shadow-sm border border-gray-300 dark:border-gray-600'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800'
          "
          @click="selectViewMode('columns')"
        >
          Columns
        </button>
        <button
          class="px-3 py-1 text-xs font-medium rounded-md transition-colors"
          :class="
            viewMode === 'ddl'
              ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 shadow-sm border border-gray-300 dark:border-gray-600'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800'
          "
          @click="selectViewMode('ddl')"
        >
          DDL
        </button>
      </div>
    </button>

    <!-- Expanded State: Content -->
    <div v-if="expanded" class="bg-gray-50 dark:bg-gray-900/60">
      <!-- Columns View -->
      <div v-if="viewMode === 'columns'" class="p-4">
        <div
          class="bg-white dark:bg-gray-850 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden shadow-sm"
        >
          <!-- Headers -->
          <div
            class="grid grid-cols-[1fr_auto_1fr] gap-4 px-4 py-2 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700"
          >
            <div class="flex items-center justify-between">
              <span
                class="text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wide"
              >
                Source Schema
              </span>
              <span class="text-xs text-gray-500 dark:text-gray-400"
                >{{ sourceColumns.length }} columns</span
              >
            </div>
            <div class="w-16"></div>
            <div class="flex items-center justify-between">
              <span
                class="text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wide"
              >
                Target Schema
              </span>
              <span class="text-xs text-gray-500 dark:text-gray-400"
                >{{ targetColumns.length }} columns</span
              >
            </div>
          </div>
          <!-- Column Rows -->
          <div class="max-h-80 overflow-y-auto custom-scrollbar">
            <div
              v-for="col in mergedColumns"
              :key="col.name"
              class="grid grid-cols-[1fr_auto_1fr] gap-4 px-4 py-2.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              :class="getRowClass(col)"
            >
              <!-- Source Column -->
              <div
                v-if="col.sourceColumn"
                class="grid grid-cols-[minmax(140px,1fr)_auto_70px_80px] items-center gap-3 min-w-0"
              >
                <div class="flex items-center gap-2 min-w-0">
                  <span class="font-mono font-medium text-gray-900 dark:text-gray-100 truncate">{{
                    col.sourceColumn.name
                  }}</span>
                  <span
                    v-if="col.sourceColumn.isPrimaryKey"
                    class="px-1.5 py-0.5 text-[10px] bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 rounded font-medium uppercase tracking-wide"
                  >
                    PK
                  </span>
                </div>
                <span
                  class="px-1.5 py-0.5 text-[11px] bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300 rounded font-semibold tracking-wide uppercase text-center"
                >
                  {{ getTypeParts(col.sourceColumn.dataType).type }}
                </span>
                <span class="text-[11px] text-gray-600 dark:text-gray-400 font-mono text-center">
                  {{ getColumnSize(col.sourceColumn) || '—' }}
                </span>
                <span
                  v-if="!col.sourceColumn.isNullable"
                  class="px-1.5 py-0.5 text-[11px] bg-gray-100 text-gray-600 dark:bg-gray-900/40 dark:text-gray-400 rounded font-medium uppercase tracking-wide text-center"
                >
                  NOT&nbsp;NULL
                </span>
                <span v-else class="text-[11px] text-gray-400 text-center">—</span>
              </div>
              <div
                v-else
                class="grid grid-cols-[minmax(140px,1fr)_auto_70px_80px] items-center gap-3 text-gray-400 dark:text-gray-500 text-xs"
              >
                <span>—</span>
                <span>—</span>
                <span>—</span>
                <span>—</span>
              </div>

              <!-- Status Icon -->
              <div class="flex items-center justify-center w-16">
                <component
                  :is="getDiffIcon(col.difference.type)"
                  v-if="col.difference"
                  class="w-4 h-4"
                  :class="getDiffIconColor(col.difference.type)"
                  :title="col.difference.label"
                />
              </div>

              <!-- Target Column -->
              <div
                v-if="col.targetColumn"
                class="grid grid-cols-[minmax(140px,1fr)_auto_70px_80px] items-center gap-3 min-w-0"
              >
                <div class="flex items-center gap-2 min-w-0">
                  <span class="font-mono font-medium text-gray-900 dark:text-gray-100 truncate">{{
                    col.targetColumn.name
                  }}</span>
                  <span
                    v-if="col.targetColumn.isPrimaryKey"
                    class="px-1.5 py-0.5 text-[10px] bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 rounded font-medium uppercase tracking-wide"
                  >
                    PK
                  </span>
                </div>
                <span
                  class="px-1.5 py-0.5 text-[11px] bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300 rounded font-semibold tracking-wide uppercase text-center"
                >
                  {{ getTypeParts(col.targetColumn.dataType).type }}
                </span>
                <span class="text-[11px] text-gray-600 dark:text-gray-400 font-mono text-center">
                  {{ getColumnSize(col.targetColumn) || '—' }}
                </span>
                <span
                  v-if="!col.targetColumn.isNullable"
                  class="px-1.5 py-0.5 text-[11px] bg-gray-100 text-gray-600 dark:bg-gray-900/40 dark:text-gray-400 rounded font-medium uppercase tracking-wide text-center"
                >
                  NOT&nbsp;NULL
                </span>
                <span v-else class="text-[11px] text-gray-400 text-center">—</span>
              </div>
              <div
                v-else
                class="grid grid-cols-[minmax(140px,1fr)_auto_70px_80px] items-center gap-3 text-gray-400 dark:text-gray-500 text-xs"
              >
                <span>—</span>
                <span>—</span>
                <span>—</span>
                <span>—</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- DDL View -->
      <div v-else-if="viewMode === 'ddl'" class="grid grid-cols-2 gap-4 p-4">
        <!-- Source DDL -->
        <div
          class="bg-white dark:bg-gray-850 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden shadow-sm"
        >
          <div
            class="px-4 py-2 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between"
          >
            <span
              class="text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wide"
            >
              Source DDL
            </span>
          </div>
          <div class="max-h-80 overflow-y-auto custom-scrollbar p-4">
            <DdlView
              v-if="sourceDdl"
              :ddl="sourceDdl"
              :connection-type="sourceConnectionType"
              :dialect="sourceDialect"
            />
            <div v-else class="text-sm text-gray-500 dark:text-gray-400 text-center py-8">
              DDL not available
            </div>
          </div>
        </div>

        <!-- Target DDL -->
        <div
          class="bg-white dark:bg-gray-850 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden shadow-sm"
        >
          <div
            class="px-4 py-2 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between"
          >
            <span
              class="text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wide"
            >
              Target DDL
            </span>
          </div>
          <div class="max-h-80 overflow-y-auto custom-scrollbar p-4">
            <DdlView
              v-if="targetDdl"
              :ddl="targetDdl"
              :connection-type="targetConnectionType"
              :dialect="targetDialect"
            />
            <div v-else class="text-sm text-gray-500 dark:text-gray-400 text-center py-8">
              DDL not available
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import {
  AlertTriangle,
  CheckCircle,
  ChevronDown,
  Grid2X2,
  MinusCircle,
  PlusCircle
} from 'lucide-vue-next'
import DdlView from '@/components/database/DdlView.vue'
import type { SQLColumnMeta } from '@/types/metadata'

interface SchemaDifference {
  icon: string
  label: string
  type: 'match' | 'type-diff' | 'missing' | 'new'
}

interface SchemaComparison {
  matching: number
  typeDiff: number
  missingInTarget: number
  newInTarget: number
  sourceDiffs: Record<string, SchemaDifference>
  targetDiffs: Record<string, SchemaDifference>
}

interface MergedColumn {
  name: string
  sourceColumn: SQLColumnMeta | null
  targetColumn: SQLColumnMeta | null
  difference: SchemaDifference | null
}

const props = defineProps<{
  sourceColumns: SQLColumnMeta[]
  targetColumns: SQLColumnMeta[]
  comparison: SchemaComparison | null
  sourceDdl?: {
    createTable: string
    createIndexes?: string[]
  }
  targetDdl?: {
    createTable: string
    createIndexes?: string[]
  }
  sourceConnectionType: string
  targetConnectionType: string
  sourceDialect: string
  targetDialect: string
}>()

const expanded = ref(false)
const viewMode = ref<'columns' | 'ddl'>('columns')

// Handle view mode selection with auto-expand
function selectViewMode(mode: 'columns' | 'ddl') {
  viewMode.value = mode
  // Auto-expand panel if collapsed
  if (!expanded.value) {
    expanded.value = true
  }
}

// Merge source and target columns for side-by-side comparison
const mergedColumns = computed<MergedColumn[]>(() => {
  const merged: MergedColumn[] = []
  const seenColumns = new Set<string>()

  // Add all source columns
  for (const sourceCol of props.sourceColumns) {
    const colName = sourceCol.name.toLowerCase()
    seenColumns.add(colName)

    const targetCol = props.targetColumns.find((c) => c.name.toLowerCase() === colName)
    const diff = props.comparison?.sourceDiffs[sourceCol.name] || null

    merged.push({
      name: sourceCol.name,
      sourceColumn: sourceCol,
      targetColumn: targetCol || null,
      difference: diff
    })
  }

  // Add target-only columns
  for (const targetCol of props.targetColumns) {
    const colName = targetCol.name.toLowerCase()
    if (!seenColumns.has(colName)) {
      const diff = props.comparison?.targetDiffs[targetCol.name] || null

      merged.push({
        name: targetCol.name,
        sourceColumn: null,
        targetColumn: targetCol,
        difference: diff
      })
    }
  }

  return merged
})

function getRowClass(col: MergedColumn) {
  if (!col.difference) return ''

  const base = 'border-l-2'
  switch (col.difference.type) {
    case 'match':
      return `${base} border-green-500 dark:border-green-300`
    case 'type-diff':
      return `${base} border-yellow-500 dark:border-yellow-300`
    case 'missing':
      return `${base} border-red-500 dark:border-red-300`
    case 'new':
      return `${base} border-blue-500 dark:border-blue-300`
    default:
      return ''
  }
}

function getDiffIcon(type: string) {
  const iconMap: Record<string, typeof CheckCircle> = {
    match: CheckCircle,
    'type-diff': AlertTriangle,
    missing: MinusCircle,
    new: PlusCircle
  }
  return iconMap[type] || null
}

function getTypeParts(type: string) {
  const trimmed = (type || '').trim()
  if (!trimmed) return { type: '', size: '' }
  const openParen = trimmed.indexOf('(')
  const closeParen = trimmed.lastIndexOf(')')
  if (openParen > -1 && closeParen > openParen) {
    return {
      type: trimmed.slice(0, openParen).trim(),
      size: trimmed.slice(openParen + 1, closeParen).trim()
    }
  }
  return { type: trimmed, size: '' }
}

function getColumnSize(column: SQLColumnMeta): string {
  if (column.precision?.Valid) {
    const precision = column.precision.Int64
    const scale = column.scale?.Valid ? column.scale.Int64 : null
    return scale !== null ? `${precision},${scale}` : `${precision}`
  }
  if (column.length?.Valid) {
    return `${column.length.Int64}`
  }
  const fallback = column.columnType || column.dataType
  return getTypeParts(fallback).size
}

function getDiffIconColor(type: string) {
  switch (type) {
    case 'match':
      return 'text-green-600 dark:text-green-300'
    case 'type-diff':
      return 'text-yellow-600 dark:text-yellow-300'
    case 'missing':
      return 'text-red-600 dark:text-red-300'
    case 'new':
      return 'text-blue-600 dark:text-blue-300'
    default:
      return 'text-gray-500 dark:text-gray-400'
  }
}
</script>
