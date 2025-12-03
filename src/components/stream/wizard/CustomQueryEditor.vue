<template>
  <div class="space-y-4">
    <!-- Query List Header -->
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2">
        <CodeBracketIcon class="w-5 h-5 text-teal-600 dark:text-teal-400" />
        <h3 class="text-sm font-semibold text-gray-900 dark:text-gray-100">Custom SQL Queries</h3>
        <span
          v-if="queries.length > 0"
          class="px-2 py-0.5 text-xs bg-teal-100 dark:bg-teal-900/50 text-teal-700 dark:text-teal-300 rounded-full"
        >
          {{ queries.length }}
        </span>
      </div>
      <button
        type="button"
        class="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 dark:bg-teal-700 dark:hover:bg-teal-600 rounded-md transition-colors"
        @click="addQuery"
      >
        <PlusIcon class="w-4 h-4" />
        Add Query
      </button>
    </div>

    <!-- Empty State -->
    <div
      v-if="queries.length === 0"
      class="flex flex-col items-center justify-center py-12 px-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-800/50"
    >
      <DocumentTextIcon class="w-12 h-12 text-gray-400 dark:text-gray-500 mb-3" />
      <h4 class="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">No custom queries</h4>
      <p class="text-sm text-gray-500 dark:text-gray-400 text-center max-w-md mb-4">
        Add complex SQL queries with JOINs, CTEs, and aggregations to create derived datasets on the
        target.
      </p>
      <button
        type="button"
        class="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-900/30 hover:bg-teal-100 dark:hover:bg-teal-900/50 border border-teal-200 dark:border-teal-700 rounded-md transition-colors"
        @click="addQuery"
      >
        <PlusIcon class="w-4 h-4" />
        Add your first query
      </button>
    </div>

    <!-- Query Cards -->
    <div v-else class="space-y-4">
      <div
        v-for="(query, index) in queries"
        :key="query.name + index"
        class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden"
      >
        <!-- Query Header -->
        <div
          class="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-850 border-b border-gray-200 dark:border-gray-700"
        >
          <div class="flex items-center gap-3 flex-1 min-w-0">
            <!-- Expand/Collapse -->
            <button
              type="button"
              class="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              @click="toggleExpanded(index)"
            >
              <ChevronRightIcon
                class="w-4 h-4 transition-transform"
                :class="{ 'rotate-90': expandedQueries.has(index) }"
              />
            </button>

            <!-- Virtual Table Name Input -->
            <div class="flex-1 min-w-0">
              <label class="sr-only">Target table name</label>
              <input
                v-model="query.name"
                type="text"
                placeholder="target_table_name"
                class="w-full px-3 py-1.5 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                @blur="validateTableName(query, index)"
              />
            </div>

            <!-- Validation Status -->
            <div class="flex items-center gap-2">
              <span
                v-if="query.validated"
                class="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/30 rounded"
              >
                <CheckCircleIcon class="w-3.5 h-3.5" />
                Valid
              </span>
              <span
                v-else-if="query.query && query.query.trim().length > 0"
                class="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 rounded"
              >
                <ExclamationCircleIcon class="w-3.5 h-3.5" />
                Unvalidated
              </span>
            </div>
          </div>

          <!-- Actions -->
          <div class="flex items-center gap-1 ml-3">
            <button
              type="button"
              class="p-1.5 text-gray-400 hover:text-teal-600 dark:hover:text-teal-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
              title="Validate query"
              :disabled="isValidating === index"
              @click="validateQuery(query, index)"
            >
              <PlayIcon v-if="isValidating !== index" class="w-4 h-4" />
              <ArrowPathIcon v-else class="w-4 h-4 animate-spin" />
            </button>
            <button
              type="button"
              class="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
              title="Remove query"
              @click="removeQuery(index)"
            >
              <TrashIcon class="w-4 h-4" />
            </button>
          </div>
        </div>

        <!-- Query Editor (Expanded) -->
        <div v-show="expandedQueries.has(index)" class="p-4 space-y-3">
          <!-- Template Selector -->
          <div class="flex items-center gap-2">
            <span class="text-xs text-gray-500 dark:text-gray-400">Template:</span>
            <select
              class="text-xs px-2 py-1 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded text-gray-700 dark:text-gray-300 focus:ring-1 focus:ring-teal-500"
              @change="applyTemplate($event, query)"
            >
              <option value="">Select a template...</option>
              <option value="cte">CTE with aggregation</option>
              <option value="join">Multi-table JOIN</option>
              <option value="subquery">Subquery filter</option>
              <option value="union">UNION query</option>
            </select>
          </div>

          <!-- SQL Editor -->
          <SqlEditor
            v-model="query.query"
            :dialect="connectionDialect"
            :schema-context="schemaContext"
            height="200px"
            placeholder="Enter your SQL query (JOINs, CTEs, aggregations)..."
            @change="markAsUnvalidated(query)"
          />

          <!-- Detected Columns -->
          <div
            v-if="query.columns && query.columns.length > 0"
            class="bg-gray-50 dark:bg-gray-900/50 rounded-md p-3"
          >
            <div class="flex items-center gap-2 mb-2">
              <TableCellsIcon class="w-4 h-4 text-gray-500" />
              <span class="text-xs font-medium text-gray-700 dark:text-gray-300"
                >Detected Columns ({{ query.columns.length }})</span
              >
            </div>
            <div class="flex flex-wrap gap-1.5">
              <span
                v-for="col in query.columns"
                :key="col.name"
                class="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded"
              >
                <span class="text-gray-900 dark:text-gray-100">{{ col.name }}</span>
                <span class="text-gray-400 dark:text-gray-500">{{ col.type }}</span>
              </span>
            </div>
          </div>

          <!-- Validation Error -->
          <div
            v-if="validationErrors[index]"
            class="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md"
          >
            <ExclamationTriangleIcon class="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            <div class="text-sm text-red-700 dark:text-red-300">{{ validationErrors[index] }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import {
  PlusIcon,
  TrashIcon,
  PlayIcon,
  ArrowPathIcon,
  ChevronRightIcon,
  CodeBracketIcon,
  DocumentTextIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  ExclamationTriangleIcon,
  TableCellsIcon
} from '@heroicons/vue/24/outline'
import SqlEditor from '@/components/monaco/SqlEditor.vue'
import { useStreamsStore } from '@/stores/streamConfig'
import { useConnectionsStore } from '@/stores/connections'
import { useExplorerNavigationStore } from '@/stores/explorerNavigation'
import type { QuerySource } from '@/types/streamConfig'
import type { SchemaContext } from '@/composables/useMonacoSqlProviders'
import connections from '@/api/connections'

const streamsStore = useStreamsStore()
const connectionsStore = useConnectionsStore()
const navigationStore = useExplorerNavigationStore()

// Local state
const expandedQueries = ref<Set<number>>(new Set([0])) // First query expanded by default
const isValidating = ref<number | null>(null)
const validationErrors = ref<Record<number, string>>({})
const schemaContext = ref<SchemaContext | undefined>()

// Get queries from store
const queries = computed({
  get: () => streamsStore.currentStreamConfig?.source?.queries || [],
  set: (value: QuerySource[]) => {
    if (streamsStore.currentStreamConfig?.source) {
      streamsStore.currentStreamConfig.source.queries = value
    }
  }
})

// Get connection dialect
const connectionDialect = computed((): 'mysql' | 'pgsql' | 'sql' => {
  const sourceConnectionId = streamsStore.currentStreamConfig?.source?.id
  if (sourceConnectionId) {
    const connection = connectionsStore.connectionByID(sourceConnectionId)
    const type = connection?.type?.toLowerCase() || 'sql'
    if (type === 'mysql' || type === 'pgsql' || type === 'postgresql') {
      return type === 'postgresql' ? 'pgsql' : (type as 'mysql' | 'pgsql')
    }
  }
  return 'sql'
})

// Source connection info
const sourceConnectionId = computed(() => streamsStore.currentStreamConfig?.source?.id || '')
const sourceDatabase = computed(
  () =>
    streamsStore.currentStreamConfig?.sourceDatabase ||
    streamsStore.currentStreamConfig?.source?.database ||
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

  if (streamsStore.currentStreamConfig?.source) {
    if (!streamsStore.currentStreamConfig.source.queries) {
      streamsStore.currentStreamConfig.source.queries = []
    }
    streamsStore.currentStreamConfig.source.queries.push(newQuery)
    // Expand the new query
    expandedQueries.value.add(queries.value.length - 1)
  }
}

const removeQuery = (index: number) => {
  if (streamsStore.currentStreamConfig?.source?.queries) {
    streamsStore.currentStreamConfig.source.queries.splice(index, 1)
    expandedQueries.value.delete(index)
    delete validationErrors.value[index]
  }
}

const toggleExpanded = (index: number) => {
  if (expandedQueries.value.has(index)) {
    expandedQueries.value.delete(index)
  } else {
    expandedQueries.value.add(index)
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

const markAsUnvalidated = (query: QuerySource) => {
  query.validated = false
  query.columns = undefined
}

const validateQuery = async (query: QuerySource, index: number) => {
  if (!query.query || query.query.trim().length === 0) {
    validationErrors.value[index] = 'Query cannot be empty'
    return
  }

  // Check for forbidden statements
  const forbiddenPatterns = [
    /^\s*INSERT\s/i,
    /^\s*UPDATE\s/i,
    /^\s*DELETE\s/i,
    /^\s*DROP\s/i,
    /^\s*CREATE\s/i,
    /^\s*ALTER\s/i,
    /^\s*TRUNCATE\s/i,
    /^\s*GRANT\s/i,
    /^\s*REVOKE\s/i
  ]

  for (const pattern of forbiddenPatterns) {
    if (pattern.test(query.query)) {
      validationErrors.value[index] =
        'Only SELECT queries are allowed. DDL/DML statements (INSERT, UPDATE, DELETE, DROP, CREATE, ALTER) are not permitted.'
      return
    }
  }

  isValidating.value = index
  delete validationErrors.value[index]

  try {
    // Use discoverQueryColumns API to get column names and types
    const result = await connections.discoverQueryColumns(
      sourceConnectionId.value,
      sourceDatabase.value,
      query.query
    )

    if (result.columns && result.columns.length > 0) {
      query.validated = true
      // Store discovered columns with types for display
      query.columns = result.columns.map((col) => ({
        name: col.name,
        type: col.type
      }))
    } else {
      validationErrors.value[index] = 'Query must return columns'
    }
  } catch (error: unknown) {
    console.error('Validation error:', error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    validationErrors.value[index] = `Validation failed: ${errorMessage}`
    query.validated = false
  } finally {
    isValidating.value = null
  }
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
