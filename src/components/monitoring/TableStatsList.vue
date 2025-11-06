<script setup lang="ts">
import { computed } from 'vue'
import type { TableStatsGroup } from '@/types/tableStats'
import { STAT_STATUS, type StatStatus } from '@/constants'
import { formatDataSize } from '@/utils/formats'
import { ArrowTopRightOnSquareIcon } from '@heroicons/vue/24/outline'

const props = defineProps<{
  tables: TableStatsGroup
}>()

const emit = defineEmits<{
  (e: 'compare-table', tableName: string): void
}>()

// Combine all tables and sort by status (running, then completed, then failed)
const allTables = computed(() => {
  const statusOrder: Record<StatStatus, number> = {
    [STAT_STATUS.RUNNING]: 1,
    [STAT_STATUS.FINISHED]: 2,
    [STAT_STATUS.FAILED]: 3
  }
  return [...props.tables.running, ...props.tables.completed, ...props.tables.failed].sort(
    (a, b) => statusOrder[a.status] - statusOrder[b.status]
  )
})

function getStatusBadgeClass(status: StatStatus) {
  switch (status) {
    case STAT_STATUS.FINISHED:
      return 'bg-green-50 text-green-700 ring-green-600/20'
    case STAT_STATUS.RUNNING:
      return 'bg-blue-50 text-blue-700 ring-blue-600/20'
    case STAT_STATUS.FAILED:
      return 'bg-red-50 text-red-700 ring-red-600/20'
    default:
      return 'bg-gray-50 text-gray-700 ring-gray-600/20'
  }
}

function getStatusDotClass(status: StatStatus) {
  switch (status) {
    case STAT_STATUS.FINISHED:
      return 'bg-green-600'
    case STAT_STATUS.RUNNING:
      return 'bg-blue-600'
    case STAT_STATUS.FAILED:
      return 'bg-red-600'
    default:
      return 'bg-gray-600'
  }
}

function getStatusLabel(status: StatStatus) {
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

function formatDuration(seconds: number): string {
  if (seconds < 1) {
    return `${(seconds * 1000).toFixed(0)}ms`
  } else if (seconds < 60) {
    return `${seconds.toFixed(2)}s`
  } else {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}m ${secs}s`
  }
}

function handleCompare(tableName: string) {
  emit('compare-table', tableName)
}
</script>

<template>
  <div class="border-t border-gray-100 pt-4">
    <div class="text-xs uppercase tracking-wide font-semibold text-gray-500 mb-3">
      Table Details
    </div>
    <div class="space-y-2">
      <div
        v-for="table in allTables"
        :key="table.table"
        class="group/item bg-white ring-1 ring-slate-200 rounded-lg p-3 hover:shadow-md hover:ring-slate-300 transition-all duration-150"
      >
        <!-- Table Name and Status -->
        <div class="flex items-start justify-between mb-2">
          <div class="flex-1 min-w-0">
            <div class="font-medium text-gray-900 truncate" :title="table.table">
              {{ table.table }}
            </div>
          </div>
          <span
            class="ml-2 shrink-0 inline-flex items-center text-xs px-2 py-1 rounded-md font-medium ring-1 ring-inset shadow-sm"
            :class="getStatusBadgeClass(table.status)"
          >
            <span
              class="mr-1.5 h-1.5 w-1.5 rounded-full"
              :class="getStatusDotClass(table.status)"
            ></span>
            {{ getStatusLabel(table.status) }}
          </span>
        </div>

        <!-- Metrics Grid -->
        <div class="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
          <div class="flex justify-between">
            <span class="text-gray-500">Rows:</span>
            <span class="font-medium text-gray-900">{{ table.events.toLocaleString() }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-500">Size:</span>
            <span class="font-medium text-gray-900">{{ table.size }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-500">Rate:</span>
            <span class="font-medium text-gray-900">{{ table.rate }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-500">Duration:</span>
            <span class="font-medium text-gray-900">{{ formatDuration(table.elapsed) }}</span>
          </div>
        </div>

        <!-- Compare Button (only show for completed tables) -->
        <button
          v-if="table.status === STAT_STATUS.FINISHED"
          type="button"
          class="mt-3 w-full inline-flex items-center justify-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium border border-gray-200 bg-white text-blue-600 hover:border-blue-300 hover:bg-blue-50 transition-all duration-150"
          @click="handleCompare(table.table)"
        >
          <ArrowTopRightOnSquareIcon class="h-3.5 w-3.5" />
          Compare
        </button>
      </div>

      <!-- Empty State (shouldn't normally show since parent checks hasAnyTables) -->
      <div v-if="allTables.length === 0" class="text-center py-4">
        <div class="text-sm text-gray-500">No tables found</div>
      </div>
    </div>
  </div>
</template>

<style scoped></style>
