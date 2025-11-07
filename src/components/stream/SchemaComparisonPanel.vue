<template>
  <div v-if="comparison" class="bg-white dark:bg-gray-850">
    <!-- Collapsed State: Summary with Badges -->
    <button
      class="w-full px-6 py-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors border-b border-gray-200 dark:border-gray-700"
      @click="expanded = !expanded"
    >
      <div class="flex items-center gap-3 flex-1">
        <ChevronDownIcon
          :class="[
            'w-6 h-6 transition-transform shrink-0',
            expanded
              ? 'rotate-180 text-blue-600 dark:text-blue-400'
              : 'text-gray-500 dark:text-gray-400'
          ]"
        />
        <Squares2X2Icon class="w-5 h-5 text-gray-500 dark:text-gray-400" />
        <span class="text-sm font-medium text-gray-900 dark:text-gray-100">Schema Comparison</span>

        <!-- Summary Badges -->
        <div class="flex items-center gap-2">
          <span
            v-if="comparison.matching > 0"
            class="inline-flex items-center gap-1 px-2 py-1 text-xs bg-green-50 text-green-700 rounded-md font-medium"
          >
            <CheckCircleIcon class="w-3.5 h-3.5" />
            {{ comparison.matching }} match
          </span>
          <span
            v-if="comparison.typeDiff > 0"
            class="inline-flex items-center gap-1 px-2 py-1 text-xs bg-yellow-50 text-yellow-700 rounded-md font-medium"
          >
            <ExclamationTriangleIcon class="w-3.5 h-3.5" />
            {{ comparison.typeDiff }} type diff
          </span>
          <span
            v-if="comparison.missingInTarget > 0"
            class="inline-flex items-center gap-1 px-2 py-1 text-xs bg-red-50 text-red-700 rounded-md font-medium"
          >
            <MinusCircleIcon class="w-3.5 h-3.5" />
            {{ comparison.missingInTarget }} removed
          </span>
          <span
            v-if="comparison.newInTarget > 0"
            class="inline-flex items-center gap-1 px-2 py-1 text-xs bg-blue-50 text-blue-700 rounded-md font-medium"
          >
            <PlusCircleIcon class="w-3.5 h-3.5" />
            {{ comparison.newInTarget }} added
          </span>
        </div>
      </div>

      <!-- View Mode Toggle - always visible -->
      <div class="flex items-center gap-2 ml-4 pl-4 border-l border-gray-300" @click.stop>
        <button
          class="px-3 py-1 text-xs font-medium rounded-md transition-colors"
          :class="
            viewMode === 'columns'
              ? 'bg-white text-gray-900 shadow-sm border border-gray-300'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
          "
          @click="selectViewMode('columns')"
        >
          Columns
        </button>
        <button
          class="px-3 py-1 text-xs font-medium rounded-md transition-colors"
          :class="
            viewMode === 'ddl'
              ? 'bg-white text-gray-900 shadow-sm border border-gray-300'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
          "
          @click="selectViewMode('ddl')"
        >
          DDL
        </button>
      </div>
    </button>

    <!-- Expanded State: Content -->
    <div v-if="expanded" class="bg-gray-50 dark:bg-gray-900">
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
              class="grid grid-cols-[1fr_auto_1fr] gap-4 px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors"
              :class="getRowClass(col)"
            >
              <!-- Source Column -->
              <div v-if="col.sourceColumn" class="flex items-center gap-2 min-w-0">
                <span class="font-mono font-medium text-gray-900">{{ col.sourceColumn.name }}</span>
                <span class="text-gray-600 text-xs">{{ col.sourceColumn.dataType }}</span>
                <span
                  v-if="col.sourceColumn.isPrimaryKey"
                  class="px-1.5 py-0.5 text-xs bg-blue-100 text-blue-700 rounded font-medium"
                >
                  PK
                </span>
                <span
                  v-if="!col.sourceColumn.isNullable"
                  class="px-1.5 py-0.5 text-xs bg-gray-100 text-gray-700 rounded font-medium"
                  title="NOT NULL"
                >
                  NN
                </span>
              </div>
              <div v-else class="text-gray-400 text-xs">-</div>

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
              <div v-if="col.targetColumn" class="flex items-center gap-2 min-w-0">
                <span class="font-mono font-medium text-gray-900">{{ col.targetColumn.name }}</span>
                <span class="text-gray-600 text-xs">{{ col.targetColumn.dataType }}</span>
                <span
                  v-if="col.targetColumn.isPrimaryKey"
                  class="px-1.5 py-0.5 text-xs bg-blue-100 text-blue-700 rounded font-medium"
                >
                  PK
                </span>
                <span
                  v-if="!col.targetColumn.isNullable"
                  class="px-1.5 py-0.5 text-xs bg-gray-100 text-gray-700 rounded font-medium"
                  title="NOT NULL"
                >
                  NN
                </span>
              </div>
              <div v-else class="text-gray-400 text-xs">-</div>
            </div>
          </div>
        </div>
      </div>

      <!-- DDL View -->
      <div v-else-if="viewMode === 'ddl'" class="grid grid-cols-2 gap-4 p-4">
        <!-- Source DDL -->
        <div class="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
          <div
            class="px-4 py-2 bg-gray-50 border-b border-gray-200 flex items-center justify-between"
          >
            <span class="text-xs font-medium text-gray-700 uppercase tracking-wide">
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
            <div v-else class="text-sm text-gray-500 text-center py-8">DDL not available</div>
          </div>
        </div>

        <!-- Target DDL -->
        <div class="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
          <div
            class="px-4 py-2 bg-gray-50 border-b border-gray-200 flex items-center justify-between"
          >
            <span class="text-xs font-medium text-gray-700 uppercase tracking-wide">
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
            <div v-else class="text-sm text-gray-500 text-center py-8">DDL not available</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import {
  ChevronDownIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  MinusCircleIcon,
  PlusCircleIcon,
  Squares2X2Icon
} from '@heroicons/vue/24/outline'
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

  return {
    'border-l-2 border-green-500': col.difference.type === 'match',
    'border-l-2 border-yellow-500': col.difference.type === 'type-diff',
    'border-l-2 border-red-500': col.difference.type === 'missing',
    'border-l-2 border-blue-500': col.difference.type === 'new'
  }
}

function getDiffIcon(type: string) {
  const iconMap: Record<string, typeof CheckCircleIcon> = {
    match: CheckCircleIcon,
    'type-diff': ExclamationTriangleIcon,
    missing: MinusCircleIcon,
    new: PlusCircleIcon
  }
  return iconMap[type] || null
}

function getDiffIconColor(type: string) {
  return {
    'text-green-600': type === 'match',
    'text-yellow-600': type === 'type-diff',
    'text-red-600': type === 'missing',
    'text-blue-600': type === 'new'
  }
}
</script>
