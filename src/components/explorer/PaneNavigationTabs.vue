<template>
  <div class="mb-2" :data-pane-id="paneId">
    <div class="flex items-center gap-1 flex-wrap">
      <!-- Preview tab (dashed border) -->
      <button
        v-if="currentPreview"
        type="button"
        class="px-2 py-1 text-xs rounded border border-dashed border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-850 text-gray-600 dark:text-gray-400 italic transition hover:border-gray-400 dark:hover:border-gray-500 hover:text-gray-700 dark:hover:text-gray-300 focus:outline-none focus:ring-1 focus:ring-slate-400 dark:focus:ring-slate-500"
        @click="$emit('activate-preview')"
      >
        <span class="truncate" :title="currentPreview.name">{{ currentPreview.name }}</span>
        <span class="text-xs ml-1">(Preview)</span>
      </button>

      <!-- Pinned tabs (solid border) -->
      <button
        v-for="(tab, i) in pinnedTabs"
        :key="tab.id"
        type="button"
        :class="[
          'group flex items-center gap-2 rounded border bg-white dark:bg-gray-850 px-2 py-1 text-xs transition',
          'focus:outline-none focus:ring-1 focus:ring-slate-400 dark:focus:ring-slate-500',
          isActiveTab(i)
            ? 'border-slate-400 dark:border-slate-500 ring-1 ring-slate-400 dark:ring-slate-500 bg-gray-50 dark:bg-gray-800'
            : 'border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800'
        ]"
        @click="$emit('activate-tab', i)"
        @contextmenu.prevent="showContextMenu($event, i)"
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
          <XMarkIcon
            class="h-3.5 w-3.5 text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300"
            aria-hidden="true"
          />
        </span>
      </button>
    </div>

    <!-- Context menu -->
    <Teleport to="body">
      <div
        v-if="contextMenu.visible"
        ref="contextMenuRef"
        class="fixed z-50 bg-white dark:bg-gray-850 shadow-lg dark:shadow-gray-900/30 border border-gray-200 dark:border-gray-700 rounded-md py-1 min-w-40"
        :style="{ left: `${contextMenu.x}px`, top: `${contextMenu.y}px` }"
      >
        <button
          class="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
          @click="handleContextMenuAction('close')"
        >
          <XMarkIcon class="h-4 w-4 text-gray-500 dark:text-gray-400" />
          <span>Close</span>
        </button>
        <button
          class="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
          @click="handleContextMenuAction('close-others')"
        >
          <XMarkIcon class="h-4 w-4 text-gray-500 dark:text-gray-400" />
          <span>Close Others</span>
        </button>
        <button
          class="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
          @click="handleContextMenuAction('close-all')"
        >
          <XMarkIcon class="h-4 w-4 text-gray-500 dark:text-gray-400" />
          <span>Close All</span>
        </button>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onBeforeUnmount } from 'vue'
import {
  TableCellsIcon,
  EyeIcon,
  DocumentIcon,
  XMarkIcon,
  CommandLineIcon,
  ShareIcon
} from '@heroicons/vue/20/solid'
import { usePaneTabsStore, type PaneId, type PaneTab } from '@/stores/paneTabs'

const props = defineProps<{
  paneId: PaneId
  isActive: boolean // Visual indicator for active pane
}>()

const emit = defineEmits<{
  'activate-preview': []
  'activate-tab': [index: number]
  'close-tab': [index: number]
  'close-other-tabs': [keepIndex: number]
  'close-all-tabs': []
}>()

const store = usePaneTabsStore()
const paneState = computed(() => store.getPaneState(props.paneId))
const pinnedTabs = computed(() => paneState.value.pinnedTabs)
const currentPreview = computed(() => paneState.value.previewTab)

// Context menu state
const contextMenu = ref({
  visible: false,
  x: 0,
  y: 0,
  tabIndex: -1
})
const contextMenuRef = ref<HTMLElement | null>(null)

function isActiveTab(index: number): boolean {
  return paneState.value.activePinnedIndex === index
}

function getObjectIcon(tab: PaneTab) {
  if (tab.tabType === 'file') return DocumentIcon
  if (tab.tabType === 'sql-console') return CommandLineIcon
  if (tab.tabType === 'file-console') return CommandLineIcon
  if (tab.tabType === 'diagram') return ShareIcon
  return tab.type === 'view' ? EyeIcon : TableCellsIcon
}

function getIconColor(tab: PaneTab): string {
  // Database tabs: tables and views
  if (tab.tabType === 'database') {
    if (tab.type === 'view') {
      return 'text-teal-500 dark:text-teal-400'
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

// Close context menu when clicking outside
function handleDocumentClick(event: MouseEvent) {
  if (
    contextMenu.value.visible &&
    contextMenuRef.value &&
    !contextMenuRef.value.contains(event.target as Node)
  ) {
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
