<template>
  <div v-if="table && isConvertMode">
    <label
      :for="`custom-query-${table.name}`"
      class="block text-sm font-medium leading-6 text-gray-900 mt-4"
      >Custom Query.</label
    >
    <div>
      <textarea
        :id="`custom-query-${table.name}`"
        v-model="table.query"
        :name="`custom-query-${table.name}`"
        rows="2"
        class="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-gray-600 sm:text-sm sm:leading-6"
        placeholder="Integrate conditions, sorting, and limiting as needed..."
        @input="updateStreamSettings"
      ></textarea>
    </div>
  </div>
</template>

<script setup lang="ts">
import { watch, onMounted, computed } from 'vue'
import { useStreamsStore } from '@/stores/streamConfig'
import { type StreamConfig, type Table } from '@/types/streamConfig'

interface Props {
  table: Table
}

const props = defineProps<Props>()

const streamsStore = useStreamsStore()
const currentStreamConfig = streamsStore.currentStreamConfig as StreamConfig | null

const isConvertMode = computed(() => currentStreamConfig?.mode === 'convert' || false)

onMounted(() => {
  if (props.table) {
    watch(
      () => props.table,
      (newTable) => {
        if (currentStreamConfig && currentStreamConfig.tables) {
          const tableIndex = currentStreamConfig.tables.findIndex((t) => t.name === newTable.name)
          if (tableIndex !== -1) {
            currentStreamConfig.tables[tableIndex] = { ...newTable }
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
    if (stream.tables) {
      const tableIndex = stream.tables.findIndex((t) => t.name === props.table.name)
      if (tableIndex !== -1) {
        stream.tables[tableIndex] = { ...props.table }
        streamsStore.currentStreamConfig = { ...stream }
      }
    }
  }
}
</script>
