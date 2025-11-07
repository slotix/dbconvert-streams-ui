<script setup lang="ts">
import { ref, computed } from 'vue'
import { TableCellsIcon, ChevronRightIcon } from '@heroicons/vue/24/outline'
import { useMonitoringStore } from '@/stores/monitoring'
import { useRouter } from 'vue-router'
import { formatDataSize } from '@/utils/formats'
import { STAT_STATUS } from '@/constants'

const emit = defineEmits<{
  (e: 'compare-table', tableName: string): void
}>()

const monitoringStore = useMonitoringStore()
const router = useRouter()
const showAll = ref(false)

const tableStatsGroup = computed(() => monitoringStore.tableStats)

// Show max 3 tables by default, all when expanded
const MAX_VISIBLE_TABLES = 3

const allTables = computed(() => {
  // Combine and sort: running first, then completed, then failed
  return [
    ...tableStatsGroup.value.running,
    ...tableStatsGroup.value.completed,
    ...tableStatsGroup.value.failed
  ]
})

const visibleTables = computed(() => {
  return showAll.value ? allTables.value : allTables.value.slice(0, MAX_VISIBLE_TABLES)
})

const hasMore = computed(() => allTables.value.length > MAX_VISIBLE_TABLES)

const statusCounts = computed(() => {
  const group = tableStatsGroup.value
  return {
    completed: group.completed.length,
    running: group.running.length,
    failed: group.failed.length,
    total: group.total
  }
})

const hasAnyTables = computed(() => statusCounts.value.total > 0)

function toggleShowAll() {
  showAll.value = !showAll.value
}

function handleCompareTable(tableName: string) {
  emit('compare-table', tableName)
}

function getStatusClass(status: string) {
  switch (status) {
    case STAT_STATUS.FINISHED:
      return 'bg-green-100 text-green-700'
    case STAT_STATUS.RUNNING:
      return 'bg-blue-100 text-blue-700'
    case STAT_STATUS.FAILED:
      return 'bg-red-100 text-red-700'
    default:
      return 'bg-gray-100 text-gray-700'
  }
}

function getStatusLabel(status: string) {
  switch (status) {
    case STAT_STATUS.FINISHED:
      return 'Completed'
    case STAT_STATUS.RUNNING:
      return 'Running'
    case STAT_STATUS.FAILED:
      return 'Failed'
    default:
      return status
  }
}
</script>

<template>
  <div
    class="bg-white dark:bg-gray-850 rounded-xl shadow-lg dark:shadow-gray-900/30 overflow-hidden"
  >
    <!-- Header -->
    <div
      class="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20"
    >
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <div class="p-2 bg-white rounded-lg shadow-sm">
            <TableCellsIcon class="h-5 w-5 text-purple-600" />
          </div>
          <div>
            <h3 class="text-base font-semibold text-gray-900 dark:text-gray-100">Tables</h3>
            <p class="text-sm text-gray-600 dark:text-gray-400">
              {{ statusCounts.completed }} completed
              <span v-if="statusCounts.running > 0">
                · {{ statusCounts.running }} in progress
              </span>
              <span v-if="statusCounts.failed > 0"> · {{ statusCounts.failed }} failed </span>
            </p>
          </div>
        </div>
        <span
          class="inline-flex items-center rounded-full px-3 py-1.5 text-sm font-semibold bg-purple-600 text-white"
        >
          {{ statusCounts.total }}
        </span>
      </div>
    </div>

    <!-- Tables List -->
    <div v-if="hasAnyTables" class="p-4">
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div
          v-for="table in visibleTables"
          :key="table.table"
          class="bg-gradient-to-br from-gray-50 to-white border border-gray-200 rounded-lg p-4 hover:shadow-md hover:border-purple-300 transition-all duration-200"
        >
          <!-- Table Name and Status -->
          <div class="flex items-start justify-between mb-3">
            <h4 class="font-semibold text-gray-900 truncate flex-1" :title="table.table">
              {{ table.table }}
            </h4>
            <span
              class="ml-2 shrink-0 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
              :class="getStatusClass(table.status)"
            >
              {{ getStatusLabel(table.status) }}
            </span>
          </div>

          <!-- Metrics -->
          <dl class="grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
            <div>
              <dt class="text-gray-500">Rows</dt>
              <dd class="font-semibold text-gray-900">{{ table.events.toLocaleString() }}</dd>
            </div>
            <div>
              <dt class="text-gray-500">Size</dt>
              <dd class="font-semibold text-gray-900">{{ table.size }}</dd>
            </div>
            <div>
              <dt class="text-gray-500">Rate</dt>
              <dd class="font-semibold text-gray-900">{{ table.rate }}</dd>
            </div>
            <div>
              <dt class="text-gray-500">Duration</dt>
              <dd class="font-semibold text-gray-900">{{ (table.elapsed * 1000).toFixed(0) }}ms</dd>
            </div>
          </dl>

          <!-- Compare Button (only for completed tables) -->
          <button
            v-if="table.status === STAT_STATUS.FINISHED"
            type="button"
            class="mt-3 w-full inline-flex items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium bg-white border border-purple-200 text-purple-700 hover:bg-purple-50 hover:border-purple-300 transition-colors"
            @click="handleCompareTable(table.table)"
          >
            Compare
            <ChevronRightIcon class="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <!-- View All Button -->
      <div v-if="hasMore" class="mt-4 text-center">
        <button
          type="button"
          class="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700 shadow-sm hover:shadow transition-all duration-200"
          @click="toggleShowAll"
        >
          {{ showAll ? 'Show Less' : `View All ${allTables.length} Tables` }}
          <ChevronRightIcon class="h-4 w-4" />
        </button>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else class="px-6 py-12 text-center">
      <div class="inline-flex p-4 bg-gray-100 rounded-full mb-4">
        <TableCellsIcon class="h-8 w-8 text-gray-400" />
      </div>
      <h4 class="text-base font-medium text-gray-900 mb-1">No tables yet</h4>
      <p class="text-sm text-gray-500">Table statistics will appear as data is transferred</p>
    </div>
  </div>
</template>

<style scoped></style>
