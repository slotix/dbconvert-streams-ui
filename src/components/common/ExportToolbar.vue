<template>
  <div class="flex items-center gap-1.5">
    <!-- Primary: CSV -->
    <button
      class="inline-flex items-center px-2 py-1 border border-gray-300 dark:border-gray-600 text-xs rounded text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
      :disabled="disabled"
      title="Export as CSV"
      @click="handleExport('csv')"
    >
      <ArrowDownTrayIcon class="h-3.5 w-3.5 mr-1" />
      CSV
    </button>

    <!-- Primary: JSON -->
    <button
      class="inline-flex items-center px-2 py-1 border border-gray-300 dark:border-gray-600 text-xs rounded text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
      :disabled="disabled"
      title="Export as JSON"
      @click="handleExport('json')"
    >
      <ArrowDownTrayIcon class="h-3.5 w-3.5 mr-1" />
      JSON
    </button>

    <!-- Primary: Excel -->
    <button
      class="inline-flex items-center px-2 py-1 border border-gray-300 dark:border-gray-600 text-xs rounded text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
      :disabled="disabled"
      title="Export as Excel"
      @click="handleExport('excel')"
    >
      <ArrowDownTrayIcon class="h-3.5 w-3.5 mr-1" />
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
        <EllipsisHorizontalIcon class="h-3.5 w-3.5" />
      </button>

      <!-- Dropdown Menu -->
      <div
        v-if="showExportMenu"
        class="absolute right-0 mt-1 w-36 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg z-10"
        @mouseleave="showExportMenu = false"
      >
        <button
          v-for="format in secondaryFormats"
          :key="format.id"
          class="w-full px-3 py-1.5 text-left text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 first:rounded-t-md last:rounded-b-md"
          @click="handleExport(format.id)"
        >
          {{ format.label }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { ArrowDownTrayIcon, EllipsisHorizontalIcon } from '@heroicons/vue/24/outline'
import { secondaryExportFormats, type ExportFormat } from '@/composables/useDataExport'

defineProps<{
  /** Whether export buttons are disabled (e.g., no data) */
  disabled?: boolean
}>()

const emit = defineEmits<{
  export: [format: ExportFormat]
}>()

const showExportMenu = ref(false)
const secondaryFormats = secondaryExportFormats

function handleExport(format: ExportFormat) {
  showExportMenu.value = false
  emit('export', format)
}
</script>
