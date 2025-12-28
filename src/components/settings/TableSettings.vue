<template>
  <div v-if="table && isConvertMode">
    <QueryBuilder
      :table-name="table.name"
      :dialect="connectionDialect"
      :columns="tableColumns"
      :schema-context="schemaContext"
      :connection-id="sourceConnectionId"
      :database="sourceDatabase"
      :schema="tableSchema"
      :initial-filter-state="table.filter"
      height="120px"
      @update:filter-state="onFilterStateUpdate"
    />
  </div>
</template>

<script setup lang="ts">
import { watch, onMounted, computed, ref } from 'vue'
import { useStreamsStore } from '@/stores/streamConfig'
import { useConnectionsStore } from '@/stores/connections'
import { useExplorerNavigationStore } from '@/stores/explorerNavigation'
import { QueryBuilder } from '@/components/query'
import type { ColumnInfo } from '@/components/query'
import { type StreamConfig, type Table, type TableFilterState } from '@/types/streamConfig'
import type { SchemaContext } from '@/composables/useMonacoSqlProviders'
import {
  getConnectionForTable,
  isFederatedMode,
  stripAliasPrefix,
  extractSchema
} from '@/utils/federatedUtils'
import { getSqlDialectFromConnection } from '@/types/specs'

interface Props {
  table: Table
}

const props = defineProps<Props>()

const streamsStore = useStreamsStore()
const connectionsStore = useConnectionsStore()
const navigationStore = useExplorerNavigationStore()
const currentStreamConfig = streamsStore.currentStreamConfig as StreamConfig | null

const isConvertMode = computed(() => currentStreamConfig?.mode === 'convert' || false)

// Schema context for advanced SQL autocomplete
const schemaContext = ref<SchemaContext | undefined>()

// Find the connection that owns this table based on alias prefix
const connections = computed(() => currentStreamConfig?.source?.connections || [])
const tableConnection = computed(() =>
  getConnectionForTable(props.table?.name || '', connections.value)
)

// Get connection dialect for SQL syntax highlighting
const connectionDialect = computed((): 'mysql' | 'pgsql' | 'sql' => {
  const sourceConnectionId = tableConnection.value?.connectionId
  if (sourceConnectionId) {
    const connection = connectionsStore.connectionByID(sourceConnectionId)
    return getSqlDialectFromConnection(connection?.spec, connection?.type)
  }
  return 'sql'
})

// Get columns for the current table from schema context
const tableColumns = computed((): ColumnInfo[] => {
  if (!schemaContext.value || !props.table) return []

  const isFederated = isFederatedMode(connections.value)
  // Strip alias prefix in federated mode (e.g., "src2.public.actor" -> "public.actor")
  const fullName = stripAliasPrefix(props.table.name, isFederated)

  // For PostgreSQL, table name might be "schema.table" format
  // Try both the full name and just the table name part
  const shortName = fullName.includes('.') ? fullName.split('.').pop() || fullName : fullName

  // Try full name first (for consistency), then fall back to short name
  const columns = schemaContext.value.columns[fullName] || schemaContext.value.columns[shortName]
  return columns || []
})

// Get source connection info for preview (uses the connection that owns this table)
const sourceConnectionId = computed(() => tableConnection.value?.connectionId || '')
const sourceDatabase = computed(
  () => tableConnection.value?.database || currentStreamConfig?.sourceDatabase || ''
)

// Extract schema from table name (for PostgreSQL: schema.table format)
// In federated mode, table name is "alias.schema.table" (e.g., "src2.public.actor")
const tableSchema = computed(() => {
  const isFederated = isFederatedMode(connections.value)
  return extractSchema(props.table?.name || '', isFederated)
})

// Handle filter state updates from QueryBuilder
const onFilterStateUpdate = (filterState: TableFilterState) => {
  if (props.table) {
    props.table.filter = filterState
    updateStreamSettings()
  }
}

onMounted(async () => {
  // Fetch schema metadata for intelligent SQL autocomplete
  // Use the connection that owns this table (important for federated mode)
  const conn = tableConnection.value
  const connectionId = conn?.connectionId
  const database = conn?.database || currentStreamConfig?.sourceDatabase || ''

  if (connectionId && database) {
    try {
      await navigationStore.ensureMetadata(connectionId, database)
      const metadata = navigationStore.getMetadata(connectionId, database)

      if (metadata) {
        // Build columns map with both short name and full schema.table name as keys
        const columnsMap: Record<
          string,
          Array<{ name: string; type: string; nullable: boolean }>
        > = {}

        Object.entries(metadata.tables).forEach(([tableName, table]) => {
          const cols = table.columns.map((col) => ({
            name: col.name,
            type: col.dataType,
            nullable: col.isNullable
          }))

          // Store under the original key (usually just table name)
          columnsMap[tableName] = cols

          // Also store under full schema.table format for PostgreSQL
          if (table.schema) {
            const fullName = `${table.schema}.${table.name}`
            columnsMap[fullName] = cols
          }
        })

        schemaContext.value = {
          tables: Object.keys(metadata.tables).map((name) => ({
            name,
            schema: metadata.tables[name].schema
          })),
          columns: columnsMap,
          dialect: connectionDialect.value as 'mysql' | 'pgsql' | 'sql'
        }
        // console.log('Schema context loaded:', {
        //   tables: schemaContext.value.tables.length,
        //   dialect: schemaContext.value.dialect
        // })
      }
    } catch (error) {
      console.error('Failed to load schema metadata for SQL autocomplete:', error)
      // Schema context will remain undefined, editor will fall back to keywords-only mode
    }
  }

  // Watch for table changes
  if (props.table) {
    watch(
      () => props.table,
      (newTable) => {
        // Find the connection that owns this table
        const conn = tableConnection.value
        if (conn?.tables) {
          const tableIndex = conn.tables.findIndex((t) => t.name === newTable.name)
          if (tableIndex !== -1) {
            conn.tables[tableIndex] = { ...newTable }
          }
        }
      },
      { deep: true }
    )
  }
})

const updateStreamSettings = () => {
  if (streamsStore.currentStreamConfig) {
    const stream = streamsStore.currentStreamConfig
    // Find the connection that owns this table
    const conn = tableConnection.value
    if (conn?.tables) {
      const tableIndex = conn.tables.findIndex((t) => t.name === props.table.name)
      if (tableIndex !== -1) {
        conn.tables[tableIndex] = { ...props.table }
        streamsStore.currentStreamConfig = { ...stream }
      }
    }
  }
}
</script>
