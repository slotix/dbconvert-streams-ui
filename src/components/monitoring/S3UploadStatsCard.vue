<script setup lang="ts">
import { computed, toRefs } from 'vue'
import { ChevronDown, CloudUpload } from 'lucide-vue-next'
import { useMonitoringStore } from '@/stores/monitoring'
import { STATUS } from '@/constants'
import StatusBadge from '@/components/common/StatusBadge.vue'
import { formatDataSize } from '@/utils/formats'

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
  (e: 'toggle'): void
}>()

const monitoringStore = useMonitoringStore()
const s3UploadStats = computed(() => monitoringStore.s3UploadStats)

const allUploads = computed(() => [
  ...s3UploadStats.value.uploading,
  ...s3UploadStats.value.completed,
  ...s3UploadStats.value.failed
])

const statusCounts = computed(() => {
  const stats = s3UploadStats.value
  return {
    completed: stats.completed.length,
    uploading: stats.uploading.length,
    failed: stats.failed.length,
    total: stats.total
  }
})

const hasAnyUploads = computed(() => statusCounts.value.total > 0)

const aggregateStats = computed(() => s3UploadStats.value.aggregate)
const isExpanded = computed(() => (collapsible.value ? isOpen.value : true))

// Calculate overall progress percentage
const overallProgress = computed(() => {
  const agg = aggregateStats.value
  if (agg.bytesTotal === 0) return 0
  return Math.round((agg.bytesUploaded / agg.bytesTotal) * 100)
})

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

function calculateProgress(bytesUploaded: number, bytesTotal: number): number {
  if (bytesTotal === 0) return 0
  return Math.round((bytesUploaded / bytesTotal) * 100)
}

function getUploadStatus(status: string) {
  if (status === 'UPLOADING' || status === STATUS.RUNNING) {
    return STATUS.RUNNING
  }
  return status
}
</script>

<template>
  <div
    class="bg-white dark:bg-gray-850 rounded-xl shadow-lg dark:shadow-gray-900/30 overflow-hidden border border-amber-200 dark:border-amber-700/50"
  >
    <!-- Header with amber/orange theme for cloud uploads -->
    <div
      class="px-4 py-3 border-b border-amber-200 dark:border-amber-700/50 bg-gray-50 dark:bg-gray-900/40"
    >
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <div
            class="p-2 bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-amber-200 dark:border-amber-700/50"
          >
            <CloudUpload class="h-5 w-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <h3 class="text-base font-semibold text-gray-900 dark:text-gray-100">S3 Upload</h3>
            <p class="text-sm text-gray-600 dark:text-gray-400">
              {{ statusCounts.completed }} uploaded
              <span v-if="statusCounts.uploading > 0">
                · {{ statusCounts.uploading }} in progress
              </span>
              <span v-if="statusCounts.failed > 0"> · {{ statusCounts.failed }} failed </span>
            </p>
          </div>
        </div>
        <div class="flex items-center gap-3">
          <!-- Overall progress indicator -->
          <div v-if="hasAnyUploads" class="text-right">
            <div class="text-lg font-bold text-amber-600 dark:text-amber-400">
              {{ overallProgress }}%
            </div>
            <div class="text-xs text-gray-500 dark:text-gray-400">
              {{ formatDataSize(aggregateStats.bytesUploaded) }} /
              {{ formatDataSize(aggregateStats.bytesTotal) }}
            </div>
          </div>
          <button
            v-if="collapsible"
            type="button"
            class="inline-flex h-8 w-8 items-center justify-center rounded-md border border-amber-200 bg-white text-amber-700 transition-all hover:bg-amber-50 dark:border-amber-700/50 dark:bg-gray-900 dark:text-amber-300 dark:hover:bg-gray-800"
            :aria-expanded="isExpanded"
            aria-label="Toggle upload"
            @click="emit('toggle')"
          >
            <ChevronDown class="h-4 w-4 transition-transform" :class="{ 'rotate-180': isOpen }" />
          </button>
          <span
            class="inline-flex items-center rounded-full px-3 py-1.5 text-sm font-semibold bg-amber-600 text-white dark:bg-amber-500 dark:text-gray-900"
          >
            {{ statusCounts.total }}
          </span>
        </div>
      </div>

      <!-- Overall progress bar -->
      <div v-if="hasAnyUploads" class="mt-3">
        <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <div
            class="h-2 rounded-full transition-all duration-300"
            :class="
              overallProgress === 100
                ? 'bg-emerald-500 dark:bg-emerald-400'
                : 'bg-amber-500 dark:bg-amber-400'
            "
            :style="{ width: `${overallProgress}%` }"
          ></div>
        </div>
        <div class="flex justify-between mt-1 text-xs text-gray-500 dark:text-gray-400">
          <span>{{ aggregateStats.filesUploaded }} / {{ aggregateStats.filesTotal }} files</span>
          <span v-if="aggregateStats.rate > 0">{{ formatDataSize(aggregateStats.rate) }}/s</span>
        </div>
      </div>
    </div>

    <!-- Upload Table -->
    <div v-if="isExpanded && hasAnyUploads" class="p-0">
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
                Files
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
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200 dark:divide-gray-800 bg-white dark:bg-gray-900/20">
            <tr
              v-for="upload in allUploads"
              :key="upload.table"
              class="hover:bg-gray-50 dark:hover:bg-gray-900/40 transition-colors"
            >
              <td class="px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100">
                <span class="truncate block max-w-xs" :title="upload.table">{{
                  upload.table
                }}</span>
              </td>
              <td class="px-4 py-3">
                <StatusBadge :status="getUploadStatus(upload.status)" />
              </td>
              <td
                class="px-4 py-3 text-sm text-right font-semibold text-gray-900 dark:text-gray-100"
              >
                {{ upload.filesUploaded }} / {{ upload.filesTotal }}
              </td>
              <td
                class="px-4 py-3 text-sm text-right font-semibold text-gray-900 dark:text-gray-100"
              >
                {{ formatDataSize(upload.bytesUploaded) }} /
                {{ formatDataSize(upload.bytesTotal) }}
              </td>
              <td class="px-4 py-3">
                <div class="flex items-center gap-2">
                  <div class="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2 w-24">
                    <div
                      class="h-2 rounded-full transition-all duration-300"
                      :class="
                        upload.status === STATUS.FINISHED
                          ? 'bg-emerald-500 dark:bg-emerald-400'
                          : upload.status === STATUS.FAILED
                            ? 'bg-red-500 dark:bg-red-400'
                            : 'bg-amber-500 dark:bg-amber-400'
                      "
                      :style="{
                        width: `${calculateProgress(upload.bytesUploaded, upload.bytesTotal)}%`
                      }"
                    ></div>
                  </div>
                  <span class="text-xs text-gray-600 dark:text-gray-400 w-10 text-right">
                    {{ calculateProgress(upload.bytesUploaded, upload.bytesTotal) }}%
                  </span>
                </div>
              </td>
              <td
                class="px-4 py-3 text-sm text-right font-semibold text-gray-900 dark:text-gray-100"
              >
                <span v-if="upload.rate > 0">{{ formatDataSize(upload.rate) }}/s</span>
                <span v-else class="text-gray-400 dark:text-gray-500">—</span>
              </td>
              <td
                class="px-4 py-3 text-sm text-right font-semibold text-gray-900 dark:text-gray-100"
              >
                {{ formatDuration(upload.elapsed) }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else-if="isExpanded" class="px-6 py-12 text-center bg-gray-50/80 dark:bg-gray-900/40">
      <div class="inline-flex p-4 bg-gray-100 dark:bg-gray-800 rounded-full mb-4">
        <CloudArrowUpIcon class="h-8 w-8 text-amber-400 dark:text-amber-500" />
      </div>
      <h4 class="text-base font-medium text-gray-900 dark:text-gray-100 mb-1">
        Waiting for upload
      </h4>
      <p class="text-sm text-gray-500 dark:text-gray-400">
        S3 upload progress will appear after data transfer completes
      </p>
    </div>
  </div>
</template>

<style scoped></style>
