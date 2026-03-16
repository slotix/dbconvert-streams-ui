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
  canEditCell?: boolean
  canOpenChangesPanel?: boolean
  canRevertCell?: boolean
  hasUnsavedChanges?: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'select-all'): void
  (e: 'deselect-all'): void
  (e: 'copy', format: CopyFormat): void
  (e: 'edit-cell'): void
  (e: 'open-changes-panel'): void
  (e: 'add-row'): void
  (e: 'delete'): void
  (e: 'revert-cell'): void
  (e: 'save'): void
  (e: 'cancel'): void
}>()

const isMac = navigator.platform.toUpperCase().includes('MAC')
const metaKey = isMac ? '\u2318' : 'Ctrl+'

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

function editCellAndClose() {
  emit('edit-cell')
  emit('close')
}

function openChangesPanelAndClose() {
  emit('open-changes-panel')
  emit('close')
}

function deleteAndClose() {
  emit('delete')
  emit('close')
}

function addRowAndClose() {
  emit('add-row')
  emit('close')
}

function revertCellAndClose() {
  emit('revert-cell')
  emit('close')
}

function saveAndClose() {
  emit('save')
  emit('close')
}

function cancelAndClose() {
  emit('cancel')
  emit('close')
}
</script>

<template>
  <div v-if="open" class="fixed inset-0 z-50" @click="onBackdropClick">
    <div
      ref="menuEl"
      class="ui-surface-floating fixed min-w-48 rounded-md border text-sm py-1"
      :style="menuStyle"
      @click="onMenuClick"
    >
      <!-- Selection -->
      <button
        type="button"
        class="w-full px-3 py-2 text-left text-sm text-gray-700 transition-colors hover:bg-(--ui-surface-muted) dark:text-gray-300 flex items-center justify-between"
        @click="selectAllAndClose"
      >
        <span>Select all (page)</span>
        <span class="ml-4 text-xs text-gray-400 dark:text-gray-500">{{ metaKey }}A</span>
      </button>
      <button
        type="button"
        class="w-full px-3 py-2 text-left text-sm text-gray-700 transition-colors hover:bg-(--ui-surface-muted) dark:text-gray-300 flex items-center justify-between"
        @click="deselectAllAndClose"
      >
        <span>Deselect all</span>
        <span class="ml-4 text-xs text-gray-400 dark:text-gray-500">Esc</span>
      </button>

      <div class="ui-border-default my-1 border-t"></div>

      <!-- Clipboard -->
      <button
        type="button"
        class="w-full px-3 py-2 text-left text-sm text-gray-700 transition-colors hover:bg-(--ui-surface-muted) disabled:cursor-not-allowed disabled:opacity-50 dark:text-gray-300 flex items-center justify-between"
        :disabled="!hasSelection"
        @click="copyAndClose('tsv')"
      >
        <span>Copy (TSV)</span>
        <span class="ml-4 text-xs text-gray-400 dark:text-gray-500">{{ metaKey }}C</span>
      </button>
      <button
        type="button"
        class="w-full px-3 py-2 text-left text-sm text-gray-700 transition-colors hover:bg-(--ui-surface-muted) disabled:cursor-not-allowed disabled:opacity-50 dark:text-gray-300"
        :disabled="!hasSelection"
        @click="copyAndClose('csv')"
      >
        Copy (CSV)
      </button>
      <button
        type="button"
        class="w-full px-3 py-2 text-left text-sm text-gray-700 transition-colors hover:bg-(--ui-surface-muted) disabled:cursor-not-allowed disabled:opacity-50 dark:text-gray-300"
        :disabled="!hasSelection"
        @click="copyAndClose('json')"
      >
        Copy (JSON)
      </button>

      <template v-if="isEditable">
        <div class="ui-border-default my-1 border-t"></div>

        <!-- Edit actions -->
        <button
          type="button"
          class="ui-accent-action ui-accent-text w-full text-left px-3 py-2 text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-between"
          :disabled="!canEditCell"
          @click="editCellAndClose"
        >
          <span>Edit cell</span>
          <span class="ml-4 text-xs opacity-60">Enter</span>
        </button>
        <button
          v-if="canRevertCell"
          type="button"
          class="ui-accent-action ui-accent-text w-full px-3 py-2 text-left text-sm transition-colors flex items-center justify-between"
          @click="revertCellAndClose"
        >
          <span>Revert cell</span>
          <span class="ml-4 text-xs opacity-60">{{ metaKey }}Z</span>
        </button>
        <button
          type="button"
          class="ui-accent-action ui-accent-text w-full text-left px-3 py-2 text-sm transition-colors flex items-center justify-between"
          @click="addRowAndClose"
        >
          <span>Add row</span>
          <span class="ml-4 text-xs opacity-60">{{ metaKey }}I</span>
        </button>
        <button
          type="button"
          class="w-full text-left px-3 py-2 text-sm text-red-600 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-between"
          :disabled="!hasSelection"
          @click="deleteAndClose"
        >
          <span>Delete selected rows</span>
          <span class="ml-4 text-xs opacity-60">Del</span>
        </button>

        <!-- Changes -->
        <template v-if="hasUnsavedChanges">
          <div class="ui-border-default my-1 border-t"></div>
          <button
            type="button"
            class="ui-accent-action ui-accent-text w-full text-left px-3 py-2 text-sm transition-colors flex items-center justify-between"
            @click="saveAndClose"
          >
            <span>Save changes</span>
            <span class="ml-4 text-xs opacity-60">{{ metaKey }}S</span>
          </button>
          <button
            type="button"
            class="w-full text-left px-3 py-2 text-sm text-gray-700 transition-colors hover:bg-(--ui-surface-muted) dark:text-gray-300"
            @click="openChangesPanelAndClose"
          >
            Review changes
          </button>
          <button
            type="button"
            class="w-full text-left px-3 py-2 text-sm text-gray-700 transition-colors hover:bg-(--ui-surface-muted) dark:text-gray-300"
            @click="cancelAndClose"
          >
            Discard changes
          </button>
        </template>
      </template>
    </div>
  </div>
</template>
