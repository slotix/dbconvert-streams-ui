import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { SQLTableMeta, SQLViewMeta } from '@/types/metadata'
import type { FileSystemEntry } from '@/api/fileSystem'
import { usePersistedState } from '@/composables/usePersistedState'

export type ExplorerTab = {
  id: string
  connectionId: string
  // For database objects (compatible with local type)
  database?: string
  schema?: string
  name: string
  type?: 'table' | 'view' // Aligned with ObjectType in component
  meta?: SQLTableMeta | SQLViewMeta
  // For file objects
  filePath?: string
  fileEntry?: FileSystemEntry
  fileType?: string
  // Common properties
  tabType: 'database' | 'file'
  pinned: boolean
  defaultTab?: 'structure' | 'data'
  viewTab?: 'structure' | 'data'
}

export const useTabsStore = defineStore('tabs', () => {
  // Tab state
  const pinnedTabs = ref<ExplorerTab[]>([])
  const previewTab = ref<ExplorerTab | null>(null)
  const activePinnedIndex = ref<number | null>(null)

  // Link tabs setting (persisted)
  const linkTabs = usePersistedState<boolean>('explorer.linkTabs', false, {
    serializer: (v) => String(v),
    deserializer: (v) => v === 'true'
  })

  // Current active tab
  const activeTab = computed(() => {
    return activePinnedIndex.value !== null
      ? pinnedTabs.value[activePinnedIndex.value]
      : previewTab.value
  })

  // Current active connection ID from the active tab
  const activeConnectionId = computed(() => {
    return activeTab.value?.connectionId || null
  })

  // Get the most recent view tab from existing tabs (for linkTabs feature)
  const getMostRecentViewTab = computed(() => {
    // Look at all tabs to find the most recently used view
    const allTabs = [...pinnedTabs.value]
    if (previewTab.value) allTabs.push(previewTab.value)

    // Find tabs with viewTab set and return the most common one
    const viewTabs = allTabs.map((tab) => tab.viewTab).filter(Boolean)
    if (viewTabs.length === 0) return 'data'

    // Return the last used one, or 'data' as fallback
    return viewTabs[viewTabs.length - 1] || 'data'
  })

  // Tab key generation for deduplication
  function generateTabKey(tab: ExplorerTab): string {
    if (tab.tabType === 'file') {
      return `file:${tab.filePath}`
    }
    return `db:${tab.connectionId}:${tab.database || ''}:${tab.schema || ''}:${tab.name || ''}:${tab.type || ''}`
  }

  // Add or activate any tab (unified method)
  function addTab(tab: Omit<ExplorerTab, 'pinned'>) {
    const fullTab: ExplorerTab = { ...tab, pinned: true }
    const key = generateTabKey(fullTab)
    const existingIndex = pinnedTabs.value.findIndex((t) => generateTabKey(t) === key)

    if (existingIndex >= 0) {
      // Activate existing tab and update any new properties (like fileEntry)
      if (tab.tabType === 'file' && tab.fileEntry) {
        pinnedTabs.value[existingIndex].fileEntry = tab.fileEntry
      }
      activePinnedIndex.value = existingIndex
    } else {
      // Add new tab
      pinnedTabs.value.push(fullTab)
      activePinnedIndex.value = pinnedTabs.value.length - 1
    }
  }

  // Close a tab
  function closeTab(index: number) {
    if (index < 0 || index >= pinnedTabs.value.length) return

    pinnedTabs.value.splice(index, 1)

    if (!pinnedTabs.value.length) {
      activePinnedIndex.value = null
      return
    }

    // Adjust active index
    const newIndex = Math.min(index, pinnedTabs.value.length - 1)
    activePinnedIndex.value = newIndex
  }

  // Activate a tab by index
  function activateTab(index: number) {
    if (index < 0 || index >= pinnedTabs.value.length) return
    activePinnedIndex.value = index
  }

  // Update active tab's view (structure/data)
  function updateActiveTabView(viewTab: 'structure' | 'data') {
    if (activePinnedIndex.value !== null && pinnedTabs.value[activePinnedIndex.value]) {
      pinnedTabs.value[activePinnedIndex.value].viewTab = viewTab
    } else if (previewTab.value) {
      previewTab.value.viewTab = viewTab
    }
  }

  // Set preview tab (for hover/temporary display)
  function setPreviewTab(tab: ExplorerTab | null) {
    previewTab.value = tab
  }

  // Clear all tabs
  function clearAllTabs() {
    pinnedTabs.value = []
    previewTab.value = null
    activePinnedIndex.value = null
  }

  return {
    // State
    pinnedTabs,
    previewTab,
    activePinnedIndex,
    linkTabs,
    getMostRecentViewTab,

    // Computed
    activeTab,
    activeConnectionId,

    // Actions
    generateTabKey,
    addTab,
    closeTab,
    activateTab,
    updateActiveTabView,
    setPreviewTab,
    clearAllTabs
  }
})
