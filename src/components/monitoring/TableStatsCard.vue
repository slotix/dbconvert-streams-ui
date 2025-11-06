<script setup lang="ts">
import { ref, computed } from 'vue'
import { TableCellsIcon, ChevronDownIcon, ChevronUpIcon } from '@heroicons/vue/24/outline'
import { useMonitoringStore } from '@/stores/monitoring'
import TableStatsList from './TableStatsList.vue'

const emit = defineEmits<{
  (e: 'compare-table', tableName: string): void
}>()

const monitoringStore = useMonitoringStore()
const isExpanded = ref(false)

const tableStatsGroup = computed(() => monitoringStore.tableStats)

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

function toggleExpand() {
  isExpanded.value = !isExpanded.value
}

function handleCompareTable(tableName: string) {
  emit('compare-table', tableName)
}
</script>

<template>
  <div
    class="group bg-white ring-1 ring-slate-200 rounded-xl p-4 hover:shadow-lg hover:ring-slate-300 transition-all duration-200"
  >
    <!-- Header -->
    <div class="flex items-center justify-between mb-3">
      <div class="flex items-center gap-2">
        <div
          class="p-2 bg-purple-50 rounded-lg group-hover:bg-linear-to-br group-hover:from-purple-100 group-hover:to-pink-100 transition-all duration-200"
        >
          <TableCellsIcon class="h-4 w-4 text-purple-600" />
        </div>
        <span class="text-sm font-semibold text-gray-700">Tables ({{ statusCounts.total }})</span>
      </div>
    </div>

    <!-- Content -->
    <div v-if="hasAnyTables" class="space-y-3">
      <!-- Transfer Status Section -->
      <div class="mt-2 text-sm text-gray-700 space-y-2">
        <div class="text-xs uppercase tracking-wide font-semibold text-gray-500 mb-2">
          Transfer Status
        </div>

        <!-- Completed -->
        <div v-if="statusCounts.completed > 0" class="flex justify-between items-center">
          <span class="text-gray-600 flex items-center gap-1.5">
            <span class="inline-block w-2 h-2 rounded-full bg-green-600"></span>
            Completed
          </span>
          <span class="font-semibold text-gray-900">{{ statusCounts.completed }}</span>
        </div>

        <!-- Running -->
        <div v-if="statusCounts.running > 0" class="flex justify-between items-center">
          <span class="text-gray-600 flex items-center gap-1.5">
            <span class="inline-block w-2 h-2 rounded-full bg-blue-600"></span>
            In Progress
          </span>
          <span class="font-semibold text-gray-900">{{ statusCounts.running }}</span>
        </div>

        <!-- Failed -->
        <div v-if="statusCounts.failed > 0" class="flex justify-between items-center">
          <span class="text-gray-600 flex items-center gap-1.5">
            <span class="inline-block w-2 h-2 rounded-full bg-red-600"></span>
            Failed
          </span>
          <span class="font-semibold text-gray-900">{{ statusCounts.failed }}</span>
        </div>

        <!-- All completed message (when no running or failed) -->
        <div
          v-if="
            statusCounts.completed > 0 && statusCounts.running === 0 && statusCounts.failed === 0
          "
          class="flex justify-between items-center"
        >
          <span class="text-gray-600 flex items-center gap-1.5">
            <span class="inline-block w-2 h-2 rounded-full bg-green-600"></span>
            All completed
          </span>
          <span class="font-semibold text-gray-900">{{ statusCounts.completed }}</span>
        </div>
      </div>

      <!-- Expand/Collapse Button -->
      <button
        type="button"
        class="w-full mt-3 inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium shadow-sm border border-gray-200 bg-white text-slate-700 hover:border-blue-300 hover:bg-linear-to-r hover:from-blue-50 hover:to-teal-50 hover:shadow-md transition-all duration-200"
        @click="toggleExpand"
      >
        <span>{{ isExpanded ? 'Hide' : 'View' }} Table Details</span>
        <ChevronDownIcon v-if="!isExpanded" class="h-3.5 w-3.5" />
        <ChevronUpIcon v-else class="h-3.5 w-3.5" />
      </button>
    </div>

    <!-- Empty State -->
    <div v-else class="py-4 text-center">
      <div class="text-sm text-gray-500">No table statistics available yet</div>
      <div class="text-xs text-gray-400 mt-1">Statistics will appear as tables are transferred</div>
    </div>

    <!-- Expanded Table List -->
    <TableStatsList
      v-if="isExpanded && hasAnyTables"
      :tables="tableStatsGroup"
      class="mt-4"
      @compare-table="handleCompareTable"
    />
  </div>
</template>

<style scoped></style>
