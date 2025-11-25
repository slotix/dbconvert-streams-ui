<template>
  <div v-if="table && isConvertMode">
    <QueryBuilder
      v-model="queryModel"
      :table-name="table.name"
      :dialect="connectionDialect"
      :columns="tableColumns"
      :schema-context="schemaContext"
      :connection-id="sourceConnectionId"
      :database="sourceDatabase"
      :schema="tableSchema"
      height="120px"
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
import { type StreamConfig, type Table } from '@/types/streamConfig'
import type { SchemaContext } from '@/composables/useMonacoSqlProviders'

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

// Get connection dialect for SQL syntax highlighting
const connectionDialect = computed((): 'mysql' | 'pgsql' | 'sql' => {
  const sourceConnectionId = currentStreamConfig?.source?.id
  if (sourceConnectionId) {
    const connection = connectionsStore.connectionByID(sourceConnectionId)
    const type = connection?.type?.toLowerCase() || 'sql'
    if (type === 'mysql' || type === 'pgsql' || type === 'postgresql') {
      return type === 'postgresql' ? 'pgsql' : (type as 'mysql' | 'pgsql')
    }
  }
  return 'sql'
})

// Get columns for the current table from schema context
const tableColumns = computed((): ColumnInfo[] => {
  if (!schemaContext.value || !props.table) return []
  const columns = schemaContext.value.columns[props.table.name]
  return columns || []
})

// Get source connection info for preview
const sourceConnectionId = computed(() => currentStreamConfig?.source?.id || '')
const sourceDatabase = computed(
  () => currentStreamConfig?.sourceDatabase || currentStreamConfig?.source?.database || ''
)

// Extract schema from table name (for PostgreSQL: schema.table format)
const tableSchema = computed(() => {
  const parts = props.table?.name?.split('.') || []
  return parts.length > 1 ? parts[0] : ''
})

// Two-way binding for query
const queryModel = computed({
  get: () => props.table.query || '',
  set: (value: string) => {
    if (props.table) {
      props.table.query = value
      updateStreamSettings()
    }
  }
})

onMounted(async () => {
  // Fetch schema metadata for intelligent SQL autocomplete
  const connectionId = currentStreamConfig?.source?.id
  const database = currentStreamConfig?.source?.database

  if (connectionId && database) {
    try {
      await navigationStore.ensureMetadata(connectionId, database)
      const metadata = navigationStore.getMetadata(connectionId, database)

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
        if (currentStreamConfig && currentStreamConfig.source?.tables) {
          const tableIndex = currentStreamConfig.source.tables.findIndex(
            (t) => t.name === newTable.name
          )
          if (tableIndex !== -1) {
            currentStreamConfig.source.tables[tableIndex] = { ...newTable }
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
    if (stream.source?.tables) {
      const tableIndex = stream.source.tables.findIndex((t) => t.name === props.table.name)
      if (tableIndex !== -1) {
        stream.source.tables[tableIndex] = { ...props.table }
        streamsStore.currentStreamConfig = { ...stream }
      }
    }
  }
}
</script>
