<script setup lang="ts">
import { computed, ref, watch, nextTick } from 'vue'

// Get current zoom factor for position adjustment
const getZoomFactor = () => {
  const zoomValue = getComputedStyle(document.documentElement).getPropertyValue('--app-zoom')
  return parseFloat(zoomValue) || 1
}

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

const menuEl = ref<HTMLElement | null>(null)
const menuLeft = ref(0)
const menuTop = ref(0)

// When the menu opens, set initial position then clamp to viewport after render
watch(
  () => [props.open, props.x, props.y] as const,
  async ([isOpen, x, y]) => {
    if (!isOpen) return
    const zoom = getZoomFactor()
    menuLeft.value = x / zoom
    menuTop.value = y / zoom

    await nextTick()

    if (!menuEl.value) return
    const rect = menuEl.value.getBoundingClientRect()

    // Clamp in visual pixels (same coordinate space as clientX/Y and getBoundingClientRect)
    let cx = x
    let cy = y
    if (cx + rect.width > window.innerWidth) cx = x - rect.width
    if (cx < 0) cx = 0
    if (cy + rect.height > window.innerHeight) cy = y - rect.height
    if (cy < 0) cy = 0

    menuLeft.value = cx / zoom
    menuTop.value = cy / zoom
  }
)

const menuStyle = computed(() => ({
  left: `${menuLeft.value}px`,
  top: `${menuTop.value}px`
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
      ref="menuEl"
      class="fixed min-w-48 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-850 shadow-lg dark:shadow-gray-900/50 text-sm py-1"
      :style="menuStyle"
      @click="onMenuClick"
    >
      <button
        type="button"
        class="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        @click="selectAllAndClose"
      >
        Select all (page)
      </button>
      <button
        type="button"
        class="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        @click="deselectAllAndClose"
      >
        Deselect all
      </button>

      <button
        v-if="canRevertCell"
        type="button"
        class="w-full text-left px-3 py-2 text-sm text-teal-700 dark:text-teal-300 hover:bg-teal-50 dark:hover:bg-teal-900/20 transition-colors"
        @click="revertCellAndClose"
      >
        Revert cell
      </button>

      <div class="my-1 border-t border-gray-200 dark:border-gray-700"></div>

      <button
        type="button"
        class="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        :disabled="!hasSelection"
        @click="copyAndClose('tsv')"
      >
        Copy (TSV)
      </button>
      <button
        type="button"
        class="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        :disabled="!hasSelection"
        @click="copyAndClose('csv')"
      >
        Copy (CSV)
      </button>
      <button
        type="button"
        class="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        :disabled="!hasSelection"
        @click="copyAndClose('json')"
      >
        Copy (JSON)
      </button>

      <template v-if="isEditable">
        <div class="my-1 border-t border-gray-200 dark:border-gray-700"></div>
        <button
          type="button"
          class="w-full text-left px-3 py-2 text-sm text-red-600 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          :disabled="!hasSelection"
          @click="deleteAndClose"
        >
          Delete selected rows
        </button>
      </template>
    </div>
  </div>
</template>
