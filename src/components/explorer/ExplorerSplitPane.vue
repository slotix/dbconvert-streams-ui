<template>
  <div
    v-if="hasRightPane"
    ref="splitContainerRef"
    class="flex flex-row items-stretch min-w-0 flex-1 min-h-0"
  >
    <!-- Left pane (always visible) -->
    <div
      ref="leftPaneRef"
      :style="{ flexBasis: `${splitGrow}%`, flexGrow: 0, flexShrink: 0 }"
      class="relative min-w-[300px] flex flex-col min-h-0"
      @mousedown="$emit('set-active-pane', 'left')"
      @dragover="onPaneDragOver"
      @drop="onPaneDrop($event, 'left')"
    >
      <!-- Left pane tabs -->
      <slot name="left-tabs" />

      <!-- Left pane breadcrumb -->
      <slot name="left-breadcrumb" />

      <!-- Left pane content -->
      <slot name="left-content" />
    </div>

    <!-- VS Code-style sash between panes -->
    <div
      role="separator"
      aria-orientation="vertical"
      class="relative z-20 w-[8px] shrink-0 cursor-col-resize select-none group"
      title="Drag to resize • Double-click to reset"
      @mousedown.prevent="onDividerMouseDown"
      @dblclick="onDividerDoubleClick"
    >
      <div
        class="absolute inset-y-0 left-1/2 -translate-x-1/2 w-px group-hover:w-[3px] bg-gray-200 dark:bg-gray-700 group-hover:bg-teal-400 dark:group-hover:bg-teal-500 transition-all duration-150"
      />
    </div>

    <!-- Right pane (conditional) -->
    <div
      :style="{ flexBasis: '0px' }"
      class="relative grow min-w-[300px] flex flex-col min-h-0"
      @mousedown="$emit('set-active-pane', 'right')"
      @dragover="onPaneDragOver"
      @drop="onPaneDrop($event, 'right')"
    >
      <!-- Right pane tabs -->
      <slot name="right-tabs" />

      <!-- Right pane breadcrumb -->
      <slot name="right-breadcrumb" />

      <!-- Right pane content -->
      <slot name="right-content" />
    </div>
  </div>

  <!-- Single pane view (left only) - reuse left-content slot -->
  <div v-else class="flex flex-col flex-1 min-h-0">
    <div
      class="flex flex-col flex-1 min-h-0"
      @mousedown="$emit('set-active-pane', 'left')"
      @dragover="onPaneDragOver"
      @drop="onPaneDrop($event, 'left')"
    >
      <!-- Left pane tabs -->
      <slot name="left-tabs" />

      <!-- Left pane breadcrumb -->
      <slot name="left-breadcrumb" />

      <!-- Left pane content (same slot as split view) -->
      <slot name="left-content" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import {
  useSplitPaneResize,
  type SplitPaneResizeController
} from '@/composables/useSplitPaneResize'
import { usePaneTabsStore, type PaneId } from '@/stores/paneTabs'
import { useUnsavedChangesGuard } from '@/composables/useUnsavedChangesGuard'
import { useObjectTabStateStore } from '@/stores/objectTabState'

// Define props
const props = defineProps<{
  activePane: 'left' | 'right'
  splitPaneResize?: SplitPaneResizeController
}>()

// Define emits
defineEmits<{
  'set-active-pane': [pane: 'left' | 'right']
}>()

// Use composables and store
const splitPaneResize = props.splitPaneResize ?? useSplitPaneResize()

const { splitGrow, splitContainerRef, leftPaneRef, onDividerMouseDown, onDividerDoubleClick } =
  splitPaneResize
const paneTabsStore = usePaneTabsStore()
const objectTabStateStore = useObjectTabStateStore()
const { isObjectKeyDirty, confirmDiscardUnsavedChanges } = useUnsavedChangesGuard()

// Check if we have right pane content
const hasRightPane = computed(() => paneTabsStore.isRightPaneVisible)

// Drag-and-drop for pane-level drops (empty space, adds to end)
const DRAG_MIME = 'application/x-dbconvert-pane-tab'

function isValidTabDrag(event: DragEvent): boolean {
  if (!event.dataTransfer) return false
  return (
    Array.from(event.dataTransfer.types || []).includes(DRAG_MIME) ||
    Array.from(event.dataTransfer.types || []).includes('text/plain')
  )
}

function onPaneDragOver(event: DragEvent) {
  if (!event.dataTransfer) return
  if (isValidTabDrag(event)) {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
  }
}

function onPaneDrop(event: DragEvent, paneId: PaneId) {
  event.preventDefault()

  if (!event.dataTransfer) return

  const raw = event.dataTransfer.getData(DRAG_MIME) || event.dataTransfer.getData('text/plain')
  if (!raw) return

  try {
    const parsed = JSON.parse(raw) as {
      fromPaneId: PaneId
      fromIndex: number
      wasPreview?: boolean
    }
    if (parsed.fromPaneId !== 'left' && parsed.fromPaneId !== 'right') return
    if (!Number.isInteger(parsed.fromIndex) || parsed.fromIndex < 0) return

    const toIndex = paneTabsStore.getPaneState(paneId).tabs.length

    if (parsed.fromPaneId === paneId) {
      paneTabsStore.reorderTab(paneId, parsed.fromIndex, toIndex)
      if (parsed.wasPreview) {
        const newPreviewIndex = paneTabsStore.getPaneState(paneId).previewIndex
        if (newPreviewIndex !== null) {
          paneTabsStore.keepTab(paneId, newPreviewIndex)
        }
      }
      return
    }

    // Drop on pane (not on tab) - add to end
    const fromTab = paneTabsStore.getPaneState(parsed.fromPaneId).tabs[parsed.fromIndex]
    const fromObjectKey = fromTab?.objectKey
    if (isObjectKeyDirty(fromObjectKey)) {
      confirmDiscardUnsavedChanges({
        description: 'You have unsaved changes in this tab. Discard them and move the tab?'
      }).then((confirmed) => {
        if (!confirmed) return
        if (fromObjectKey) {
          objectTabStateStore.setHasUnsavedChanges(fromObjectKey, false)
        }
        paneTabsStore.moveTab(parsed.fromPaneId, parsed.fromIndex, paneId, toIndex)
      })
      return
    }

    paneTabsStore.moveTab(parsed.fromPaneId, parsed.fromIndex, paneId, toIndex)
  } catch {
    // ignore invalid payloads
  }
}
</script>
