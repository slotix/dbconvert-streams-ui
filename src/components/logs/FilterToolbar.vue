<script setup lang="ts">
/**
 * FilterToolbar - Reusable, slot-based filter toolbar component
 *
 * Provides a unified, professional filtering interface for both System and SQL logs.
 * Uses slots to allow customization while maintaining consistent styling and layout.
 *
 * Features:
 * - Slot-based architecture for custom filters
 * - Consistent button and dropdown styling
 * - Dividers between filter groups
 * - Mobile-responsive layout
 */

import { ref, onMounted, onBeforeUnmount } from 'vue'
import { CircleHelp, Download, Trash } from 'lucide-vue-next'

const props = defineProps<{
  onClear?: () => void
  onExport?: (format: 'text' | 'csv' | 'json') => void
  showHelp?: boolean
  helpText?: string
}>()

const showExportMenu = ref(false)
const showShortcuts = ref(false)
const exportMenuRef = ref<HTMLDivElement | null>(null)

function handleDocumentClick(event: MouseEvent) {
  const target = event.target as Node | null
  if (
    showExportMenu.value &&
    exportMenuRef.value &&
    target &&
    !exportMenuRef.value.contains(target)
  ) {
    showExportMenu.value = false
  }
}

function toggleExportMenu() {
  showExportMenu.value = !showExportMenu.value
}

function selectExportFormat(format: 'text' | 'csv' | 'json') {
  if (props.onExport) {
    props.onExport(format)
  }
  showExportMenu.value = false
}

// Add document click listener
const documentClickHandler = (e: Event) => handleDocumentClick(e as MouseEvent)

onMounted(() => {
  document.addEventListener('click', documentClickHandler)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', documentClickHandler)
})
</script>

<template>
  <div
    class="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-850 border-b border-gray-200 dark:border-gray-700 shadow-sm flex-wrap"
  >
    <!-- Left Filter Group (via slot) -->
    <div class="flex items-center gap-2">
      <slot name="filters" />
    </div>

    <!-- Divider -->
    <div class="hidden sm:block h-6 border-l border-gray-200" />

    <!-- Center Controls (via slot) -->
    <div class="flex items-center gap-2">
      <slot name="controls" />
    </div>

    <!-- Divider -->
    <div class="hidden sm:block h-6 border-l border-gray-200" />

    <!-- Search and Toggle Group (via slot) -->
    <div class="flex items-center gap-2 flex-1 min-w-0">
      <slot name="search" />
    </div>

    <!-- Divider -->
    <div class="hidden sm:block h-6 border-l border-gray-200" />

    <!-- Right Action Group -->
    <div class="flex items-center gap-2">
      <!-- Export Button (if enabled) -->
      <div v-if="onExport" ref="exportMenuRef" class="relative">
        <button
          title="Export logs"
          class="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-gray-600 rounded hover:bg-gray-500 transition-colors shadow-sm"
          @click.stop="toggleExportMenu"
        >
          <Download class="w-3.5 h-3.5" />
          <span>Export</span>
        </button>

        <div
          v-if="showExportMenu"
          class="absolute right-0 mt-2 w-36 bg-white border border-gray-200 rounded shadow-lg z-50"
        >
          <button
            class="w-full text-left px-3 py-2 text-xs hover:bg-gray-100 transition-colors"
            @click="selectExportFormat('text')"
          >
            Export as Text
          </button>
          <button
            class="w-full text-left px-3 py-2 text-xs hover:bg-gray-100 transition-colors"
            @click="selectExportFormat('csv')"
          >
            Export as CSV
          </button>
          <button
            class="w-full text-left px-3 py-2 text-xs hover:bg-gray-100 transition-colors"
            @click="selectExportFormat('json')"
          >
            Export as JSON
          </button>
        </div>
      </div>

      <!-- Clear Button -->
      <button
        v-if="onClear"
        title="Clear logs (K)"
        class="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-orange-600 rounded hover:bg-orange-700 transition-colors shadow-sm"
        @click="onClear"
      >
        <Trash class="w-3.5 h-3.5" />
        <span>Clear</span>
      </button>

      <!-- Help Button -->
      <div v-if="showHelp" class="relative">
        <button
          class="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
          title="Keyboard shortcuts"
          @click="showShortcuts = !showShortcuts"
        >
          <CircleHelp class="w-5 h-5" />
        </button>

        <!-- Help Tooltip -->
        <div
          v-if="showShortcuts"
          class="absolute right-0 top-full mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg p-4 z-50 text-xs"
        >
          <slot name="help-content">
            <div class="font-semibold text-gray-700 mb-3">Keyboard Shortcuts</div>
            <div class="text-gray-600">{{ helpText || 'No shortcuts available' }}</div>
          </slot>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Smooth transitions for dropdowns */
.transition-all {
  transition: all 0.2s ease;
}
</style>
