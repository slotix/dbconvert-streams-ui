<script setup lang="ts">
import { onMounted, computed, ref } from 'vue'
import { type SQLTableMeta, type SQLViewMeta } from '@/types/metadata'
import { useDatabaseOverviewStore } from '@/stores/databaseOverview'
import AGGridDataView from './AGGridDataView.vue'

const props = defineProps<{
  tableMeta: SQLTableMeta | SQLViewMeta
  connectionId: string
  database: string
  isView?: boolean
  objectKey: string // Unique key for this table/view tab
}>()

const overviewStore = useDatabaseOverviewStore()

// Get table name for lookup
const tableName = computed(() => {
  return props.isView
    ? (props.tableMeta as SQLViewMeta).name
    : (props.tableMeta as SQLTableMeta).name
})

// Get approximate row count from store (reactive)
const approxRows = computed(() => {
  if (props.isView) return -1 // Views have unknown count (-1)
  return overviewStore.getTableRowCount(tableName.value)
})

// Fetch overview data on mount
onMounted(async () => {
  if (!props.isView) {
    try {
      await overviewStore.fetchOverview(props.connectionId, props.database)
    } catch (e) {
      console.warn('Failed to fetch database overview:', e)
    }
  }
})

// Ref to AGGridDataView
const agGridRef = ref<InstanceType<typeof AGGridDataView> | null>(null)

// Expose refresh function to parent
function refresh() {
  agGridRef.value?.refresh()
}

defineExpose({
  refresh
})
</script>

<template>
  <div
    :class="[
      'bg-white dark:bg-gray-850',
      $attrs.class ? $attrs.class : 'shadow-sm ring-1 ring-gray-900/5 dark:ring-gray-700 rounded-lg'
    ]"
  >
    <div class="p-4">
      <AGGridDataView
        ref="agGridRef"
        :table-meta="tableMeta"
        :connection-id="connectionId"
        :database="database"
        :is-view="isView"
        :approx-rows="approxRows"
        :object-key="objectKey"
      />
    </div>
  </div>
</template>
