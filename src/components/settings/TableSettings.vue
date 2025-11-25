<template>
  <div v-if="table && isConvertMode">
    <label
      :for="`custom-query-${table.name}`"
      class="block text-sm font-medium leading-6 text-gray-900 dark:text-gray-100 mt-4 mb-2"
      >Custom Query</label
    >
    <div>
      <SqlEditor
        v-model="queryModel"
        :dialect="connectionDialect"
        :schema-context="schemaContext"
        height="120px"
        placeholder="Add conditions, sorting, and limiting as needed..."
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { watch, onMounted, computed, ref } from 'vue'
import { useStreamsStore } from '@/stores/streamConfig'
import { useConnectionsStore } from '@/stores/connections'
import { useExplorerNavigationStore } from '@/stores/explorerNavigation'
import { SqlEditor } from '@/components/monaco'
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
const connectionDialect = computed(() => {
  const sourceConnectionId = currentStreamConfig?.source?.id
  if (sourceConnectionId) {
    const connection = connectionsStore.connectionByID(sourceConnectionId)
    return connection?.type?.toLowerCase() || 'sql'
  }
  return 'sql'
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
        console.log('Schema context loaded:', {
          tables: schemaContext.value.tables.length,
          dialect: schemaContext.value.dialect
        })
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
