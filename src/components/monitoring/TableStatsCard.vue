<script setup lang="ts">
import { computed } from 'vue'
import { TableCellsIcon, ChevronRightIcon } from '@heroicons/vue/24/outline'
import { useMonitoringStore } from '@/stores/monitoring'
import { STAT_STATUS } from '@/constants'
import TableProgressBar from './TableProgressBar.vue'

const emit = defineEmits<{
  (e: 'compare-table', tableName: string): void
}>()

const monitoringStore = useMonitoringStore()
const tableStatsGroup = computed(() => monitoringStore.tableStats)

const allTables = computed(() => [
  ...tableStatsGroup.value.running,
  ...tableStatsGroup.value.completed,
  ...tableStatsGroup.value.failed
])

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

function handleCompareTable(tableName: string) {
  emit('compare-table', tableName)
}

function getStatusClass(status: string) {
  switch (status) {
    case STAT_STATUS.FINISHED:
      return 'bg-green-50 text-green-700 ring-green-600/20 dark:bg-green-900/30 dark:text-green-200 dark:ring-green-500/40'
    case STAT_STATUS.RUNNING:
      return 'bg-blue-50 text-blue-700 ring-blue-600/20 dark:bg-blue-900/30 dark:text-blue-200 dark:ring-blue-500/40'
    case STAT_STATUS.FAILED:
      return 'bg-red-50 text-red-700 ring-red-600/20 dark:bg-red-900/30 dark:text-red-200 dark:ring-red-500/40'
    default:
      return 'bg-gray-50 text-gray-700 ring-gray-600/20 dark:bg-gray-900/40 dark:text-gray-300 dark:ring-gray-500/30'
  }
}

function getStatusDotClass(status: string) {
  switch (status) {
    case STAT_STATUS.FINISHED:
      return 'bg-green-500'
    case STAT_STATUS.RUNNING:
      return 'bg-blue-500'
    case STAT_STATUS.FAILED:
      return 'bg-red-500'
    default:
      return 'bg-gray-400'
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

function formatDuration(seconds: number) {
  if (seconds < 1) {
    return `${(seconds * 1000).toFixed(0)}ms`
  }
  if (seconds < 60) {
    return `${seconds.toFixed(2)}s`
  }
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}m ${secs}s`
}
</script>

<template>
  <div
    class="bg-white dark:bg-gray-850 rounded-xl shadow-lg dark:shadow-gray-900/30 overflow-hidden border border-gray-200 dark:border-gray-700"
  >
    <!-- Header -->
    <div
      class="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-teal-50 to-cyan-50 dark:from-teal-900/20 dark:to-cyan-900/20"
    >
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <div
            class="p-2 bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700"
          >
            <TableCellsIcon class="h-5 w-5 text-teal-600 dark:text-teal-300" />
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
          class="inline-flex items-center rounded-full px-3 py-1.5 text-sm font-semibold bg-teal-600 text-white dark:bg-teal-500 dark:text-gray-900"
        >
          {{ statusCounts.total }}
        </span>
      </div>
    </div>

    <!-- Tables Grid -->
    <div v-if="hasAnyTables" class="p-0">
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
          <thead class="bg-gray-50 dark:bg-gray-900/30">
            <tr>
              <th
                scope="col"
                class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider"
              >
                Table
              </th>
              <th
                scope="col"
                class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider"
              >
                Status
              </th>
              <th
                scope="col"
                class="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider"
              >
                Rows
              </th>
              <th
                scope="col"
                class="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider"
              >
                Size
              </th>
              <th
                scope="col"
                class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider"
              >
                Progress
              </th>
              <th
                scope="col"
                class="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider"
              >
                Rate
              </th>
              <th
                scope="col"
                class="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider"
              >
                Duration
              </th>
              <th
                scope="col"
                class="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider"
              >
                Actions
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200 dark:divide-gray-800 bg-white dark:bg-gray-900/20">
            <tr
              v-for="table in allTables"
              :key="table.table"
              class="hover:bg-gray-50 dark:hover:bg-gray-900/40 transition-colors"
            >
              <td class="px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100">
                <span class="truncate block max-w-xs" :title="table.table">{{ table.table }}</span>
              </td>
              <td class="px-4 py-3">
                <span
                  class="inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-medium ring-1 ring-inset"
                  :class="getStatusClass(table.status)"
                >
                  <span class="h-1.5 w-1.5 rounded-full" :class="getStatusDotClass(table.status)" />
                  {{ getStatusLabel(table.status) }}
                </span>
              </td>
              <td
                class="px-4 py-3 text-sm text-right font-semibold text-gray-900 dark:text-gray-100"
              >
                {{ table.events.toLocaleString() }}
              </td>
              <td
                class="px-4 py-3 text-sm text-right font-semibold text-gray-900 dark:text-gray-100"
              >
                {{ table.size }}
              </td>
              <td class="px-4 py-3">
                <TableProgressBar
                  v-if="table.estimatedSizeBytes && table.estimatedSizeBytes > 0"
                  :transferred="table.sizeBytes"
                  :estimated="table.estimatedSizeBytes"
                  :status="table.status"
                />
                <span v-else class="text-xs text-gray-400 dark:text-gray-500">—</span>
              </td>
              <td
                class="px-4 py-3 text-sm text-right font-semibold text-gray-900 dark:text-gray-100"
              >
                {{ table.rate }}
              </td>
              <td
                class="px-4 py-3 text-sm text-right font-semibold text-gray-900 dark:text-gray-100"
              >
                {{ formatDuration(table.elapsed) }}
              </td>
              <td class="px-4 py-3 text-sm text-right">
                <button
                  v-if="table.status === STAT_STATUS.FINISHED"
                  type="button"
                  class="inline-flex items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium bg-white dark:bg-gray-900 border border-teal-200 dark:border-teal-500/50 text-teal-700 dark:text-teal-300 hover:bg-teal-50 dark:hover:bg-gray-800 hover:border-teal-400 dark:hover:border-teal-400 transition-all"
                  @click="handleCompareTable(table.table)"
                >
                  Compare
                  <ChevronRightIcon class="h-3.5 w-3.5" />
                </button>
                <span v-else class="text-xs text-gray-400 dark:text-gray-500">—</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else class="px-6 py-12 text-center bg-gray-50 dark:bg-gray-900/30">
      <div class="inline-flex p-4 bg-gray-100 dark:bg-gray-800 rounded-full mb-4">
        <TableCellsIcon class="h-8 w-8 text-gray-400 dark:text-gray-500" />
      </div>
      <h4 class="text-base font-medium text-gray-900 dark:text-gray-100 mb-1">No tables yet</h4>
      <p class="text-sm text-gray-500 dark:text-gray-400">
        Table statistics will appear as data is transferred
      </p>
    </div>
  </div>
</template>

<style scoped></style>
