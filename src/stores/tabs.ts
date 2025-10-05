import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { SQLTableMeta, SQLViewMeta } from '@/types/metadata'
import type { FileSystemEntry } from '@/api/fileSystem'
import { usePersistedState } from '@/composables/usePersistedState'

export type EditorTab = {
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
  const pinnedTabs = ref<EditorTab[]>([])
  const previewTab = ref<EditorTab | null>(null)
  const activePinnedIndex = ref<number | null>(null)

  // Link tabs setting (persisted)
  const linkTabs = usePersistedState<boolean>('explorer.linkTabs', false, {
    serializer: (v) => String(v),
    deserializer: (v) => v === 'true'
  })

  // Default active view ref (not persisted, but synced when linkTabs is true)
  const defaultActiveView = ref<'structure' | 'data'>('data')

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

  // Synced default view - updates all tabs when linkTabs is true
  const syncedDefaultView = computed({
    get: () => defaultActiveView.value,
    set: (newView: 'structure' | 'data') => {
      defaultActiveView.value = newView
      if (linkTabs.value) {
        // Update all pinned tabs
        pinnedTabs.value.forEach((tab) => {
          tab.viewTab = newView
        })
        // Update preview tab
        if (previewTab.value) {
          previewTab.value.viewTab = newView
        }
      } else {
        // Only update the active tab when tabs are not linked
        if (activePinnedIndex.value !== null && pinnedTabs.value[activePinnedIndex.value]) {
          pinnedTabs.value[activePinnedIndex.value].viewTab = newView
        } else if (previewTab.value) {
          previewTab.value.viewTab = newView
        }
      }
    }
  })

  // Tab key generation for deduplication
  function generateTabKey(tab: EditorTab): string {
    if (tab.tabType === 'file') {
      return `file:${tab.filePath}`
    }
    return `db:${tab.connectionId}:${tab.database || ''}:${tab.schema || ''}:${tab.name || ''}:${tab.type || ''}`
  }

  // Add or activate a database tab
  function addDatabaseTab(payload: {
    connectionId: string
    database?: string
    schema?: string
    name: string
    type?: 'table' | 'view' // Aligned with ObjectType
    meta?: SQLTableMeta | SQLViewMeta
    viewTab?: 'structure' | 'data'
  }) {
    const tab: EditorTab = {
      id: generateTabKey({
        ...payload,
        tabType: 'database',
        pinned: true
      } as EditorTab),
      ...payload,
      tabType: 'database',
      pinned: true,
      viewTab: payload.viewTab || 'data'
    }

    const key = generateTabKey(tab)
    const existingIndex = pinnedTabs.value.findIndex((t) => generateTabKey(t) === key)

    if (existingIndex >= 0) {
      // Activate existing tab
      activePinnedIndex.value = existingIndex
    } else {
      // Add new tab
      pinnedTabs.value.push(tab)
      activePinnedIndex.value = pinnedTabs.value.length - 1
    }
  }

  // Add or activate a file tab
  function addFileTab(payload: {
    connectionId: string
    filePath: string
    name: string
    fileType?: string
  }) {
    const tab: EditorTab = {
      id: generateTabKey({
        ...payload,
        tabType: 'file',
        pinned: true
      } as EditorTab),
      ...payload,
      tabType: 'file',
      pinned: true
    }

    const key = generateTabKey(tab)
    const existingIndex = pinnedTabs.value.findIndex((t) => generateTabKey(t) === key)

    if (existingIndex >= 0) {
      // Activate existing tab
      activePinnedIndex.value = existingIndex
    } else {
      // Add new tab
      pinnedTabs.value.push(tab)
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
    }
  }

  // Set preview tab (for hover/temporary display)
  function setPreviewTab(tab: EditorTab | null) {
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
    defaultActiveView,

    // Computed
    activeTab,
    activeConnectionId,
    syncedDefaultView,

    // Actions
    generateTabKey,
    addDatabaseTab,
    addFileTab,
    closeTab,
    activateTab,
    updateActiveTabView,
    setPreviewTab,
    clearAllTabs
  }
})
