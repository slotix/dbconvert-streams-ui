<template>
  <div class="flex flex-col h-full bg-gray-50 dark:bg-gray-900">
    <!-- Header -->
    <div
      class="flex items-center justify-between px-4 py-2.5 bg-white dark:bg-gray-850 border-b border-gray-200 dark:border-gray-700"
    >
      <div class="flex items-center gap-2">
        <Code class="w-5 h-5 text-teal-600 dark:text-teal-400" />
        <h3 class="text-sm font-semibold text-gray-900 dark:text-gray-100">SQL Queries</h3>
        <span
          v-if="queries.length > 0"
          class="px-2 py-0.5 text-xs rounded-full bg-teal-100 dark:bg-teal-900/50 text-teal-700 dark:text-teal-300"
        >
          {{ queries.length }}
        </span>
      </div>
      <div class="flex items-center gap-2">
        <!-- Template Selector - hide for federated mode (templates don't apply to DuckDB syntax) -->
        <select
          v-if="activeQuery && !needsFederatedExecution"
          class="text-xs px-2 py-1.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded text-gray-700 dark:text-gray-300 focus:ring-1 focus:ring-teal-500"
          @change="applyTemplate($event, activeQuery)"
        >
          <option value="">Templates</option>
          <option value="cte">CTE with aggregation</option>
          <option value="join">Multi-table JOIN</option>
          <option value="subquery">Subquery filter</option>
          <option value="union">UNION query</option>
        </select>
        <!-- Source count badge -->
        <span
          v-if="sourceConnections.length > 1"
          class="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded"
        >
          {{ sourceConnections.length }} sources
        </span>
      </div>
    </div>

    <!-- Empty State -->
    <div
      v-if="queries.length === 0"
      class="flex flex-col items-center justify-center flex-1 py-12 px-4"
    >
      <FileText class="w-16 h-16 text-gray-400 dark:text-gray-500 mb-4" />
      <h4 class="text-base font-medium text-gray-900 dark:text-gray-100 mb-2">No queries yet</h4>
      <p class="text-sm text-gray-500 dark:text-gray-400 text-center max-w-md mb-6">
        {{
          needsFederatedExecution
            ? 'Write SQL queries that join data across multiple sources. Use connection aliases to reference tables (e.g., src.tablename).'
            : 'Add SQL queries with JOINs, CTEs, and aggregations to create derived datasets.'
        }}
      </p>
      <button
        type="button"
        class="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 dark:bg-teal-700 dark:hover:bg-teal-600 rounded-md transition-colors"
        @click="addQuery"
      >
        <Plus class="w-4 h-4" />
        Add query
      </button>
    </div>

    <!-- Tabbed Query Editor -->
    <div v-else class="flex flex-col flex-1 min-h-0">
      <!-- Query Tabs -->
      <SqlQueryTabs
        :tabs="queryTabs"
        :active-tab-id="activeTabId"
        @select="setActiveTab"
        @close="removeQuery"
        @add="addQuery"
        @rename="handleRenameTab"
      />

      <!-- Query Content -->
      <div v-if="activeQuery" class="flex-1 flex flex-col min-h-0 bg-white dark:bg-gray-850">
        <!-- Query Info Bar -->
        <div
          class="flex items-center justify-between px-4 py-2 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700"
        >
          <!-- Table Name Input -->
          <div class="flex items-center gap-3 flex-1">
            <span class="text-xs text-gray-500 dark:text-gray-400">Result table name:</span>
            <input
              v-model="activeQuery.name"
              type="text"
              placeholder="target_table_name"
              class="px-3 py-1 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              @blur="validateTableName(activeQuery, activeQueryIndex)"
            />
          </div>

          <!-- Actions -->
          <div class="flex items-center gap-2">
            <button
              type="button"
              class="inline-flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 dark:bg-teal-700 dark:hover:bg-teal-600 rounded-md transition-colors shadow-sm"
              title="Run query and preview results"
              :disabled="isRunning === activeQueryIndex || !activeQuery.query?.trim()"
              @click="runPreview(activeQuery, activeQueryIndex)"
            >
              <Play v-if="isRunning !== activeQueryIndex" class="w-4 h-4" />
              <RefreshCw v-else class="w-4 h-4 animate-spin" />
              <span>{{ isRunning === activeQueryIndex ? 'Running...' : 'Run' }}</span>
            </button>
          </div>
        </div>

        <!-- Connected Sources Reference Panel (shown when 2+ sources for alias reference) -->
        <div
          v-if="sourceConnections.length > 1"
          class="px-4 py-2 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700"
        >
          <div class="flex items-start gap-3">
            <span class="text-xs font-medium text-gray-600 dark:text-gray-400 shrink-0 pt-0.5"
              >Source Aliases:</span
            >
            <div class="flex flex-wrap gap-2">
              <div
                v-for="conn in sourceConnections"
                :key="conn.connectionId"
                class="inline-flex items-center gap-1.5 px-2 py-1 text-xs bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded"
              >
                <span class="font-mono font-semibold text-teal-600 dark:text-teal-400">{{
                  conn.alias
                }}</span>
                <span class="text-gray-400 dark:text-gray-500">→</span>
                <span class="text-gray-600 dark:text-gray-400">{{
                  getConnectionLabel(conn.connectionId)
                }}</span>
                <span
                  v-if="isFileConnection(conn.connectionId)"
                  class="ml-1 px-1.5 py-0.5 text-[10px] bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded"
                  title="File sources are read directly using DuckDB functions"
                  >file</span
                >
                <span
                  v-else
                  class="ml-1 px-1.5 py-0.5 text-[10px] bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded"
                  title="Use alias.table syntax to reference tables"
                  >{{ conn.alias }}.table</span
                >
              </div>
            </div>
          </div>
        </div>

        <!-- Split View: Editor + Results -->
        <div ref="splitContainerRef" class="flex-1 flex overflow-hidden min-h-0">
          <!-- SQL Editor Pane -->
          <div
            ref="leftPaneRef"
            class="border-r border-gray-200 dark:border-gray-700 min-h-0"
            :style="{ width: `${editorWidth}%` }"
          >
            <SqlEditor
              v-model="activeQuery.query"
              :dialect="connectionDialect"
              :schema-context="schemaContext"
              height="100%"
              placeholder="Enter your SQL query (JOINs, CTEs, aggregations)..."
              @change="handleQueryChange(activeQuery)"
            />
          </div>

          <!-- Resizable Divider -->
          <div
            class="w-1 bg-gray-200 dark:bg-gray-700 hover:bg-teal-500 dark:hover:bg-teal-500 cursor-col-resize transition-colors"
            @mousedown="startResize"
          ></div>

          <!-- Results Pane -->
          <div class="min-h-0 flex flex-col" :style="{ width: `${100 - editorWidth}%` }">
            <!-- Results Header -->
            <div
              class="flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700"
            >
              <div class="flex items-center gap-2">
                <Sheet class="w-4 h-4 text-teal-500" />
                <span class="text-xs font-medium text-gray-600 dark:text-gray-300">
                  Results
                  <span v-if="previewData[activeQueryIndex]" class="text-gray-400">
                    ({{ previewData[activeQueryIndex].rows.length }} rows)
                  </span>
                </span>
              </div>
            </div>

            <!-- Results Content -->
            <div class="flex-1 overflow-auto bg-white dark:bg-gray-900">
              <!-- Preview Error -->
              <div
                v-if="previewErrors[activeQueryIndex]"
                class="p-4 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20"
              >
                <div class="flex items-start gap-2">
                  <AlertTriangle class="w-4 h-4 shrink-0 mt-0.5" />
                  <div>
                    <p class="font-medium">Query error</p>
                    <p class="mt-1 text-red-500 dark:text-red-300">
                      {{ previewErrors[activeQueryIndex] }}
                    </p>
                  </div>
                </div>
              </div>

              <!-- Preview Data Table -->
              <div
                v-else-if="
                  previewData[activeQueryIndex] && previewData[activeQueryIndex].rows.length > 0
                "
              >
                <table class="w-full text-xs">
                  <thead class="bg-gray-50 dark:bg-gray-900 sticky top-0">
                    <tr>
                      <th
                        v-for="col in previewData[activeQueryIndex].columns"
                        :key="col"
                        class="px-3 py-2 text-left font-medium text-gray-600 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700 whitespace-nowrap"
                      >
                        {{ col }}
                      </th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-gray-100 dark:divide-gray-800">
                    <tr
                      v-for="(row, idx) in previewData[activeQueryIndex].rows"
                      :key="idx"
                      class="hover:bg-gray-50 dark:hover:bg-gray-800/50"
                    >
                      <td
                        v-for="col in previewData[activeQueryIndex].columns"
                        :key="col"
                        class="px-3 py-2 text-gray-900 dark:text-gray-100 whitespace-nowrap max-w-[200px] truncate"
                        :title="formatCellValue(row[col])"
                      >
                        {{ formatCellValue(row[col]) }}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <!-- Empty Results -->
              <div
                v-else-if="
                  previewData[activeQueryIndex] && previewData[activeQueryIndex].rows.length === 0
                "
                class="p-8 text-center text-xs text-gray-500 dark:text-gray-400"
              >
                Query returned no rows
              </div>

              <!-- No Results Yet -->
              <div v-else class="flex flex-col items-center justify-center h-full p-8 text-center">
                <Play class="w-12 h-12 text-gray-300 dark:text-gray-600 mb-3" />
                <p class="text-sm text-gray-500 dark:text-gray-400">
                  Run the query to preview results
                </p>
              </div>
            </div>

            <!-- Detected Schema Info (bottom section) -->
            <div
              v-if="activeQuery.columns && activeQuery.columns.length > 0"
              class="border-t border-gray-200 dark:border-gray-700 p-3 bg-gray-50 dark:bg-gray-900/50"
            >
              <div class="flex items-center gap-2 mb-2">
                <CheckCircle class="w-4 h-4 text-green-500" />
                <span class="text-xs font-medium text-gray-700 dark:text-gray-300"
                  >Detected Schema ({{ activeQuery.columns.length }} columns)</span
                >
              </div>
              <div class="flex flex-wrap gap-1.5">
                <span
                  v-for="col in activeQuery.columns"
                  :key="col.name"
                  class="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded"
                >
                  <span class="font-medium text-gray-900 dark:text-gray-100">{{ col.name }}</span>
                  <span class="text-gray-500 dark:text-gray-400">{{ col.type }}</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import {
  AlertTriangle,
  CheckCircle,
  Code,
  FileText,
  Play,
  Plus,
  RefreshCw,
  Sheet
} from 'lucide-vue-next'
import SqlEditor from '@/components/monaco/SqlEditor.vue'
import { SqlQueryTabs } from '@/components/database/sql-console'
import { useStreamsStore } from '@/stores/streamConfig'
import { useConnectionsStore } from '@/stores/connections'
import { useExplorerNavigationStore } from '@/stores/explorerNavigation'
import type { QuerySource } from '@/types/streamConfig'
import type { SchemaContext } from '@/composables/useMonacoSqlProviders'
import type { ConnectionMapping } from '@/api/federated'
import { executeFederatedQuery } from '@/api/federated'
import connections from '@/api/connections'
import { useSplitPaneResize } from '@/composables/useSplitPaneResize'
import {
  getConnectionKindFromSpec,
  getSqlDialectFromConnection,
  isFileBasedKind
} from '@/types/specs'

interface Props {
  sourceConnections?: ConnectionMapping[]
}

const props = withDefaults(defineProps<Props>(), {
  sourceConnections: () => []
})

const streamsStore = useStreamsStore()
const connectionsStore = useConnectionsStore()
const navigationStore = useExplorerNavigationStore()

// Federated execution needed when multiple DB sources or mixed DB+file sources
const needsFederatedExecution = computed(() => {
  if (props.sourceConnections.length <= 1) return false
  // Count database vs file connections
  const dbCount = props.sourceConnections.filter(
    (conn) => !isFileConnection(conn.connectionId)
  ).length
  const fileCount = props.sourceConnections.filter((conn) =>
    isFileConnection(conn.connectionId)
  ).length
  // Federated execution needed for: multiple DBs OR mix of DB+file
  return dbCount > 1 || (dbCount > 0 && fileCount > 0)
})

// Helper to get connection display label
function getConnectionLabel(connectionId: string): string {
  const conn = connectionsStore.connectionByID(connectionId)
  if (!conn) return connectionId
  return conn.name || conn.host || connectionId
}

// Helper to check if connection is file-based - spec is the ONLY source of truth
function isFileConnection(connectionId: string): boolean {
  const conn = connectionsStore.connectionByID(connectionId)
  if (!conn) return false
  const kind = getConnectionKindFromSpec(conn.spec)
  return isFileBasedKind(kind)
}

// Local state
const activeTabId = ref<string>('')
const isRunning = ref<number | null>(null)
const previewErrors = ref<Record<number, string>>({})
const previewData = ref<Record<number, { columns: string[]; rows: Record<string, unknown>[] }>>({})
const schemaContext = ref<SchemaContext | undefined>()
const {
  splitGrow: editorWidth,
  onDividerMouseDown: startResize,
  splitContainerRef,
  leftPaneRef
} = useSplitPaneResize()
const previewLimit = 100

// Queries are stored on the first connection.
// In federated mode, queries span multiple connections using aliases (e.g., src.table, src2.table)
const queries = computed({
  get: () => streamsStore.currentStreamConfig?.source?.connections?.[0]?.queries || [],
  set: (value: QuerySource[]) => {
    const conn = streamsStore.currentStreamConfig?.source?.connections?.[0]
    if (conn) {
      conn.queries = value
    }
  }
})

// Convert queries to tab format
const queryTabs = computed(() =>
  queries.value.map((query, index) => ({
    id: `query-${index}`,
    name: query.name || `Query ${index + 1}`,
    query: query.query || '',
    createdAt: Date.now(),
    updatedAt: Date.now()
  }))
)

// Active query management
const activeQueryIndex = computed(() => {
  if (!activeTabId.value) return 0
  const index = parseInt(activeTabId.value.replace('query-', ''))
  return isNaN(index) ? 0 : index
})

const activeQuery = computed(() => queries.value[activeQueryIndex.value] || null)

// Initialize active tab
watch(
  queries,
  (newQueries) => {
    if (newQueries.length > 0 && !activeTabId.value) {
      activeTabId.value = `query-0`
    }
    // Reset active tab if it's out of bounds
    if (activeQueryIndex.value >= newQueries.length) {
      activeTabId.value = newQueries.length > 0 ? `query-${newQueries.length - 1}` : ''
    }
  },
  { immediate: true }
)

// Auto-create first query when federated execution is needed
onMounted(() => {
  if (needsFederatedExecution.value && queries.value.length === 0) {
    addQuery()
  }
})

// Tab management
function setActiveTab(tabId: string) {
  activeTabId.value = tabId
}

function handleRenameTab(tabId: string, newName: string) {
  const index = parseInt(tabId.replace('query-', ''))
  if (!isNaN(index) && queries.value[index]) {
    queries.value[index].name = newName
  }
}

// Get connection dialect for SQL syntax highlighting
// In federated mode, use generic SQL since DuckDB uses its own dialect
const connectionDialect = computed((): 'mysql' | 'pgsql' | 'sql' => {
  if (needsFederatedExecution.value) {
    return 'sql' // Federated queries use DuckDB's SQL dialect
  }
  const sourceConnectionId =
    streamsStore.currentStreamConfig?.source?.connections?.[0]?.connectionId
  if (sourceConnectionId) {
    const connection = connectionsStore.connectionByID(sourceConnectionId)
    return getSqlDialectFromConnection(connection?.spec, connection?.type)
  }
  return 'sql'
})

// Source connection info
const sourceConnectionId = computed(
  () => streamsStore.currentStreamConfig?.source?.connections?.[0]?.connectionId || ''
)
const sourceDatabase = computed(
  () =>
    streamsStore.currentStreamConfig?.sourceDatabase ||
    streamsStore.currentStreamConfig?.source?.connections?.[0]?.database ||
    ''
)

// Load schema context for autocomplete
watch(
  [sourceConnectionId, sourceDatabase],
  async ([connId, db]) => {
    if (connId && db) {
      try {
        await navigationStore.ensureMetadata(connId, db)
        const metadata = navigationStore.getMetadata(connId, db)

        if (metadata) {
          schemaContext.value = {
            tables: Object.keys(metadata.tables).map((name) => ({
              name,
              schema: metadata.tables[name].schema
            })),
            columns: Object.entries(metadata.tables).reduce(
              (acc, [tableName, table]) => {
                acc[tableName] = table.columns.map((col) => ({
                  name: col.name,
                  type: col.dataType,
                  nullable: col.isNullable
                }))
                return acc
              },
              {} as Record<string, Array<{ name: string; type: string; nullable: boolean }>>
            ),
            dialect: connectionDialect.value
          }
        }
      } catch (error) {
        console.error('Failed to load schema metadata:', error)
      }
    }
  },
  { immediate: true }
)

// Methods
const addQuery = () => {
  const newQuery: QuerySource = {
    name: `query_result_${queries.value.length + 1}`,
    query: '',
    validated: false
  }

  const conn = streamsStore.currentStreamConfig?.source?.connections?.[0]
  if (conn) {
    if (!conn.queries) {
      conn.queries = []
    }
    conn.queries.push(newQuery)
    // Switch to the new query tab
    activeTabId.value = `query-${queries.value.length - 1}`
  }
}

const removeQuery = (tabId: string) => {
  const index = parseInt(tabId.replace('query-', ''))
  if (isNaN(index)) return

  const conn = streamsStore.currentStreamConfig?.source?.connections?.[0]
  if (conn?.queries) {
    conn.queries.splice(index, 1)
    delete previewErrors.value[index]
    delete previewData.value[index]

    // If we deleted the active tab, switch to previous or next tab
    if (activeTabId.value === tabId) {
      if (queries.value.length > 0) {
        const newIndex = Math.min(index, queries.value.length - 1)
        activeTabId.value = `query-${newIndex}`
      } else {
        activeTabId.value = ''
      }
    }
  }
}

const validateTableName = (query: QuerySource, index: number) => {
  // Sanitize table name: lowercase, no spaces, alphanumeric + underscore only
  const sanitized = query.name
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '')
  if (sanitized !== query.name) {
    query.name = sanitized || `query_result_${index + 1}`
  }
}

const handleQueryChange = (query: QuerySource) => {
  // When query changes, mark as needing re-run
  query.validated = false
  query.columns = undefined
}

const runPreview = async (query: QuerySource, index: number) => {
  if (!query.query || query.query.trim().length === 0) {
    previewErrors.value[index] = 'Query cannot be empty'
    return
  }

  isRunning.value = index
  delete previewErrors.value[index]
  delete previewData.value[index]

  try {
    let result: { columns: string[]; rows: unknown[][] }

    if (needsFederatedExecution.value && props.sourceConnections.length > 0) {
      // Execute federated query across multiple sources
      const federatedResult = await executeFederatedQuery({
        query: query.query,
        connections: props.sourceConnections
      })
      result = {
        columns: federatedResult.columns || [],
        rows: federatedResult.rows || []
      }
    } else {
      // Execute query against single source
      result = await connections.executeQuery(
        sourceConnectionId.value,
        query.query,
        sourceDatabase.value
      )
    }

    if (result.columns && result.rows) {
      // Transform rows to object format
      const rowObjects = result.rows.slice(0, previewLimit).map((row) => {
        const obj: Record<string, unknown> = {}
        result.columns.forEach((col, idx) => {
          obj[col] = row[idx]
        })
        return obj
      })

      previewData.value[index] = {
        columns: result.columns,
        rows: rowObjects
      }

      // Auto-validate if not already validated
      if (!query.validated) {
        query.validated = true
        query.columns = result.columns.map((col, idx) => ({
          name: col,
          type: typeof result.rows[0]?.[idx] === 'number' ? 'NUMBER' : 'VARCHAR'
        }))
      }
    } else {
      previewData.value[index] = { columns: [], rows: [] }
    }
  } catch (error: unknown) {
    const err = error as Error
    previewErrors.value[index] = err.message || 'Failed to execute query'
    console.error('Preview error:', error)
  } finally {
    isRunning.value = null
  }
}

const formatCellValue = (value: unknown): string => {
  if (value === null) return 'NULL'
  if (value === undefined) return ''
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value)
    } catch {
      return String(value)
    }
  }
  return String(value)
}

const applyTemplate = (event: Event, query: QuerySource) => {
  const select = event.target as HTMLSelectElement
  const template = select.value

  if (!template) return

  const templates: Record<string, string> = {
    cte: `-- CTE with aggregation example
WITH customer_stats AS (
    SELECT 
        customer_id,
        COUNT(*) AS total_orders,
        SUM(amount) AS total_spent,
        AVG(amount) AS avg_order
    FROM orders
    GROUP BY customer_id
)
SELECT 
    c.name,
    c.email,
    cs.total_orders,
    cs.total_spent,
    cs.avg_order
FROM customers c
INNER JOIN customer_stats cs ON c.id = cs.customer_id
WHERE cs.total_orders > 5`,

    join: `-- Multi-table JOIN example
SELECT 
    o.id AS order_id,
    o.order_date,
    c.name AS customer_name,
    c.email,
    p.name AS product_name,
    oi.quantity,
    oi.unit_price,
    (oi.quantity * oi.unit_price) AS line_total
FROM orders o
INNER JOIN customers c ON o.customer_id = c.id
INNER JOIN order_items oi ON o.id = oi.order_id
INNER JOIN products p ON oi.product_id = p.id
WHERE o.order_date >= '2024-01-01'`,

    subquery: `-- Subquery filter example
SELECT 
    p.id,
    p.name,
    p.price,
    p.category
FROM products p
WHERE p.category IN (
    SELECT DISTINCT category 
    FROM products 
    WHERE price > 100
)
AND p.id NOT IN (
    SELECT product_id 
    FROM discontinued_products
)`,

    union: `-- UNION query example
SELECT 
    'active' AS status,
    id,
    name,
    email,
    created_at
FROM active_users
WHERE created_at >= '2024-01-01'

UNION ALL

SELECT 
    'inactive' AS status,
    id,
    name,
    email,
    last_login AS created_at
FROM inactive_users
WHERE last_login < '2024-01-01'`
  }

  if (templates[template]) {
    query.query = templates[template]
    query.validated = false
    query.columns = undefined
  }

  // Reset select
  select.value = ''
}
</script>
