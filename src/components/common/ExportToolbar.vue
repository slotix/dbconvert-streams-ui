<template>
  <div class="flex items-center gap-1.5">
    <!-- Primary: CSV -->
    <button
      class="inline-flex items-center px-2 py-1 border border-gray-300 dark:border-gray-600 text-xs rounded text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
      :disabled="disabled"
      title="Export current page as CSV"
      @click="handleExport('csv')"
    >
      <Download class="h-3.5 w-3.5 mr-1" />
      CSV
    </button>

    <!-- Primary: JSON -->
    <button
      class="inline-flex items-center px-2 py-1 border border-gray-300 dark:border-gray-600 text-xs rounded text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
      :disabled="disabled"
      title="Export current page as JSON"
      @click="handleExport('json')"
    >
      <Download class="h-3.5 w-3.5 mr-1" />
      JSON
    </button>

    <!-- Primary: Excel -->
    <button
      class="inline-flex items-center px-2 py-1 border border-gray-300 dark:border-gray-600 text-xs rounded text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
      :disabled="disabled"
      title="Export current page as Excel"
      @click="handleExport('excel')"
    >
      <Download class="h-3.5 w-3.5 mr-1" />
      Excel
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
          v-for="format in secondaryFormats"
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
            <svg
              v-else
              class="animate-spin h-3.5 w-3.5 text-teal-500"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                class="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                stroke-width="4"
              ></circle>
              <path
                class="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            {{ format.label }}
          </button>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { CloudUpload, Download, MoreHorizontal } from 'lucide-vue-next'
import { secondaryExportFormats, type ExportFormat } from '@/composables/useDataExport'
import type { StreamExportFormat } from '@/composables/useStreamExport'

const props = defineProps<{
  /** Whether export buttons are disabled (e.g., no data) */
  disabled?: boolean
  /** Whether to show stream export options for full table export */
  showStreamExport?: boolean
  /** Whether a stream export is in progress */
  isExporting?: boolean
}>()

const emit = defineEmits<{
  export: [format: ExportFormat]
  streamExport: [format: StreamExportFormat]
}>()

const showExportMenu = ref(false)
const secondaryFormats = secondaryExportFormats

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
