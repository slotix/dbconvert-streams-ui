<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { type SQLTableMeta, type SQLViewMeta } from '@/types/metadata'
import connections from '@/api/connections'
import AGGridDataView from './AGGridDataView.vue'

const props = defineProps<{
  tableMeta: SQLTableMeta | SQLViewMeta
  connectionId: string
  database: string
  isView?: boolean
}>()

const approxRows = ref<number | undefined>(undefined)

// Get table name for lookup
const tableName = computed(() => {
  return props.isView
    ? (props.tableMeta as SQLViewMeta).name
    : (props.tableMeta as SQLTableMeta).name
})

// Fetch approximate row count from database overview
async function fetchApproxRows() {
  if (props.isView) {
    approxRows.value = undefined
    return
  }

  try {
    const overview = await connections.getDatabaseOverview(props.connectionId, props.database, {
      refresh: false // Use cached data if available
    })

    // Find this table in allTablesByRows
    const tableInfo = overview.allTablesByRows.find((t) => t.name === tableName.value)
    approxRows.value = tableInfo && tableInfo.approxRows > 0 ? tableInfo.approxRows : undefined
  } catch (e) {
    console.warn('Failed to get approximate row count from overview:', e)
    approxRows.value = undefined
  }
}

// Fetch on mount
onMounted(fetchApproxRows)

// Re-fetch when table changes
watch(tableName, () => {
  approxRows.value = undefined // Reset immediately
  fetchApproxRows()
})
</script>

<template>
  <div
    :class="[
      'bg-white',
      $attrs.class ? $attrs.class : 'shadow-sm ring-1 ring-gray-900/5 rounded-lg'
    ]"
  >
    <div class="p-4">
      <AGGridDataView
        :table-meta="tableMeta"
        :connection-id="connectionId"
        :database="database"
        :is-view="isView"
        :approx-rows="approxRows"
      />
    </div>
  </div>
</template>
