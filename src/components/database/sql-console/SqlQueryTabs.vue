<template>
  <div
    class="bg-gray-100 dark:bg-gray-850 border-b border-gray-200 dark:border-gray-700 flex items-center overflow-x-auto scrollbar-thin"
  >
    <!-- Query Tabs with drag support -->
    <template v-for="(tab, index) in tabs" :key="tab.id">
      <!-- Drop indicator before tab -->
      <div
        v-if="shouldShowDropIndicator(index, 'before')"
        class="w-0.5 h-5 bg-teal-500 rounded-full shrink-0 animate-pulse mx-0.5"
      />
      <div
        :draggable="renamingTabId !== tab.id"
        class="group flex items-center gap-1 px-3 py-1.5 border-r border-gray-200 dark:border-gray-700 cursor-pointer text-xs transition-colors min-w-0 shrink-0"
        :class="[
          tab.id === activeTabId
            ? 'bg-white dark:bg-gray-900 text-teal-600 dark:text-teal-400'
            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800',
          dragState.isDragging && dragState.draggedIndex === index && 'opacity-50'
        ]"
        @click="$emit('select', tab.id)"
        @dblclick="startRename(tab)"
        @contextmenu.prevent="showContextMenu($event, tab.id)"
        @dragstart="onDragStart($event, index)"
        @dragover="onDragOver($event, index)"
        @drop="onDrop($event, index)"
        @dragleave="onDragLeave($event, index)"
        @dragend="onDragEnd"
      >
        <span v-if="renamingTabId !== tab.id" class="truncate max-w-[120px]">{{ tab.name }}</span>
        <input
          v-else
          ref="renameInputRef"
          v-model="renameValue"
          type="text"
          class="w-24 px-1 py-0 text-xs bg-white dark:bg-gray-800 border border-teal-500 rounded focus:outline-none"
          @blur="finishRename"
          @keydown.enter="finishRename"
          @keydown.escape="cancelRename"
          @click.stop
        />
        <button
          v-if="tabs.length > 1 && renamingTabId !== tab.id"
          class="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-opacity"
          title="Close tab"
          @click.stop="$emit('close', tab.id)"
        >
          <X class="h-3 w-3" />
        </button>
      </div>
      <!-- Drop indicator after tab -->
      <div
        v-if="shouldShowDropIndicator(index, 'after')"
        class="w-0.5 h-5 bg-teal-500 rounded-full shrink-0 animate-pulse mx-0.5"
      />
    </template>
    <!-- Add Tab Button - positioned right after the last tab -->
    <button
      class="shrink-0 px-2 py-1.5 text-gray-500 dark:text-gray-400 hover:text-teal-500 dark:hover:text-teal-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
      title="New Query Tab"
      @click="$emit('add')"
    >
      <Plus class="h-4 w-4" />
    </button>
    <!-- Close All Tabs Button -->
    <button
      v-if="tabs.length > 1"
      class="shrink-0 px-2 py-1.5 text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ml-auto"
      title="Close All Tabs"
      @click="$emit('closeAll')"
    >
      <X class="h-4 w-4" />
    </button>

    <!-- Context Menu -->
    <Teleport to="body">
      <div
        v-if="contextMenu.visible"
        ref="contextMenuRef"
        class="fixed z-50 bg-white dark:bg-gray-850 shadow-lg dark:shadow-gray-900/30 border border-gray-200 dark:border-gray-700 rounded-md py-1 min-w-40"
        :style="{ left: `${contextMenu.x}px`, top: `${contextMenu.y}px` }"
      >
        <button
          class="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
          @click="handleContextMenuAction('close')"
        >
          Close
        </button>
        <button
          v-if="tabs.length > 1"
          class="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
          @click="handleContextMenuAction('close-others')"
        >
          Close Others
        </button>
        <button
          v-if="tabs.length > 1"
          class="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
          @click="handleContextMenuAction('close-all')"
        >
          Close All
        </button>
        <div class="border-t border-gray-100 dark:border-gray-700 my-1" />
        <button
          :disabled="!canReopenTab"
          :class="[
            'w-full text-left px-3 py-2 text-sm flex items-center justify-between',
            canReopenTab
              ? 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              : 'text-gray-400 dark:text-gray-500 cursor-not-allowed'
          ]"
          @click="handleReopenClosedTab"
        >
          <span>Reopen Closed Tab</span>
          <span class="text-xs text-gray-400 dark:text-gray-500">Ctrl+Shift+T</span>
        </button>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick, onMounted, onBeforeUnmount } from 'vue'
import { Plus, X } from 'lucide-vue-next'
import type { SqlQueryTab } from '@/stores/sqlConsole'

defineProps<{
  tabs: SqlQueryTab[]
  activeTabId: string | null
  canReopenTab?: boolean
}>()

const emit = defineEmits<{
  select: [tabId: string]
  close: [tabId: string]
  closeOthers: [tabId: string]
  closeAll: []
  add: []
  rename: [tabId: string, newName: string]
  reorder: [fromIndex: number, toIndex: number]
  reopenClosedTab: []
}>()

// Tab renaming state
const renamingTabId = ref<string | null>(null)
const renameValue = ref('')
const renameInputRef = ref<HTMLInputElement[]>()

// Drag state for tab reordering
const dragState = ref<{
  isDragging: boolean
  draggedIndex: number | null
  dropTargetIndex: number | null
  dropPosition: 'before' | 'after' | null
}>({
  isDragging: false,
  draggedIndex: null,
  dropTargetIndex: null,
  dropPosition: null
})

function onDragStart(event: DragEvent, index: number) {
  dragState.value.isDragging = true
  dragState.value.draggedIndex = index
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', String(index))
  }
}

function onDragOver(event: DragEvent, targetIndex: number) {
  if (dragState.value.draggedIndex === null) return

  event.preventDefault()

  if (dragState.value.draggedIndex === targetIndex) {
    // Dragging over itself - no indicator
    dragState.value.dropTargetIndex = null
    dragState.value.dropPosition = null
    return
  }

  const target = event.currentTarget as HTMLElement
  const rect = target.getBoundingClientRect()
  const mouseX = event.clientX
  const midpoint = rect.left + rect.width / 2

  // Determine if drop should be before or after target
  const position = mouseX < midpoint ? 'before' : 'after'

  dragState.value.dropTargetIndex = targetIndex
  dragState.value.dropPosition = position

  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'move'
  }
}

function onDrop(event: DragEvent, targetIndex: number) {
  event.preventDefault()

  const fromIndex = dragState.value.draggedIndex
  const position = dragState.value.dropPosition

  // Reset drag state
  resetDragState()

  if (fromIndex === null || fromIndex === targetIndex) return

  // Calculate the actual target index based on drop position
  let toIndex = targetIndex
  if (position === 'after') {
    toIndex = targetIndex + 1
  }

  // Don't move if it would result in the same position
  if (toIndex === fromIndex || toIndex === fromIndex + 1) return

  emit('reorder', fromIndex, toIndex)
}

function onDragLeave(event: DragEvent, targetIndex: number) {
  // Only clear if we're leaving the tab entirely
  const relatedTarget = event.relatedTarget as HTMLElement | null
  const currentTarget = event.currentTarget as HTMLElement

  if (!relatedTarget || !currentTarget.contains(relatedTarget)) {
    if (dragState.value.dropTargetIndex === targetIndex) {
      dragState.value.dropTargetIndex = null
      dragState.value.dropPosition = null
    }
  }
}

function onDragEnd() {
  resetDragState()
}

function resetDragState() {
  dragState.value = {
    isDragging: false,
    draggedIndex: null,
    dropTargetIndex: null,
    dropPosition: null
  }
}

function shouldShowDropIndicator(index: number, position: 'before' | 'after'): boolean {
  return (
    dragState.value.isDragging &&
    dragState.value.dropTargetIndex === index &&
    dragState.value.dropPosition === position
  )
}

function startRename(tab: SqlQueryTab) {
  renamingTabId.value = tab.id
  renameValue.value = tab.name
  nextTick(() => {
    const inputs = renameInputRef.value
    if (inputs && inputs.length > 0) {
      inputs[0].focus()
      inputs[0].select()
    }
  })
}

function finishRename() {
  if (renamingTabId.value && renameValue.value.trim()) {
    emit('rename', renamingTabId.value, renameValue.value.trim())
  }
  renamingTabId.value = null
  renameValue.value = ''
}

function cancelRename() {
  renamingTabId.value = null
  renameValue.value = ''
}

// Context menu state
const contextMenu = ref({
  visible: false,
  x: 0,
  y: 0,
  tabId: ''
})
const contextMenuRef = ref<HTMLElement | null>(null)

function showContextMenu(event: MouseEvent, tabId: string) {
  contextMenu.value = {
    visible: true,
    x: event.clientX,
    y: event.clientY,
    tabId
  }
}

function hideContextMenu() {
  contextMenu.value.visible = false
  contextMenu.value.tabId = ''
}

function handleContextMenuAction(action: 'close' | 'close-others' | 'close-all') {
  const tabId = contextMenu.value.tabId

  switch (action) {
    case 'close':
      emit('close', tabId)
      break
    case 'close-others':
      emit('closeOthers', tabId)
      break
    case 'close-all':
      emit('closeAll')
      break
  }

  hideContextMenu()
}

function handleReopenClosedTab() {
  emit('reopenClosedTab')
  hideContextMenu()
}

// Close context menu when clicking outside
function handleDocumentClick(event: MouseEvent) {
  const target = event.target as Node
  if (contextMenu.value.visible && contextMenuRef.value && !contextMenuRef.value.contains(target)) {
    hideContextMenu()
  }
}

onMounted(() => {
  document.addEventListener('click', handleDocumentClick)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleDocumentClick)
})
</script>
