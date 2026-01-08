import { computed, ref, type Ref } from 'vue'
import type { FileSystemEntry } from '@/api/fileSystem'
import type { PaneId } from '@/stores/paneTabs'
import type { usePaneTabsStore } from '@/stores/paneTabs'
import type { useExplorerNavigationStore } from '@/stores/explorerNavigation'
import type { useConnectionsStore } from '@/stores/connections'
import type { useFileExplorerStore } from '@/stores/fileExplorer'
import type { useExplorerViewStateStore } from '@/stores/explorerViewState'
import type { useExplorerState } from '@/composables/useExplorerState'

type PaneTabsStore = ReturnType<typeof usePaneTabsStore>
type NavigationStore = ReturnType<typeof useExplorerNavigationStore>
type ConnectionsStore = ReturnType<typeof useConnectionsStore>
type FileExplorerStore = ReturnType<typeof useFileExplorerStore>
type ExplorerState = ReturnType<typeof useExplorerState>
type ViewStateStore = ReturnType<typeof useExplorerViewStateStore>

interface UseExplorerFileHandlersOptions {
  paneTabsStore: PaneTabsStore
  navigationStore: NavigationStore
  connectionsStore: ConnectionsStore
  fileExplorerStore: FileExplorerStore
  explorerState: ExplorerState
  viewState: ViewStateStore
  alwaysOpenNewTab: Ref<boolean>
}

export function useExplorerFileHandlers({
  paneTabsStore,
  navigationStore,
  connectionsStore,
  fileExplorerStore,
  explorerState,
  viewState,
  alwaysOpenNewTab
}: UseExplorerFileHandlersOptions) {
  // Loading state to prevent multiple file clicks during loading
  const isLoadingFile = ref(false)

  const currentFileEntries = computed<FileSystemEntry[]>(() => {
    const id = explorerState.currentConnectionId.value
    if (!id) return []
    return fileExplorerStore.getEntries(id)
  })

  async function handleOpenFile(payload: {
    connectionId: string
    path: string
    entry: FileSystemEntry
    mode: 'preview' | 'pinned'
    defaultTab?: 'structure' | 'data'
    openInRightSplit?: boolean
  }) {
    // Prevent multiple clicks while loading
    if (isLoadingFile.value) {
      return
    }

    const isTableFolder = payload.entry.type === 'dir' && payload.entry.isTable

    // Guard: only allow opening files or table folders
    if (payload.entry.type !== 'file' && !isTableFolder) {
      console.warn('Attempted to open a directory as a file:', payload.path)
      return
    }

    const targetPane: PaneId = payload.openInRightSplit
      ? 'right'
      : paneTabsStore.activePane || 'left'

    // Only update the global viewState when targeting the left pane.
    // Right pane file opens should not force left pane selection/focus.
    if (targetPane === 'left') {
      viewState.selectFile(payload.connectionId, payload.path)
    }

    navigationStore.setActiveConnectionId(payload.connectionId)
    connectionsStore.setCurrentConnection(payload.connectionId)

    // Clear panel states - file selection will be synced by watcher

    const effectiveMode: 'preview' | 'pinned' = alwaysOpenNewTab.value ? 'pinned' : payload.mode

    // Double-click on a file triggers both:
    // 1) single-click -> handleFileSelect -> preview open
    // 2) dblclick -> pinned open
    // If we add a pinned tab while the same file is already the preview tab, we end up
    // with duplicate tabs (and often duplicate Vue keys/ids), which can cause the file
    // grid to render empty. Instead, pin the existing preview tab.
    if (effectiveMode === 'pinned') {
      const preview = paneTabsStore.getPreviewTab(targetPane)
      if (preview?.tabType === 'file' && preview.filePath === payload.path) {
        paneTabsStore.pinPreviewTab(targetPane)
        return
      }
    }

    if (!payload.openInRightSplit) {
      explorerState.setFileSelection(payload.entry)
      // Clear selections from other connections to avoid double highlights
      fileExplorerStore.clearAllSelectionsExcept(payload.connectionId)
      fileExplorerStore.setSelectedPath(payload.connectionId, payload.path)
    }

    const tabId = `file:${payload.path}`

    // Set loading state to prevent additional clicks
    isLoadingFile.value = true

    // Add tab immediately with null metadata - data grid will load data directly
    // This allows the data to show immediately without waiting for metadata
    paneTabsStore.addTab(
      targetPane,
      {
        id: tabId,
        connectionId: payload.connectionId,
        name: payload.entry.name,
        filePath: payload.path,
        fileEntry: payload.entry,
        fileMetadata: null, // Data grid will fetch data; metadata loaded lazily in background
        fileType: payload.entry.type,
        tabType: 'file'
      },
      effectiveMode
    )

    // Ensure right-split opens actually focus the right pane.
    if (payload.openInRightSplit) {
      paneTabsStore.setActivePane('right')
    }

    // Clear loading state immediately - let the data grid handle its own loading
    isLoadingFile.value = false

    // Fetch metadata lazily in background (for structure tab, not blocking data display)
    const isS3 = payload.path.startsWith('s3://')

    // For S3: fetch schema only (no stats) to populate structure tab
    // For local: fetch with stats since it's fast
    fileExplorerStore
      .loadFileMetadata(payload.entry, !isS3, payload.connectionId)
      .then((metadata) => {
        paneTabsStore.updateTabFileMetadata(targetPane, tabId, metadata)
      })
  }

  async function handleFileSelect(payload: {
    connectionId: string
    path: string
    entry?: FileSystemEntry
  }) {
    // Prevent multiple clicks while loading
    if (isLoadingFile.value) {
      return
    }

    // Skip if this file is already selected (prevents double processing)
    const currentSelectedPath = fileExplorerStore.getSelectedPath(payload.connectionId)
    if (currentSelectedPath === payload.path) {
      return
    }

    navigationStore.setActiveConnectionId(payload.connectionId)

    // Find entry if not provided (e.g., from persisted state)
    let entry = payload.entry
    if (!entry) {
      const findEntry = (
        entries: FileSystemEntry[],
        targetPath: string
      ): FileSystemEntry | null => {
        for (const e of entries) {
          if (e.path === targetPath) return e
          if (e.children) {
            const found = findEntry(e.children, targetPath)
            if (found) return found
          }
        }
        return null
      }

      entry = findEntry(currentFileEntries.value, payload.path) || undefined

      // If entry not found, try expanding parent folders and search again
      if (!entry) {
        const pathSegments = payload.path.split('/')

        // Expand each parent folder in the path
        for (let i = pathSegments.length - 1; i > 0; i--) {
          const parentPath = pathSegments.slice(0, i).join('/')
          const parentEntry = findEntry(currentFileEntries.value, parentPath)

          if (parentEntry && parentEntry.type === 'dir' && !parentEntry.isLoaded) {
            // Load folder contents if not already loaded
            await fileExplorerStore.loadFolderContents(payload.connectionId, parentPath)
            // Retry finding the entry after loading
            entry = findEntry(currentFileEntries.value, payload.path) || undefined
            if (entry) break
          }
        }
      }
    }

    // Guard: if we still don't have an entry, bail out
    if (!entry) {
      console.warn('handleFileSelect: Could not find entry for path:', payload.path)
      return
    }

    const isTableFolder = entry.type === 'dir' && entry.isTable

    // Only open files or table folders for preview
    if (entry.type !== 'file' && !isTableFolder) {
      // Don't set selected path for folders - they should just expand/collapse
      return
    }

    void handleOpenFile({
      connectionId: payload.connectionId,
      path: payload.path,
      entry: entry,
      mode: 'preview',
      defaultTab: 'data'
    })
  }

  function handleRequestFileEntries(payload: { connectionId: string }) {
    // Do not force refresh on expand; force-refresh wipes expanded folder children,
    // which breaks deep search for S3/file trees and makes the UI feel "forgetful".
    void fileExplorerStore.loadEntries(payload.connectionId, false)
  }

  /**
   * Handle picking a file from the breadcrumb file picker.
   * Opens the selected file in the same pane.
   */
  async function handlePickFileFromBreadcrumb(
    paneId: PaneId,
    payload: { name: string; path: string }
  ) {
    const activeTab = paneTabsStore.getActiveTab(paneId)
    if (!activeTab || activeTab.tabType !== 'file') return

    const targetConnId = activeTab.connectionId

    // Find the file entry in the file explorer store
    const findEntry = (entries: FileSystemEntry[], targetPath: string): FileSystemEntry | null => {
      for (const e of entries) {
        if (e.path === targetPath) return e
        if (e.children) {
          const found = findEntry(e.children, targetPath)
          if (found) return found
        }
      }
      return null
    }

    const entries = fileExplorerStore.getEntries(targetConnId)
    const entry = findEntry(entries, payload.path)

    if (!entry) {
      console.warn('handlePickFileFromBreadcrumb: Could not find entry for path:', payload.path)
      return
    }

    // Open the file in the same pane
    void handleOpenFile({
      connectionId: targetConnId,
      path: payload.path,
      entry,
      mode: 'preview',
      defaultTab: 'data',
      openInRightSplit: paneId === 'right'
    })
  }

  return {
    handleOpenFile,
    handleFileSelect,
    handleRequestFileEntries,
    handlePickFileFromBreadcrumb
  }
}
