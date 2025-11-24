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
        height="120px"
        placeholder="Integrate conditions, sorting, and limiting as needed..."
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { watch, onMounted, computed, ref } from 'vue'
import { useStreamsStore } from '@/stores/streamConfig'
import { useConnectionsStore } from '@/stores/connections'
import { SqlEditor } from '@/components/monaco'
import { type StreamConfig, type Table } from '@/types/streamConfig'

interface Props {
  table: Table
}

const props = defineProps<Props>()

const streamsStore = useStreamsStore()
const connectionsStore = useConnectionsStore()
const currentStreamConfig = streamsStore.currentStreamConfig as StreamConfig | null

const isConvertMode = computed(() => currentStreamConfig?.mode === 'convert' || false)

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

onMounted(() => {
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
