<script setup lang="ts">
import { computed } from 'vue'

type CopyFormat = 'tsv' | 'csv' | 'json'

const props = defineProps<{
  open: boolean
  x: number
  y: number
  hasSelection: boolean
  isEditable?: boolean
  canRevertCell?: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'select-all'): void
  (e: 'deselect-all'): void
  (e: 'copy', format: CopyFormat): void
  (e: 'delete'): void
  (e: 'revert-cell'): void
}>()

const menuStyle = computed(() => ({
  left: `${props.x}px`,
  top: `${props.y}px`
}))

function onBackdropClick() {
  emit('close')
}

function onMenuClick(event: MouseEvent) {
  event.stopPropagation()
}

function selectAllAndClose() {
  emit('select-all')
  emit('close')
}

function deselectAllAndClose() {
  emit('deselect-all')
  emit('close')
}

function copyAndClose(format: CopyFormat) {
  emit('copy', format)
  emit('close')
}

function deleteAndClose() {
  emit('delete')
  emit('close')
}

function revertCellAndClose() {
  emit('revert-cell')
  emit('close')
}
</script>

<template>
  <div v-if="open" class="fixed inset-0 z-50" @click="onBackdropClick">
    <div
      class="fixed min-w-48 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-lg text-sm"
      :style="menuStyle"
      @click="onMenuClick"
    >
      <button
        type="button"
        class="w-full text-left px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-800"
        @click="selectAllAndClose"
      >
        Select all (page)
      </button>
      <button
        type="button"
        class="w-full text-left px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-800"
        @click="deselectAllAndClose"
      >
        Deselect all
      </button>

      <button
        v-if="canRevertCell"
        type="button"
        class="w-full text-left px-3 py-2 text-teal-700 dark:text-teal-300 hover:bg-teal-50 dark:hover:bg-teal-900/20"
        @click="revertCellAndClose"
      >
        Revert cell
      </button>

      <div class="my-1 border-t border-gray-200 dark:border-gray-700"></div>

      <button
        type="button"
        class="w-full text-left px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
        :disabled="!hasSelection"
        @click="copyAndClose('tsv')"
      >
        Copy (TSV)
      </button>
      <button
        type="button"
        class="w-full text-left px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
        :disabled="!hasSelection"
        @click="copyAndClose('csv')"
      >
        Copy (CSV)
      </button>
      <button
        type="button"
        class="w-full text-left px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
        :disabled="!hasSelection"
        @click="copyAndClose('json')"
      >
        Copy (JSON)
      </button>

      <template v-if="isEditable">
        <div class="my-1 border-t border-gray-200 dark:border-gray-700"></div>
        <button
          type="button"
          class="w-full text-left px-3 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50 disabled:cursor-not-allowed"
          :disabled="!hasSelection"
          @click="deleteAndClose"
        >
          Delete selected rows
        </button>
      </template>
    </div>
  </div>
</template>
