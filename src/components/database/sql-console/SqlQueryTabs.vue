<template>
  <div
    class="sql-query-tabs ui-surface-toolbar ui-border-default flex min-h-[44px] items-center overflow-x-auto border-b py-1 scrollbar-thin"
  >
    <!-- Query Tabs with drag support -->
    <template v-for="(tab, index) in tabs" :key="tab.id">
      <!-- Drop indicator before tab -->
      <div
        v-if="shouldShowDropIndicator(index, 'before')"
        class="ui-tab-indicator w-0.5 h-6 rounded-full shrink-0 animate-pulse mx-0.5"
      />
      <div
        :draggable="renamingTabId !== tab.id"
        class="group ui-border-default flex min-w-0 shrink-0 cursor-pointer items-center gap-1 border-r px-3 py-2 text-xs transition-colors"
        :class="[
          tab.id === activeTabId
            ? 'ui-tab-active ui-text-strong'
            : 'ui-text-muted hover:[background-color:var(--ui-surface-muted)]',
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
          class="ui-surface-raised ui-border-default ui-accent-focus w-24 rounded border px-1 py-0 text-xs focus:outline-none"
          @blur="finishRename"
          @keydown.enter="finishRename"
          @keydown.escape="cancelRename"
          @click.stop
        />
        <button
          v-if="tabs.length > 1 && renamingTabId !== tab.id"
          class="rounded p-0.5 opacity-0 transition-opacity group-hover:opacity-100 hover:[background-color:var(--ui-surface-muted)]"
          title="Close tab"
          @click.stop="$emit('close', tab.id)"
        >
          <X class="h-3 w-3" />
        </button>
      </div>
      <!-- Drop indicator after tab -->
      <div
        v-if="shouldShowDropIndicator(index, 'after')"
        class="ui-tab-indicator w-0.5 h-6 rounded-full shrink-0 animate-pulse mx-0.5"
      />
    </template>
    <!-- Add Tab Button - positioned right after the last tab -->
    <button
      class="ui-accent-action ui-icon-muted shrink-0 px-2 py-2 transition-colors"
      title="New Query Tab"
      @click="$emit('add')"
    >
      <Plus class="h-4 w-4" />
    </button>
    <!-- Close All Tabs Button -->
    <button
      v-if="tabs.length > 1"
      class="ui-icon-muted ml-auto shrink-0 px-2 py-2 transition-colors hover:[background-color:var(--ui-surface-muted)] hover:[color:var(--ui-danger-text)]"
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
        class="ui-surface-floating ui-border-default fixed z-50 min-w-40 rounded-md border py-1"
        :style="{ left: `${contextMenu.x}px`, top: `${contextMenu.y}px` }"
      >
        <button
          class="ui-text-default w-full px-3 py-2 text-left text-sm hover:[background-color:var(--ui-surface-muted)]"
          @click="handleContextMenuAction('close')"
        >
          Close
        </button>
        <button
          v-if="tabs.length > 1"
          class="ui-text-default w-full px-3 py-2 text-left text-sm hover:[background-color:var(--ui-surface-muted)]"
          @click="handleContextMenuAction('close-others')"
        >
          Close Others
        </button>
        <button
          v-if="tabs.length > 1"
          class="ui-text-default w-full px-3 py-2 text-left text-sm hover:[background-color:var(--ui-surface-muted)]"
          @click="handleContextMenuAction('close-all')"
        >
          Close All
        </button>
        <div class="ui-border-default my-1 border-t" />
        <button
          :disabled="!canReopenTab"
          :class="[
            'flex w-full items-center justify-between px-3 py-2 text-left text-sm',
            canReopenTab
              ? 'ui-text-default hover:[background-color:var(--ui-surface-muted)]'
              : 'ui-text-subtle cursor-not-allowed'
          ]"
          @click="handleReopenClosedTab"
        >
          <span>Reopen Closed Tab</span>
          <span class="ui-text-subtle text-xs">Ctrl+Shift+T</span>
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

<style scoped>
.sql-query-tabs {
  scrollbar-gutter: stable;
}
</style>
