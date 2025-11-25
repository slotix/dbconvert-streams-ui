<script setup lang="ts">
import { ref, watch, computed, onMounted } from 'vue'
import { AgGridVue } from 'ag-grid-vue3'
import type { ColDef } from 'ag-grid-community'
import { type SQLTableMeta, type SQLViewMeta } from '@/types/metadata'
import connections from '@/api/connections'
import { formatTableValue } from '@/utils/dataUtils'
import { useObjectTabStateStore } from '@/stores/objectTabState'
import { useConnectionsStore } from '@/stores/connections'
import ColumnContextMenu from './ColumnContextMenu.vue'
import { MonacoEditor } from '@/components/monaco'
import { determineFilterType } from '@/utils/agGridFilterUtils'
import {
  useBaseAGGridView,
  type FetchDataParams,
  type FetchDataResult
} from '@/composables/useBaseAGGridView'

const props = defineProps<{
  tableMeta: SQLTableMeta | SQLViewMeta
  connectionId: string
  database: string
  isView?: boolean
  approxRows?: number // Optional approximate row count from database overview
  objectKey: string // Unique key for this table/view tab (from paneTabs store)
}>()

// Store for persisting tab state including AG Grid data state
const tabStateStore = useObjectTabStateStore()

// Connections store to get database type
const connectionsStore = useConnectionsStore()

// Get connection type for proper SQL identifier quoting
const connectionType = computed(() => {
  const conn = connectionsStore.connectionByID(props.connectionId)
  return conn?.type || 'mysql' // Default to mysql if not found
})

// Exact row count state for views
const isCountingRows = ref(false)
const exactRowCount = ref<number | null>(null)
const countError = ref<string | null>(null)

// Cache for exact counts (persists across table switches within same context)
const exactCountCache = ref<Map<string, number>>(new Map())

// Generate cache key for current table/view
const getCacheKey = () => {
  const objectName = getObjectName(props.tableMeta)
  const objectSchema = getObjectSchema(props.tableMeta)
  return `${props.objectKey}:${props.connectionId}:${props.database}:${objectSchema || ''}:${objectName}`
}

function getObjectName(meta: SQLTableMeta | SQLViewMeta): string {
  return props.isView ? (meta as SQLViewMeta).name : (meta as SQLTableMeta).name
}

function getObjectSchema(meta: SQLTableMeta | SQLViewMeta): string {
  return props.isView ? (meta as SQLViewMeta).schema : (meta as SQLTableMeta).schema
}

// Generate column definitions from table metadata
const columnDefs = computed<ColDef[]>(() => {
  const meta = props.tableMeta
  if (!meta || !meta.columns) return []

  const isLargeTable = props.approxRows && props.approxRows > 1000000

  // Build a set of indexed columns for fast lookup
  const indexedColumns = new Set<string>()

  // Add primary key columns
  if (!props.isView && (meta as SQLTableMeta).primaryKeys) {
    ;(meta as SQLTableMeta).primaryKeys.forEach((pk) => indexedColumns.add(pk.toLowerCase()))
  }

  // Add indexed columns from indexes
  if (!props.isView && (meta as SQLTableMeta).indexes) {
    ;(meta as SQLTableMeta).indexes.forEach((idx) => {
      // Only consider the first column of composite indexes for sorting
      if (idx.columns && idx.columns.length > 0) {
        indexedColumns.add(idx.columns[0].toLowerCase())
      }
    })
  }

  return meta.columns.map((col) => {
    const isIndexed = indexedColumns.has(col.name.toLowerCase())
    const canSort = !isLargeTable || isIndexed

    let tooltip = `${col.dataType}${col.isNullable ? '' : ' NOT NULL'}`

    // Add tooltip info for large tables
    if (isLargeTable) {
      if (isIndexed) {
        tooltip += ' - Indexed (sortable, Ctrl+Click for multi-sort)'
      } else {
        tooltip += ' - No index (sorting disabled)'
      }
    } else {
      tooltip += ' - Click to sort, Ctrl+Click for multi-sort'
    }

    // Determine filter type based on column data type
    const filterType = determineFilterType(col.dataType)

    return {
      field: col.name,
      headerName: col.name,
      sortable: canSort,
      filter: filterType,
      floatingFilter: false,
      suppressHeaderMenuButton: false,
      suppressHeaderFilterButton: true,
      resizable: true,
      flex: 1,
      minWidth: 120,
      valueFormatter: (params) => formatTableValue(params.value),
      headerTooltip: tooltip,
      wrapText: false,
      autoHeight: false,
      // Add header class to distinguish sortable vs non-sortable
      headerClass: isLargeTable && !isIndexed ? 'ag-header-cell-not-sortable' : undefined
    }
  })
})

// Data fetching callback for base composable
async function fetchData(params: FetchDataParams): Promise<FetchDataResult> {
  const objectName = getObjectName(props.tableMeta)
  const objectSchema = getObjectSchema(props.tableMeta)

  if (!objectName) throw new Error('Table/View name is undefined')

  // Build comma-separated order_by and order_dir for multi-column sorting
  let orderBy: string | undefined
  let orderDir: string | undefined

  if (params.sortModel.length > 0) {
    orderBy = params.sortModel.map((s) => s.colId).join(',')
    orderDir = params.sortModel.map((s) => s.sort?.toUpperCase() || 'ASC').join(',')
  }

  const queryParams: {
    limit: number
    offset: number
    skip_count: boolean
    schema?: string
    order_by?: string
    order_dir?: string
    where?: string
    tabId?: string
  } = {
    limit: params.limit,
    offset: params.offset,
    // Skip count if we already have one (either approximate or exact)
    skip_count:
      (params.offset > 0 && baseGrid.totalRowCount.value > 0) ||
      (exactRowCount.value !== null && !params.whereClause)
  }

  // Add optional parameters only if they have values
  if (objectSchema && objectSchema !== 'public' && objectSchema !== '') {
    queryParams.schema = objectSchema
  }
  if (orderBy) {
    queryParams.order_by = orderBy
  }
  if (orderDir) {
    queryParams.order_dir = orderDir
  }
  if (params.whereClause) {
    queryParams.where = params.whereClause
  }
  // Add tabId for query grouping
  if (objectName) {
    queryParams.tabId = objectName
  }

  const data = props.isView
    ? await connections.getViewData(props.connectionId, props.database, objectName, queryParams)
    : await connections.getTableData(props.connectionId, props.database, objectName, queryParams)

  // Convert rows array to objects with column names as keys
  const convertedRowData = data.rows.map((row) => {
    const obj: Record<string, unknown> = {}
    data.columns.forEach((colName, idx) => {
      obj[colName] = row[idx]
    })
    return obj
  })

  return {
    rows: convertedRowData,
    columns: data.columns,
    totalCount: data.total_count
  }
}

// Initialize base AG Grid composable
const baseGrid = useBaseAGGridView({
  objectKey: computed(() => props.objectKey),
  connectionType,
  initialTotalRowCount: computed(() => props.approxRows || 0),
  fetchData,
  onFilterChanged: () => {
    // Reset exact count for views when filters change
    exactRowCount.value = null
    countError.value = null
  }
})

// Watch for approxRows prop changes and update totalRowCount
// Only update if we don't have an exact count saved
watch(
  () => props.approxRows,
  (newApproxRows) => {
    // Check if we have a saved exact count - if so, don't overwrite with approx
    const savedState = tabStateStore.getAGGridDataState(props.objectKey)

    if (savedState && savedState.exactRowCount !== null) {
      // Use the saved exact count
      baseGrid.totalRowCount.value = savedState.exactRowCount
      exactRowCount.value = savedState.exactRowCount
      return
    }

    // Otherwise use approxRows
    if (newApproxRows && newApproxRows > 0) {
      baseGrid.totalRowCount.value = newApproxRows
    } else if (newApproxRows === -1) {
      // -1 indicates unknown count (for views)
      baseGrid.totalRowCount.value = -1
    } else if (newApproxRows === undefined) {
      // Reset count when switching to a table not in top tables list
      baseGrid.totalRowCount.value = 0
    }

    // Recreate datasource so AG Grid knows about the updated totalRowCount
    if (baseGrid.gridApi.value && !baseGrid.gridApi.value.isDestroyed()) {
      baseGrid.gridApi.value.setGridOption('datasource', baseGrid.createDatasource())
    }
  },
  { immediate: true }
)

// Watch for table changes and restore state from store or reset
watch(
  () => props.tableMeta,
  () => {
    const savedState = tabStateStore.getAGGridDataState(props.objectKey)

    if (savedState) {
      // Restore state from store
      baseGrid.currentSortModel.value = savedState.sortModel || []
      exactRowCount.value = savedState.exactRowCount || null
      baseGrid.agGridFilters.value = savedState.filterModel || {}

      // Apply saved filters and sort to grid
      if (baseGrid.gridApi.value) {
        // Set filter model
        baseGrid.gridApi.value.setFilterModel(savedState.filterModel || null)

        // Apply sort model
        if (savedState.sortModel && savedState.sortModel.length > 0) {
          const columnState = savedState.sortModel.map((sort, index) => ({
            colId: sort.colId,
            sort: sort.sort,
            sortIndex: index
          }))
          baseGrid.gridApi.value.applyColumnState({
            state: columnState,
            defaultState: { sort: null }
          })
        }
      }
    } else {
      // Reset to default state
      baseGrid.currentSortModel.value = []
      countError.value = null
      baseGrid.agGridFilters.value = {}
      baseGrid.agGridWhereSQL.value = ''

      if (baseGrid.gridApi.value) {
        // Clear any AG Grid column filters carried over from the previous table
        baseGrid.gridApi.value.setFilterModel(null)
      }

      // Check if we have a cached exact count for this table
      const cacheKey = getCacheKey()
      const cachedCount = exactCountCache.value.get(cacheKey)
      if (cachedCount !== undefined) {
        exactRowCount.value = cachedCount
        baseGrid.totalRowCount.value = cachedCount
      } else {
        exactRowCount.value = null
      }
    }

    // Recreate datasource to ensure AG Grid knows about the (potentially updated) totalRowCount
    if (baseGrid.gridApi.value) {
      baseGrid.gridApi.value.setGridOption('datasource', baseGrid.createDatasource())
    }
  },
  { deep: true }
)

// Reload data when table metadata changes
watch(
  () => props.tableMeta,
  () => {
    if (baseGrid.gridApi.value) {
      const savedState = tabStateStore.getAGGridDataState(props.objectKey)

      // Reset the datasource with the new table
      baseGrid.gridApi.value.setGridOption('datasource', baseGrid.createDatasource())

      // Apply saved state AFTER setting datasource
      setTimeout(() => {
        if (!baseGrid.gridApi.value) return

        if (savedState && savedState.sortModel && savedState.sortModel.length > 0) {
          const columnState = savedState.sortModel.map((sort, index) => ({
            colId: sort.colId,
            sort: sort.sort,
            sortIndex: index
          }))
          baseGrid.gridApi.value.applyColumnState({
            state: columnState,
            defaultState: { sort: null }
          })
        } else {
          // Clear any existing sort state when switching tables (only if no saved state)
          baseGrid.gridApi.value.applyColumnState({
            defaultState: { sort: null }
          })
        }
      }, 100)
    }
  },
  { deep: true }
)

// Save AG Grid state to store when it changes (including exact count)
watch(
  () =>
    [baseGrid.currentSortModel.value, baseGrid.agGridFilters.value, exactRowCount.value] as const,
  ([sortModel, filterModel, exactCount]) => {
    tabStateStore.setAGGridDataState(props.objectKey, {
      sortModel,
      filterModel,
      totalRowCount: baseGrid.totalRowCount.value,
      exactRowCount: exactCount
    })
  },
  { deep: true }
)

// Calculate exact row count for tables and views (on-demand)
async function calculateExactCount() {
  isCountingRows.value = true
  countError.value = null

  try {
    const objectName = getObjectName(props.tableMeta)
    const objectSchema = getObjectSchema(props.tableMeta)

    if (!objectName) throw new Error(`${props.isView ? 'View' : 'Table'} name is undefined`)

    // Build parameters
    const params: { schema?: string; where?: string; tabId?: string } = {}
    if (objectSchema && objectSchema !== 'public' && objectSchema !== '') {
      params.schema = objectSchema
    }
    if (baseGrid.combinedWhereClause.value) {
      params.where = baseGrid.combinedWhereClause.value
    }
    params.tabId = objectName

    // Call appropriate API based on whether it's a view or table
    const result = props.isView
      ? await connections.getViewExactCount(props.connectionId, props.database, objectName, params)
      : await connections.getTableExactCount(props.connectionId, props.database, objectName, params)

    exactRowCount.value = result.count
    baseGrid.totalRowCount.value = result.count

    // Cache the exact count (only if no filters applied)
    if (!baseGrid.combinedWhereClause.value) {
      const cacheKey = getCacheKey()
      exactCountCache.value.set(cacheKey, result.count)
    }

    // Trigger cache purge to immediately update pagination
    if (baseGrid.gridApi.value) {
      baseGrid.gridApi.value.purgeInfiniteCache()
    }
  } catch (err) {
    console.error('Error calculating exact count:', err)
    countError.value = err instanceof Error ? err.message : 'Failed to calculate count'
  } finally {
    isCountingRows.value = false
  }
}

// Database-specific clear all filters wrapper
function clearAllFilters() {
  // Use the base clearing
  baseGrid.clearAllFilters()

  // Reset exact count for views
  exactRowCount.value = null
  countError.value = null
}

// Initialize and restore state on mount
onMounted(() => {
  const savedState = tabStateStore.getAGGridDataState(props.objectKey)

  if (savedState) {
    // Restore exact row count
    exactRowCount.value = savedState.exactRowCount || null
  }
})

// Expose methods to parent
defineExpose({
  refresh: baseGrid.refresh,
  getGridState: baseGrid.getGridState,
  applyGridState: baseGrid.applyGridState
})
</script>

<template>
  <div class="flex flex-col h-full">
    <!-- SQL Query Banner (like DataGrip) -->
    <div
      v-if="baseGrid.fullSqlQuery.value"
      class="mb-3 border border-gray-200 dark:border-gray-700 rounded-md overflow-hidden"
    >
      <div class="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-900/40">
        <!-- SQL Content with Syntax Highlighting -->
        <div class="flex-1 min-w-0">
          <MonacoEditor
            :model-value="baseGrid.displayedSql.value"
            :language="baseGrid.monacoLanguage.value"
            :height="baseGrid.sqlBannerHeight.value"
            :read-only="true"
            :options="baseGrid.sqlBannerEditorOptions.value"
          />
        </div>

        <!-- Action Buttons -->
        <div class="flex items-center gap-1 shrink-0">
          <!-- Expand/Collapse button (only show if truncation is needed) -->
          <button
            v-if="baseGrid.needsTruncation.value"
            type="button"
            class="px-2 py-1 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
            :title="baseGrid.isSqlBannerExpanded.value ? 'Collapse' : 'Expand'"
            @click="baseGrid.toggleSqlBanner"
          >
            {{ baseGrid.isSqlBannerExpanded.value ? 'Collapse' : 'Expand' }}
          </button>

          <!-- Clear filters button -->
          <button
            type="button"
            class="px-2 py-1 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors flex items-center gap-1"
            title="Clear all filters and sorting"
            @click="clearAllFilters"
          >
            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
            Clear
          </button>
        </div>
      </div>
    </div>

    <!-- Large table warning (keep at top) -->
    <div
      v-if="!isView && approxRows && approxRows > 1000000"
      class="mb-3 flex items-center justify-between"
    >
      <span class="text-xs text-blue-600 dark:text-blue-400 flex items-center gap-1">
        <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path
            fill-rule="evenodd"
            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
            clip-rule="evenodd"
          />
        </svg>
        Large table: only indexed columns are sortable
      </span>
    </div>

    <!-- Error message -->
    <div
      v-if="baseGrid.error.value"
      class="mb-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-md text-sm text-red-700 dark:text-red-300"
    >
      {{ baseGrid.error.value }}
    </div>

    <!-- AG Grid -->
    <div
      :ref="(el) => (baseGrid.gridContainerRef.value = el as HTMLElement)"
      class="ag-theme-alpine"
      :style="{
        width: '100%',
        height: '750px'
      }"
    >
      <AgGridVue
        :columnDefs="columnDefs"
        :gridOptions="baseGrid.gridOptions.value"
        style="width: 100%; height: 100%"
        @grid-ready="baseGrid.onGridReady"
      />
    </div>

    <!-- Row count controls below table -->
    <div
      v-if="(!isView && approxRows && approxRows > 0) || isView === true"
      class="mt-3 flex items-center justify-between"
    >
      <div class="flex items-center gap-3">
        <!-- Approximate count hint -->
        <span
          v-if="!isView && baseGrid.totalRowCount.value > 0 && exactRowCount === null"
          class="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1"
        >
          <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path
              fill-rule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
              clip-rule="evenodd"
            />
          </svg>
          <span>Count (~{{ baseGrid.totalRowCount.value.toLocaleString() }}) is approximate</span>
        </span>

        <!-- Exact count result -->
        <span
          v-if="exactRowCount !== null"
          class="text-sm text-gray-600 dark:text-gray-300 flex items-center gap-1"
        >
          <svg
            class="w-4 h-4 text-green-600 dark:text-green-400"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fill-rule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clip-rule="evenodd"
            />
          </svg>
          <span
            >Exact count:
            <span class="font-semibold text-green-600 dark:text-green-400">{{
              exactRowCount.toLocaleString()
            }}</span></span
          >
        </span>

        <!-- Error display -->
        <span
          v-if="countError"
          class="text-sm text-red-600 dark:text-red-400 flex items-center gap-1"
        >
          <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path
              fill-rule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
              clip-rule="evenodd"
            />
          </svg>
          {{ countError }}
        </span>
      </div>

      <!-- Calculate Exact Count link -->
      <button
        v-if="exactRowCount === null"
        type="button"
        :disabled="isCountingRows"
        class="text-xs text-teal-600 dark:text-teal-400 hover:text-teal-800 dark:hover:text-teal-300 bg-teal-50 dark:bg-teal-900/20 hover:bg-teal-100 dark:hover:bg-teal-800/30 rounded-full px-3 py-1 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5 w-fit"
        :title="`Execute COUNT(*) query to get exact ${isView ? 'row' : 'total'} count`"
        @click="calculateExactCount"
      >
        <svg
          v-if="!isCountingRows"
          class="w-3.5 h-3.5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
          />
        </svg>
        <svg v-else class="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
          <circle
            class="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            stroke-width="4"
          ></circle>
          <path
            class="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          ></path>
        </svg>
        <span>{{ isCountingRows ? 'Counting...' : 'Calculate exact count' }}</span>
      </button>
    </div>

    <!-- Custom Context Menu -->
    <ColumnContextMenu
      v-if="baseGrid.showContextMenu.value"
      :x="baseGrid.contextMenuX.value"
      :y="baseGrid.contextMenuY.value"
      :column="baseGrid.contextMenuColumn.value"
      :grid-api="baseGrid.gridApi.value"
      @close="baseGrid.closeContextMenu"
    />
  </div>
</template>

<style scoped>
:deep(.ag-cell-wrap-text) {
  white-space: normal;
  line-height: 1.5;
  padding: 8px;
}

/* Style for non-sortable columns in large tables */
:deep(.ag-header-cell-not-sortable) {
  opacity: 0.6;
  cursor: not-allowed !important;
}

:deep(.ag-header-cell-not-sortable .ag-header-cell-label) {
  cursor: not-allowed !important;
}
</style>
