<template>
  <div class="flex items-center gap-1.5">
    <!-- Primary buttons (adaptive count) -->
    <button
      v-for="format in visiblePrimaryFormats"
      :key="format.id"
      class="inline-flex items-center px-2 py-1 border border-gray-300 dark:border-gray-600 text-xs rounded text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
      :disabled="disabled"
      :title="`Export current page as ${format.label}`"
      @click="handleExport(format.id)"
    >
      <Download class="h-3.5 w-3.5" :class="{ 'mr-1': !effectiveCompact }" />
      <span v-if="!effectiveCompact">{{ format.label }}</span>
    </button>

    <!-- More Formats Dropdown -->
    <div class="relative">
      <button
        class="inline-flex items-center px-2 py-1 border border-gray-300 dark:border-gray-600 text-xs rounded text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
        :disabled="disabled"
        title="More export formats"
        @click="showExportMenu = !showExportMenu"
      >
        <MoreHorizontal class="h-3.5 w-3.5" />
      </button>

      <!-- Dropdown Menu -->
      <div
        v-if="showExportMenu"
        class="absolute right-0 mt-1 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg z-10"
        @mouseleave="showExportMenu = false"
      >
        <!-- Current Page Export Section -->
        <div
          class="px-3 py-1.5 text-[10px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider border-b border-gray-200 dark:border-gray-700"
        >
          Current Page
        </div>
        <button
          v-for="format in menuFormats"
          :key="format.id"
          class="w-full px-3 py-1.5 text-left text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
          @click="handleExport(format.id)"
        >
          {{ format.label }}
        </button>

        <!-- Stream Export Section (Full Table) -->
        <template v-if="showStreamExport">
          <div
            class="px-3 py-1.5 text-[10px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider border-t border-b border-gray-200 dark:border-gray-700"
          >
            Full Table (via Stream)
          </div>
          <button
            v-for="format in streamExportFormats"
            :key="`stream-${format.id}`"
            class="w-full px-3 py-1.5 text-left text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
            :disabled="isExporting"
            @click="handleStreamExport(format.id)"
          >
            <CloudUpload v-if="!isExporting" class="h-3.5 w-3.5 text-teal-500" />
            <Loader2 v-else class="animate-spin h-3.5 w-3.5 text-teal-500" />
            {{ format.label }}
          </button>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { CloudUpload, Download, Loader2, MoreHorizontal } from 'lucide-vue-next'
import {
  primaryExportFormats,
  secondaryExportFormats,
  type ExportFormat
} from '@/composables/useDataExport'
import type { StreamExportFormat } from '@/composables/useStreamExport'

const props = defineProps<{
  /** Whether export buttons are disabled (e.g., no data) */
  disabled?: boolean
  /** Whether to show stream export options for full table export */
  showStreamExport?: boolean
  /** Whether a stream export is in progress */
  isExporting?: boolean
  /** Use icon-only primary export buttons */
  compact?: boolean
  /** Collapse primary exports and keep only the "more" menu button */
  menuOnly?: boolean
  /** Maximum number of primary export buttons to show (0-3) */
  primaryCount?: number
}>()

const emit = defineEmits<{
  export: [format: ExportFormat]
  streamExport: [format: StreamExportFormat]
}>()

const showExportMenu = ref(false)
const secondaryFormats = secondaryExportFormats
const normalizedPrimaryCount = computed(() => {
  if (props.menuOnly) return 0
  const raw = props.primaryCount ?? primaryExportFormats.length
  return Math.max(0, Math.min(primaryExportFormats.length, raw))
})
const visiblePrimaryFormats = computed(() =>
  primaryExportFormats.slice(0, normalizedPrimaryCount.value)
)
const hiddenPrimaryFormats = computed(() =>
  primaryExportFormats.slice(normalizedPrimaryCount.value)
)
const effectiveCompact = computed(() => Boolean(props.compact || props.menuOnly))
const menuFormats = computed(() =>
  [...hiddenPrimaryFormats.value, ...secondaryFormats].filter(
    (format, index, self) => self.findIndex((item) => item.id === format.id) === index
  )
)

// Stream export formats (server-side processing)
const streamExportFormats: { id: StreamExportFormat; label: string }[] = [
  { id: 'csv', label: 'CSV' },
  { id: 'jsonl', label: 'JSONL' },
  { id: 'parquet', label: 'Parquet' }
]

function handleExport(format: ExportFormat) {
  showExportMenu.value = false
  emit('export', format)
}

function handleStreamExport(format: StreamExportFormat) {
  if (props.isExporting) return
  showExportMenu.value = false
  emit('streamExport', format)
}
</script>
