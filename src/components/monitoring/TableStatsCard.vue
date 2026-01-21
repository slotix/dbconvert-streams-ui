<script setup lang="ts">
import { computed, toRefs } from 'vue'
import { ChevronDown, ChevronRight, Sheet } from 'lucide-vue-next'
import { useMonitoringStore } from '@/stores/monitoring'
import { STATUS } from '@/constants'
import StatusBadge from '@/components/common/StatusBadge.vue'
import TableProgressBar from './TableProgressBar.vue'

const props = withDefaults(
  defineProps<{
    isOpen?: boolean
    collapsible?: boolean
  }>(),
  {
    isOpen: true,
    collapsible: false
  }
)
const { isOpen, collapsible } = toRefs(props)

const emit = defineEmits<{
  (e: 'compare-table', tableName: string): void
  (e: 'toggle'): void
}>()

const monitoringStore = useMonitoringStore()
const tableStatsGroup = computed(() => monitoringStore.tableStats)

const isCDCMode = computed(() => monitoringStore.streamConfig?.mode === 'cdc')

const allTables = computed(() => [
  ...tableStatsGroup.value.running,
  ...tableStatsGroup.value.completed,
  ...tableStatsGroup.value.failed,
  ...tableStatsGroup.value.stopped,
  ...tableStatsGroup.value.paused
])

const statusCounts = computed(() => {
  const group = tableStatsGroup.value
  return {
    completed: group.completed.length,
    running: group.running.length,
    failed: group.failed.length,
    stopped: group.stopped.length,
    paused: group.paused.length,
    total: group.total
  }
})

const hasAnyTables = computed(() => statusCounts.value.total > 0)
const isExpanded = computed(() => (collapsible.value ? isOpen.value : true))

function handleCompareTable(tableName: string) {
  emit('compare-table', tableName)
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
      class="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/30"
    >
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <div
            class="p-2 bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700"
          >
            <Sheet class="h-5 w-5 text-gray-600 dark:text-gray-300" />
          </div>
          <div>
            <h3 class="text-base font-semibold text-gray-900 dark:text-gray-100">Tables</h3>
            <p class="text-sm text-gray-600 dark:text-gray-400">
              {{ statusCounts.completed }} finished
              <span v-if="statusCounts.running > 0">
                · {{ statusCounts.running }} in progress
              </span>
              <span v-if="statusCounts.stopped > 0"> · {{ statusCounts.stopped }} stopped </span>
              <span v-if="statusCounts.paused > 0"> · {{ statusCounts.paused }} paused </span>
              <span v-if="statusCounts.failed > 0"> · {{ statusCounts.failed }} failed </span>
            </p>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <button
            v-if="collapsible"
            type="button"
            class="inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-200 bg-white text-gray-600 transition-all hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
            :aria-expanded="isExpanded"
            aria-label="Toggle tables"
            @click="$emit('toggle')"
          >
            <ChevronDown class="h-4 w-4 transition-transform" :class="{ 'rotate-180': isOpen }" />
          </button>
          <span
            class="inline-flex items-center rounded-full px-3 py-1.5 text-sm font-semibold bg-gray-600 text-white dark:bg-gray-500 dark:text-gray-100"
          >
            {{ statusCounts.total }}
          </span>
        </div>
      </div>
    </div>

    <!-- Tables Grid -->
    <div v-if="isExpanded && hasAnyTables" class="p-0">
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
                {{ isCDCMode ? 'Events' : 'Rows' }}
              </th>
              <th
                scope="col"
                class="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider"
              >
                Size
              </th>
              <th
                v-if="!isCDCMode"
                scope="col"
                class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider"
              >
                Progress
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
                <StatusBadge :status="table.status" />
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
              <td v-if="!isCDCMode" class="px-4 py-3">
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
                {{ formatDuration(table.elapsed) }}
              </td>
              <td class="px-4 py-3 text-sm text-right">
                <button
                  v-if="table.status === STATUS.FINISHED"
                  type="button"
                  class="inline-flex items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium bg-white dark:bg-gray-900 border border-teal-200 dark:border-teal-500/50 text-teal-700 dark:text-teal-300 hover:bg-teal-50 dark:hover:bg-gray-800 hover:border-teal-400 dark:hover:border-teal-400 transition-all"
                  @click="handleCompareTable(table.table)"
                >
                  Compare
                  <ChevronRight class="h-3.5 w-3.5" />
                </button>
                <span v-else class="text-xs text-gray-400 dark:text-gray-500">—</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else-if="isExpanded" class="px-6 py-12 text-center bg-gray-50 dark:bg-gray-900/30">
      <div class="inline-flex p-4 bg-gray-100 dark:bg-gray-800 rounded-full mb-4">
        <Sheet class="h-8 w-8 text-gray-400 dark:text-gray-500" />
      </div>
      <h4 class="text-base font-medium text-gray-900 dark:text-gray-100 mb-1">No tables yet</h4>
      <p class="text-sm text-gray-500 dark:text-gray-400">
        Table statistics will appear as data is transferred
      </p>
    </div>
  </div>
</template>

<style scoped></style>
