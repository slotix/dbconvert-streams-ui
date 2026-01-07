<template>
  <div class="mb-2 flex items-center gap-2" :data-pane-id="paneId">
    <div
      ref="tabsContainerRef"
      class="flex-1 min-w-0 overflow-x-auto overflow-y-hidden tabs-scrollbar"
      @wheel="onWheel"
    >
      <div class="flex items-center gap-1 flex-nowrap min-w-max">
        <template v-for="(tab, i) in tabs" :key="tab.id">
          <!-- Drop indicator before tab -->
          <div
            v-if="shouldShowDropIndicator(i, 'before')"
            class="w-0.5 h-6 bg-teal-500 rounded-full shrink-0 animate-pulse"
          />
          <button
            :ref="(el) => setTabRef(el as HTMLElement | null, i)"
            type="button"
            draggable="true"
            :class="[
              'group flex items-center gap-2 rounded border bg-white dark:bg-gray-850 px-2 py-1 text-xs transition shrink-0',
              'focus:outline-none focus:ring-1 focus:ring-slate-400 dark:focus:ring-slate-500',
              isPreviewTab(i) ? 'border border-dashed italic' : 'border border-solid',
              isActiveTab(i)
                ? isPreviewTab(i)
                  ? 'border-teal-400 dark:border-teal-300 text-gray-900 dark:text-gray-100 bg-teal-50/70 dark:bg-teal-900/20 ring-2 ring-teal-500/40 dark:ring-teal-400/40 shadow-[0_0_0_1px_rgba(20,184,166,0.35)]'
                  : 'border-teal-500 dark:border-teal-400 ring-2 ring-teal-500/40 dark:ring-teal-400/40 bg-teal-50/70 dark:bg-teal-900/20 shadow-[0_0_0_1px_rgba(20,184,166,0.35)]'
                : isPreviewTab(i)
                  ? 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-gray-400 dark:hover:border-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                  : 'border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800',
              dragState.isDragging && dragState.draggedIndex === i && 'opacity-50'
            ]"
            @click="$emit('activate-tab', i)"
            @dblclick.stop="isPreviewTab(i) ? $emit('pin-preview') : undefined"
            @contextmenu.prevent="showContextMenu($event, i)"
            @dragstart="onDragStart($event, i)"
            @dragover="onTabDragOver($event, i)"
            @drop="onTabDrop($event, i)"
            @dragleave="onTabDragLeave($event, i)"
            @dragend="onDragEnd"
          >
            <!-- Object type icon only (no data/structure indicator) -->
            <component
              :is="getObjectIcon(tab)"
              :class="['h-4 w-4 shrink-0', getIconColor(tab)]"
              aria-hidden="true"
            />

            <!-- Tab name -->
            <span
              class="truncate font-medium text-gray-900 dark:text-gray-100 max-w-[150px]"
              :title="tab.name"
            >
              {{ tab.name }}
            </span>

            <!-- Close button -->
            <span
              role="button"
              tabindex="0"
              class="flex h-4 w-4 items-center justify-center rounded transition hover:bg-slate-100 dark:hover:bg-slate-700 shrink-0"
              :aria-label="`Close tab ${tab.name}`"
              @click.stop="$emit('close-tab', i)"
              @keydown.enter.stop.prevent="$emit('close-tab', i)"
              @keydown.space.stop.prevent="$emit('close-tab', i)"
            >
              <X
                class="h-3.5 w-3.5 text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300"
                aria-hidden="true"
              />
            </span>
          </button>
          <!-- Drop indicator after tab -->
          <div
            v-if="shouldShowDropIndicator(i, 'after')"
            class="w-0.5 h-6 bg-teal-500 rounded-full shrink-0 animate-pulse"
          />
        </template>
      </div>
    </div>
    <button
      v-if="hasAnyTabs"
      ref="overflowButtonRef"
      type="button"
      class="shrink-0 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-850 p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
      aria-label="Show all tabs"
      @click="toggleOverflowMenu"
    >
      <MoreHorizontal class="h-4 w-4" />
    </button>

    <!-- All tabs menu -->
    <Teleport to="body">
      <div
        v-if="overflowMenu.visible"
        ref="overflowMenuRef"
        class="fixed z-50 bg-white dark:bg-gray-850 shadow-lg dark:shadow-gray-900/30 border border-gray-200 dark:border-gray-700 rounded-md py-1 min-w-56"
        :style="{ left: `${adjustedOverflowMenuX}px`, top: `${adjustedOverflowMenuY}px` }"
      >
        <button
          v-for="(tab, i) in tabs"
          :key="`overflow-${tab.id}`"
          class="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
          :class="
            isActiveTab(i) ? 'text-gray-900 dark:text-gray-100' : 'text-gray-700 dark:text-gray-300'
          "
          @click="activateTabFromMenu(i)"
        >
          <component :is="getObjectIcon(tab)" :class="['h-4 w-4 shrink-0', getIconColor(tab)]" />
          <span class="truncate">{{ tab.name }}</span>
        </button>
      </div>
    </Teleport>

    <!-- Context menu -->
    <Teleport to="body">
      <div
        v-if="contextMenu.visible"
        ref="contextMenuRef"
        class="fixed z-50 bg-white dark:bg-gray-850 shadow-lg dark:shadow-gray-900/30 border border-gray-200 dark:border-gray-700 rounded-md py-1 min-w-40"
        :style="{ left: `${adjustedMenuX}px`, top: `${adjustedMenuY}px` }"
      >
        <button
          class="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
          @click="handleMoveToOtherPane"
        >
          <ArrowRightLeft class="h-4 w-4 text-gray-500 dark:text-gray-400" />
          <span>{{ moveToOtherPaneLabel }}</span>
        </button>
        <div class="border-t border-gray-100 dark:border-gray-700 my-1" />
        <button
          class="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
          @click="handleContextMenuAction('close')"
        >
          <span>Close</span>
        </button>
        <button
          class="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
          @click="handleContextMenuAction('close-others')"
        >
          <span>Close Others</span>
        </button>
        <button
          class="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
          @click="handleContextMenuAction('close-all')"
        >
          <span>Close All</span>
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
import { computed, ref, onMounted, onBeforeUnmount, onBeforeUpdate, watch, nextTick } from 'vue'
import {
  ArrowRightLeft,
  Code,
  Database,
  Eye,
  File,
  MoreHorizontal,
  Server,
  Share2,
  Sheet,
  Terminal,
  X,
  Zap
} from 'lucide-vue-next'
import { usePaneTabsStore, type PaneId, type PaneTab } from '@/stores/paneTabs'

// Get current zoom factor for position adjustment
const getZoomFactor = () => {
  const zoomValue = getComputedStyle(document.documentElement).getPropertyValue('--app-zoom')
  return parseFloat(zoomValue) || 1
}

const props = defineProps<{
  paneId: PaneId
  isActive: boolean // Visual indicator for active pane
}>()

const emit = defineEmits<{
  'activate-preview': []
  'pin-preview': []
  'activate-tab': [index: number]
  'close-tab': [index: number]
  'close-other-tabs': [keepIndex: number]
  'close-all-tabs': []
}>()

const store = usePaneTabsStore()
const paneState = computed(() => store.getPaneState(props.paneId))
const tabs = computed(() => paneState.value.tabs)
const activeIndex = computed(() => paneState.value.activeIndex ?? -1)
const previewIndex = computed(() => paneState.value.previewIndex ?? -1)
const hasAnyTabs = computed(() => tabs.value.length > 0)
const canReopenTab = computed(() => store.canReopenTab)

const DRAG_MIME = 'application/x-dbconvert-pane-tab'

// Drag payload type
interface DragPayload {
  fromPaneId: PaneId
  fromIndex: number
  wasPreview: boolean
}

// Drag state for tab reordering (same-pane and cross-pane)
const dragState = ref<{
  isDragging: boolean
  draggedIndex: number | null // Only set for same-pane drags (initiated here)
  isCrossPaneDrag: boolean // True when drag is from another pane
  dropTargetIndex: number | null
  dropPosition: 'before' | 'after' | null
}>({
  isDragging: false,
  draggedIndex: null,
  isCrossPaneDrag: false,
  dropTargetIndex: null,
  dropPosition: null
})

function onDragStart(event: DragEvent, index: number) {
  const payload = { fromPaneId: props.paneId, fromIndex: index, wasPreview: isPreviewTab(index) }
  try {
    event.dataTransfer?.setData(DRAG_MIME, JSON.stringify(payload))
    event.dataTransfer?.setData('text/plain', JSON.stringify(payload))
  } catch {
    // ignore
  }
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
  }
  dragState.value.isDragging = true
  dragState.value.draggedIndex = index
  dragState.value.isCrossPaneDrag = false
}

function isValidTabDrag(event: DragEvent): boolean {
  if (!event.dataTransfer) return false
  return (
    Array.from(event.dataTransfer.types || []).includes(DRAG_MIME) ||
    Array.from(event.dataTransfer.types || []).includes('text/plain')
  )
}

function onTabDragOver(event: DragEvent, targetIndex: number) {
  // Check if this is a valid tab drag
  if (!isValidTabDrag(event)) return

  // Always handle tab drags at the tab level for precise positioning
  event.preventDefault()
  event.stopPropagation()

  const isSamePaneDrag = dragState.value.isDragging && dragState.value.draggedIndex !== null

  if (isSamePaneDrag && dragState.value.draggedIndex === targetIndex) {
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

  // Mark as cross-pane drag if not a same-pane drag
  if (!isSamePaneDrag) {
    dragState.value.isDragging = true
    dragState.value.isCrossPaneDrag = true
  }

  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'move'
  }
}

function onTabDrop(event: DragEvent, targetIndex: number) {
  event.preventDefault()
  event.stopPropagation()

  // Read the actual payload on drop (now we can access the data)
  const raw =
    event.dataTransfer?.getData(DRAG_MIME) || event.dataTransfer?.getData('text/plain') || ''
  let payload: DragPayload | null = null

  try {
    if (raw) {
      const parsed = JSON.parse(raw)
      if (
        (parsed.fromPaneId === 'left' || parsed.fromPaneId === 'right') &&
        Number.isInteger(parsed.fromIndex) &&
        parsed.fromIndex >= 0
      ) {
        payload = {
          fromPaneId: parsed.fromPaneId,
          fromIndex: parsed.fromIndex,
          wasPreview: !!parsed.wasPreview
        }
      }
    }
  } catch {
    // ignore
  }

  const position = dragState.value.dropPosition

  // Reset drag state
  resetDragState()

  if (!payload) return

  // Calculate the actual target index based on drop position
  let toIndex = targetIndex
  if (position === 'after') {
    toIndex = targetIndex + 1
  }

  if (payload.fromPaneId === props.paneId) {
    // Same pane reordering
    const fromIndex = payload.fromIndex
    if (fromIndex === targetIndex) return
    // Don't move if it would result in the same position
    if (toIndex === fromIndex || toIndex === fromIndex + 1) return
    store.reorderTab(props.paneId, fromIndex, toIndex)
    if (payload.wasPreview) {
      const newPreviewIndex = paneState.value.previewIndex
      if (newPreviewIndex !== null) {
        store.keepTab(props.paneId, newPreviewIndex)
      }
    }
  } else {
    // Cross-pane move with specific position
    store.moveTab(payload.fromPaneId, payload.fromIndex, props.paneId, toIndex)
  }
}

function onTabDragLeave(event: DragEvent, targetIndex: number) {
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
    isCrossPaneDrag: false,
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

// Context menu state
const contextMenu = ref({
  visible: false,
  x: 0,
  y: 0,
  tabIndex: -1
})
const contextMenuRef = ref<HTMLElement | null>(null)
const adjustedMenuX = computed(() => contextMenu.value.x / getZoomFactor())
const adjustedMenuY = computed(() => contextMenu.value.y / getZoomFactor())
const tabsContainerRef = ref<HTMLElement | null>(null)
const tabRefs = ref<Map<number, HTMLElement>>(new Map())
const overflowMenu = ref({ visible: false, x: 0, y: 0 })
const overflowMenuRef = ref<HTMLElement | null>(null)
const overflowButtonRef = ref<HTMLElement | null>(null)
const adjustedOverflowMenuX = computed(() => overflowMenu.value.x / getZoomFactor())
const adjustedOverflowMenuY = computed(() => overflowMenu.value.y / getZoomFactor())

function isActiveTab(index: number): boolean {
  return paneState.value.activeIndex === index
}

function isPreviewTab(index: number): boolean {
  return paneState.value.previewIndex === index
}

function setTabRef(el: HTMLElement | null, index: number) {
  if (!el) {
    tabRefs.value.delete(index)
    return
  }
  tabRefs.value.set(index, el)
}

// Compute the target pane for move action
const targetPaneId = computed<PaneId>(() => (props.paneId === 'left' ? 'right' : 'left'))
const moveToOtherPaneLabel = computed(() =>
  props.paneId === 'left' ? 'Move to Right Pane' : 'Move to Left Pane'
)

function handleMoveToOtherPane() {
  const index = contextMenu.value.tabIndex
  if (index >= 0) {
    store.moveTab(props.paneId, index, targetPaneId.value)
  }
  hideContextMenu()
}

function getObjectIcon(tab: PaneTab) {
  if (tab.tabType === 'connection-details') return Server
  if (tab.tabType === 'database-overview') return Database
  if (tab.tabType === 'file') return File
  if (tab.tabType === 'sql-console') return Terminal
  if (tab.tabType === 'file-console') return Terminal
  if (tab.tabType === 'diagram') return Share2
  if (tab.type === 'view') return Eye
  if (tab.type === 'trigger') return Zap
  if (tab.type === 'function' || tab.type === 'procedure') return Code
  return Sheet
}

function getIconColor(tab: PaneTab): string {
  if (tab.tabType === 'connection-details') {
    return 'text-indigo-500 dark:text-indigo-400'
  }
  if (tab.tabType === 'database-overview') {
    return 'text-teal-500 dark:text-teal-400'
  }
  // Database tabs: tables and views
  if (tab.tabType === 'database') {
    if (tab.type === 'view') {
      return 'text-teal-500 dark:text-teal-400'
    }
    if (tab.type === 'trigger') {
      return 'text-amber-500 dark:text-amber-400'
    }
    if (tab.type === 'function') {
      return 'text-indigo-500 dark:text-indigo-400'
    }
    if (tab.type === 'procedure') {
      return 'text-violet-500 dark:text-violet-400'
    }
    return 'text-blue-500 dark:text-blue-400'
  }
  // SQL Console tabs
  if (tab.tabType === 'sql-console') {
    return 'text-emerald-500 dark:text-emerald-400'
  }
  // Diagram tabs
  if (tab.tabType === 'diagram') {
    return 'text-purple-500 dark:text-purple-400'
  }
  // File tabs
  if (tab.tabType === 'file') {
    return 'text-amber-500 dark:text-amber-400'
  }
  // File console tabs
  if (tab.tabType === 'file-console') {
    return 'text-orange-500 dark:text-orange-400'
  }
  // Default fallback
  return 'text-slate-500 dark:text-slate-400'
}

function showContextMenu(event: MouseEvent, index: number) {
  contextMenu.value = {
    visible: true,
    x: event.clientX,
    y: event.clientY,
    tabIndex: index
  }
}

function hideContextMenu() {
  contextMenu.value.visible = false
  contextMenu.value.tabIndex = -1
}

function handleContextMenuAction(action: 'close' | 'close-others' | 'close-all') {
  const index = contextMenu.value.tabIndex

  switch (action) {
    case 'close':
      emit('close-tab', index)
      break
    case 'close-others':
      emit('close-other-tabs', index)
      break
    case 'close-all':
      emit('close-all-tabs')
      break
  }

  hideContextMenu()
}

function handleReopenClosedTab() {
  store.reopenClosedTab()
  hideContextMenu()
}

function onWheel(event: WheelEvent) {
  const container = tabsContainerRef.value
  if (!container) return
  if (container.scrollWidth <= container.clientWidth) return
  if (Math.abs(event.deltaX) > Math.abs(event.deltaY)) return
  container.scrollLeft += event.deltaY
  event.preventDefault()
}

function toggleOverflowMenu() {
  if (overflowMenu.value.visible) {
    hideOverflowMenu()
    return
  }
  const button = overflowButtonRef.value
  if (!button) return
  const rect = button.getBoundingClientRect()
  overflowMenu.value = {
    visible: true,
    x: rect.left,
    y: rect.bottom + 6
  }
  nextTick(positionOverflowMenu)
}

function hideOverflowMenu() {
  overflowMenu.value.visible = false
}

function activateTabFromMenu(index: number) {
  emit('activate-tab', index)
  hideOverflowMenu()
}

function positionOverflowMenu() {
  const menu = overflowMenuRef.value
  const button = overflowButtonRef.value
  if (!menu || !button) return
  const rect = button.getBoundingClientRect()
  const menuRect = menu.getBoundingClientRect()
  const margin = 8
  let left = rect.right - menuRect.width
  const maxLeft = window.innerWidth - menuRect.width - margin
  if (left > maxLeft) left = maxLeft
  if (left < margin) left = margin
  overflowMenu.value.x = left
  overflowMenu.value.y = rect.bottom + 6
}

// Close context menu when clicking outside
function handleDocumentClick(event: MouseEvent) {
  const target = event.target as Node
  if (contextMenu.value.visible && contextMenuRef.value && !contextMenuRef.value.contains(target)) {
    hideContextMenu()
  }
  if (
    overflowMenu.value.visible &&
    overflowMenuRef.value &&
    !overflowMenuRef.value.contains(target) &&
    !overflowButtonRef.value?.contains(target)
  ) {
    hideOverflowMenu()
  }
}

function scrollActiveIntoView() {
  if (!props.isActive) return
  const container = tabsContainerRef.value
  if (!container) return
  let target: HTMLElement | null = null
  if (activeIndex.value >= 0) {
    target = tabRefs.value.get(activeIndex.value) ?? null
  }
  if (!target) return
  const containerRect = container.getBoundingClientRect()
  const targetRect = target.getBoundingClientRect()
  if (targetRect.left < containerRect.left || targetRect.right > containerRect.right) {
    target.scrollIntoView({ behavior: 'smooth', inline: 'nearest', block: 'nearest' })
  }
}

onMounted(() => {
  document.addEventListener('click', handleDocumentClick)
  nextTick(scrollActiveIntoView)
})

onBeforeUpdate(() => {
  tabRefs.value = new Map()
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleDocumentClick)
})

watch([tabs, activeIndex, previewIndex, () => props.isActive], async () => {
  await nextTick()
  scrollActiveIntoView()
})
</script>

<style scoped>
.tabs-scrollbar {
  scrollbar-width: none;
}

.tabs-scrollbar::-webkit-scrollbar {
  height: 6px;
}

.tabs-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}

.tabs-scrollbar::-webkit-scrollbar-thumb {
  background: transparent;
  border-radius: 999px;
}

.tabs-scrollbar:hover {
  scrollbar-width: thin;
  scrollbar-color: rgba(148, 163, 184, 0.6) transparent;
}

.tabs-scrollbar:hover::-webkit-scrollbar-thumb {
  background: rgba(148, 163, 184, 0.6);
}

.dark .tabs-scrollbar:hover {
  scrollbar-color: rgba(100, 116, 139, 0.7) transparent;
}

.dark .tabs-scrollbar:hover::-webkit-scrollbar-thumb {
  background: rgba(100, 116, 139, 0.7);
}
</style>
