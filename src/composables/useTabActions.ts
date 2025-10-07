import { useTabsStore } from '@/stores/tabs'
import { useExplorerNavigationStore } from '@/stores/explorerNavigation'
import { useFileExplorerStore } from '@/stores/fileExplorer'
import { useObjectTabMemory } from './useObjectTabMemory'
import type { SQLTableMeta, SQLViewMeta } from '@/types/metadata'
import type { FileSystemEntry } from '@/api/fileSystem'
import type { FileMetadata } from '@/types/files'
import type { ExplorerTab } from '@/stores/tabs'

export interface OpenDatabaseObjectParams {
  connectionId: string
  database: string
  schema?: string
  type: 'table' | 'view'
  name: string
  meta: SQLTableMeta | SQLViewMeta
  mode: 'preview' | 'pinned'
  defaultTab?: 'structure' | 'data'
  openInRightSplit?: boolean
}

export interface OpenFileParams {
  connectionId: string
  path: string
  entry: FileSystemEntry
  mode: 'preview' | 'pinned'
  defaultTab?: 'structure' | 'data'
  metadata?: FileMetadata | null
  openInRightSplit?: boolean
}

/**
 * Unified composable for tab actions (open, activate, close) with type-aware logic
 */
export function useTabActions() {
  const tabMemory = useObjectTabMemory()
  const tabsStore = useTabsStore()
  const navigationStore = useExplorerNavigationStore()
  const fileExplorerStore = useFileExplorerStore()

  function createDatabaseTab(params: OpenDatabaseObjectParams): Omit<ExplorerTab, 'pinned'> {
    // Check for remembered preference first
    let preferredTab = tabMemory.getPreferredTab(
      params.connectionId,
      'database',
      { database: params.database, schema: params.schema, name: params.name },
      params.defaultTab
    )

    // If linkTabs is enabled and no specific preference, inherit from existing tabs
    if (!params.defaultTab && tabsStore.linkTabs && preferredTab === 'data') {
      preferredTab = tabsStore.getMostRecentViewTab
    }

    return {
      id: `${params.mode}:${params.connectionId}:${params.database || ''}:${params.schema || ''}:${params.name}:${params.type || ''}`,
      connectionId: params.connectionId,
      database: params.database,
      schema: params.schema,
      name: params.name,
      type: params.type,
      meta: params.meta,
      tabType: 'database',
      defaultTab: params.defaultTab,
      viewTab: preferredTab
    }
  }

  function createFileTab(params: OpenFileParams): Omit<ExplorerTab, 'pinned'> {
    // Check for remembered preference first
    let preferredTab = tabMemory.getPreferredTab(
      params.connectionId,
      'file',
      { filePath: params.path },
      params.defaultTab
    )

    // If linkTabs is enabled and no specific preference, inherit from existing tabs
    if (!params.defaultTab && tabsStore.linkTabs && preferredTab === 'data') {
      preferredTab = tabsStore.getMostRecentViewTab
    }

    return {
      id: `${params.mode}:file:${params.path}`,
      connectionId: params.connectionId,
      name: params.entry.name,
      filePath: params.path,
      fileEntry: params.entry,
      fileType: params.entry.type,
      tabType: 'file',
      defaultTab: params.defaultTab,
      viewTab: preferredTab
    }
  }

  function openDatabaseObject(params: OpenDatabaseObjectParams) {
    const tab = createDatabaseTab(params)
    const desiredPinned = params.mode === 'pinned'

    if (desiredPinned) {
      // Use new unified addTab method
      tabsStore.addTab(tab)
    } else {
      // Set as preview tab
      const previewTab: ExplorerTab = { ...tab, pinned: false }
      tabsStore.setPreviewTab(previewTab)
      tabsStore.activePinnedIndex = null
    }

    return tab
  }

  function openFile(params: OpenFileParams) {
    const tab = createFileTab(params)
    const desiredPinned = params.mode === 'pinned'

    if (desiredPinned) {
      // Use new unified addTab method
      tabsStore.addTab(tab)
    } else {
      // Set as preview tab
      const previewTab: ExplorerTab = { ...tab, pinned: false }
      tabsStore.setPreviewTab(previewTab)
      tabsStore.activePinnedIndex = null
    }

    return tab
  }

  function activateTab(tab: ExplorerTab) {
    // Set active connection ID FIRST (synchronous store update)
    navigationStore.setActiveConnectionId(tab.connectionId)

    if (tab.tabType === 'file') {
      // Update file selection state
      if (tab.fileEntry && tab.filePath) {
        fileExplorerStore.setSelectedPath(tab.connectionId, tab.filePath)
      }
    }

    return tab
  }

  function closeTab(index: number) {
    const wasActive = tabsStore.activePinnedIndex === index
    tabsStore.closeTab(index)

    if (!tabsStore.pinnedTabs.length) {
      if (tabsStore.previewTab) {
        activateTab(tabsStore.previewTab)
      }
      return
    }

    if (wasActive) {
      const activeTab =
        tabsStore.activePinnedIndex !== null
          ? tabsStore.pinnedTabs[tabsStore.activePinnedIndex]
          : null
      if (activeTab) {
        activateTab(activeTab)
      }
    }
  }

  function activatePinnedTab(index: number) {
    if (index < 0 || index >= tabsStore.pinnedTabs.length) return

    tabsStore.activateTab(index)
    const tab = tabsStore.pinnedTabs[index]
    if (tab) {
      activateTab(tab)
    }
  }

  function activatePreviewTab() {
    if (tabsStore.previewTab) {
      tabsStore.activePinnedIndex = null
      activateTab(tabsStore.previewTab)
    }
  }

  return {
    // Main tab operations
    openDatabaseObject,
    openFile,
    activateTab,
    closeTab,
    activatePinnedTab,
    activatePreviewTab,

    // Tab creation helpers
    createDatabaseTab,
    createFileTab
  }
}
