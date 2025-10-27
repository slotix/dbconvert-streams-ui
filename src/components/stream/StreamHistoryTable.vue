<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <h3 class="text-base font-semibold text-gray-900">Recent Runs</h3>
      <span v-if="runs.length > 0" class="text-xs text-gray-500">
        Last {{ runs.length }} run{{ runs.length !== 1 ? 's' : '' }}
      </span>
    </div>

    <!-- Empty state -->
    <div
      v-if="runs.length === 0"
      class="text-center py-8 bg-gray-50 rounded-lg border border-gray-200"
    >
      <svg
        class="mx-auto h-12 w-12 text-gray-400"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
        />
      </svg>
      <p class="mt-2 text-sm text-gray-500">No run history available</p>
      <p class="text-xs text-gray-400">Start the stream to see execution history</p>
    </div>

    <!-- History table -->
    <div v-else class="overflow-hidden rounded-lg border border-gray-200">
      <table class="min-w-full divide-y divide-gray-200">
        <thead class="bg-gray-50">
          <tr>
            <th
              scope="col"
              class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              Date & Time
            </th>
            <th
              scope="col"
              class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              Duration
            </th>
            <th
              scope="col"
              class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              Status
            </th>
            <th
              scope="col"
              class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              Data Size
            </th>
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-gray-200">
          <tr v-for="(run, index) in runs" :key="index" class="hover:bg-gray-50">
            <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
              {{ formatDateTime(run.timestamp) }}
            </td>
            <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
              {{ run.duration }}
            </td>
            <td class="px-4 py-3 whitespace-nowrap">
              <span
                :class="[
                  'inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ring-1 ring-inset',
                  getStatusClass(run.status)
                ]"
              >
                <component :is="getStatusIcon(run.status)" class="h-3 w-3" />
                {{ run.status }}
              </span>
            </td>
            <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
              {{ run.dataSize || '—' }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import {
  CheckCircleIcon,
  XCircleIcon,
  StopCircleIcon,
  ArrowPathIcon
} from '@heroicons/vue/24/outline'
import { formatDateTime } from '@/utils/formats'

interface StreamRun {
  timestamp: number
  duration: string
  status: string
  dataSize?: string
}

const props = defineProps<{
  runs: StreamRun[]
}>()

function getStatusClass(status: string): string {
  const statusLower = status.toLowerCase()
  if (statusLower === 'finished') {
    return 'bg-green-50 text-green-700 ring-green-600/20'
  } else if (statusLower === 'failed') {
    return 'bg-red-50 text-red-700 ring-red-600/20'
  } else if (statusLower === 'stopped') {
    return 'bg-gray-50 text-gray-700 ring-gray-600/20'
  } else {
    return 'bg-blue-50 text-blue-700 ring-blue-600/20'
  }
}

function getStatusIcon(status: string) {
  const statusLower = status.toLowerCase()
  if (statusLower === 'finished') {
    return CheckCircleIcon
  } else if (statusLower === 'failed') {
    return XCircleIcon
  } else if (statusLower === 'stopped') {
    return StopCircleIcon
  } else {
    return ArrowPathIcon
  }
}
</script>
