import { computed, onMounted, onUnmounted, ref, watch, type Ref } from 'vue'
import type { RouteLocationNormalizedLoaded, Router } from 'vue-router'
import type { FileSystemEntry } from '@/api/fileSystem'
import { getConnectionHost, getConnectionPort, getConnectionDatabase } from '@/utils/specBuilder'
import type { SQLRoutineMeta, SQLTableMeta, SQLTriggerMeta, SQLViewMeta } from '@/types/metadata'
import type { ShowDiagramPayload } from '@/types/diagram'
import type { PaneId, PaneTab } from '@/stores/paneTabs'
import { useExplorerViewStateStore } from '@/stores/explorerViewState'
import type SearchInput from '@/components/common/SearchInput.vue'
import type { useExplorerState } from '@/composables/useExplorerState'
import type { useSidebar } from '@/composables/useSidebar'
import type { useRecentConnections } from '@/composables/useRecentConnections'
import type { useCommonStore } from '@/stores/common'
import type { useConnectionsStore } from '@/stores/connections'
import type { usePaneTabsStore } from '@/stores/paneTabs'
import type { useExplorerNavigationStore } from '@/stores/explorerNavigation'
import type { useFileExplorerStore } from '@/stores/fileExplorer'
import { getConnectionTypeLabel } from '@/types/specs'

type ExplorerState = ReturnType<typeof useExplorerState>
type SidebarManager = ReturnType<typeof useSidebar>
type RecentConnectionsManager = ReturnType<typeof useRecentConnections>
type CommonStore = ReturnType<typeof useCommonStore>
type ConnectionsStore = ReturnType<typeof useConnectionsStore>
type PaneTabsStore = ReturnType<typeof usePaneTabsStore>
type NavigationStore = ReturnType<typeof useExplorerNavigationStore>
type FileExplorerStore = ReturnType<typeof useFileExplorerStore>

interface UseDatabaseExplorerControllerOptions {
  route: RouteLocationNormalizedLoaded
  router: Router
  explorerState: ExplorerState
  navigationStore: NavigationStore
  connectionsStore: ConnectionsStore
  paneTabsStore: PaneTabsStore
  fileExplorerStore: FileExplorerStore
  commonStore: CommonStore
  sidebar: SidebarManager
  searchInputRef: Ref<InstanceType<typeof SearchInput> | null>
  recentConnectionsManager: RecentConnectionsManager
  alwaysOpenNewTab: Ref<boolean>
}

export function useDatabaseExplorerController({
  route,
  router,
  explorerState,
  navigationStore,
  connectionsStore,
  paneTabsStore,
  fileExplorerStore,
  commonStore,
  sidebar,
  searchInputRef,
  recentConnectionsManager,
  alwaysOpenNewTab
}: UseDatabaseExplorerControllerOptions) {
  // Use the new view state store as the single source of truth
  const viewState = useExplorerViewStateStore()

  // URL normalization: keep Explorer URL minimal (/explorer, no query).
  // Tabs are persisted and multi-pane; encoding selection in URL is misleading.
  watch(
    () => route.query,
    (query) => {
      if (Object.keys(query).length > 0) {
        void router.replace({ path: '/explorer' })
      }
    },
    { immediate: true, deep: true }
  )

  // NOTE: The explorer URL is intentionally minimal.
  // Tab state is persisted and multi-pane; encoding selection in URL becomes stale/misleading.
  function pushExplorerRoute(_connectionId: string, _query: Record<string, string>) {
    const nextPath = '/explorer'
    if (route.path === nextPath && Object.keys(route.query).length === 0) return
    void router.push({ path: nextPath })
  }

  function pushRightPaneRoute(_connectionId: string, _query: Record<string, string>) {
    const nextPath = '/explorer'
    if (route.path === nextPath && Object.keys(route.query).length === 0) return
    void router.push({ path: nextPath })
  }

  const restoreToken = ref(0)
  // Skip tab restoration on initial load - let the persisted paneTabs state take precedence
  const isInitialLoad = ref(true)

  async function ensureLeftPaneMatchesViewState(payload: {
    connectionId: string
    database: string
    schema?: string | null
    type: 'table' | 'view' | 'trigger' | 'function' | 'procedure'
    name: string
  }) {
    const token = ++restoreToken.value

    const leftState = paneTabsStore.getPaneState('left')
    const schema = payload.schema || undefined
    const matchesSelection = (tab: PaneTab | null | undefined) =>
      Boolean(
        tab &&
          tab.tabType === 'database' &&
          tab.connectionId === payload.connectionId &&
          tab.database === payload.database &&
          tab.type === payload.type &&
          tab.name === payload.name &&
          (tab.schema || undefined) === (schema || undefined)
      )

    // If the matching tab already exists, just activate it.
    const existingIndex = leftState.tabs.findIndex((t) => matchesSelection(t))
    if (existingIndex >= 0) {
      paneTabsStore.activateTab('left', existingIndex)
      return
    }
    if (matchesSelection(paneTabsStore.getPreviewTab('left'))) {
      paneTabsStore.activatePreviewTab('left')
      return
    }

    // Otherwise restore by fetching metadata and creating a preview tab.
    let obj: SQLTableMeta | SQLViewMeta | SQLTriggerMeta | SQLRoutineMeta | undefined
    try {
      await navigationStore.ensureMetadata(payload.connectionId, payload.database)
      if (token !== restoreToken.value) return

      if (payload.type === 'table') {
        obj = navigationStore.findTableMeta(
          payload.connectionId,
          payload.database,
          payload.name,
          schema
        )
      } else if (payload.type === 'view') {
        obj = navigationStore.findViewMeta(
          payload.connectionId,
          payload.database,
          payload.name,
          schema
        )
      } else if (payload.type === 'trigger') {
        obj = navigationStore.findTriggerMeta(
          payload.connectionId,
          payload.database,
          payload.name,
          schema
        )
      } else {
        const { routineName, signature } = parseRoutineName(payload.name)
        obj = navigationStore.findRoutineMeta(
          payload.connectionId,
          payload.database,
          routineName,
          payload.type === 'function' ? 'function' : 'procedure',
          schema,
          signature
        )
      }
    } catch (error) {
      console.warn('Failed to restore left pane tab from URL/viewState:', error)
      return
    }

    if (!obj) {
      console.warn('Could not restore left pane tab (object not found):', payload)
      return
    }

    paneTabsStore.addTab(
      'left',
      {
        id: `${payload.connectionId}:${payload.database || ''}:${schema || ''}:${payload.name}:${payload.type || ''}`,
        connectionId: payload.connectionId,
        database: payload.database,
        schema: schema || undefined,
        name: payload.name,
        type: payload.type,
        tabType: 'database'
      },
      'preview'
    )
  }

  function ensureDiagramTabMatchesRoute(connectionId: string, database: string) {
    const leftState = paneTabsStore.getPaneState('left')
    const tabId = `diagram:${connectionId}:${database}`

    const existingIndex = leftState.tabs.findIndex((t) => t.tabType === 'diagram' && t.id === tabId)
    if (existingIndex >= 0) {
      paneTabsStore.activateTab('left', existingIndex)
      return
    }

    paneTabsStore.addTab(
      'left',
      {
        id: tabId,
        connectionId,
        database,
        name: `Diagram: ${database}`,
        tabType: 'diagram',
        objectKey: tabId
      },
      'pinned'
    )
  }

  function getConnectionTabName(connectionId: string): string {
    const conn = connectionsStore.connectionByID(connectionId) || undefined
    const label =
      conn?.name?.trim() ||
      getConnectionHost(conn) ||
      getConnectionTypeLabel(conn?.spec, conn?.type) ||
      'Connection'
    return label
  }

  function openConnectionDetailsTab(
    connectionId: string,
    mode: 'preview' | 'pinned',
    paneId: PaneId = 'left'
  ) {
    const tabId = `connection-details:${connectionId}`
    const tabName = getConnectionTabName(connectionId)

    if (mode === 'pinned') {
      const preview = paneTabsStore.getPreviewTab(paneId)
      if (preview?.tabType === 'connection-details' && preview.connectionId === connectionId) {
        paneTabsStore.pinPreviewTab(paneId)
        return
      }
    }

    paneTabsStore.addTab(
      paneId,
      {
        id: tabId,
        connectionId,
        name: tabName,
        tabType: 'connection-details'
      },
      mode
    )
  }

  function openDatabaseOverviewTab(
    connectionId: string,
    database: string,
    mode: 'preview' | 'pinned',
    paneId: PaneId = 'left'
  ) {
    const tabId = `db-overview:${connectionId}:${database}`
    const tabName = `DB: ${database}`

    if (mode === 'pinned') {
      const preview = paneTabsStore.getPreviewTab(paneId)
      if (
        preview?.tabType === 'database-overview' &&
        preview.connectionId === connectionId &&
        preview.database === database
      ) {
        paneTabsStore.pinPreviewTab(paneId)
        return
      }
    }

    paneTabsStore.addTab(
      paneId,
      {
        id: tabId,
        connectionId,
        database,
        name: tabName,
        tabType: 'database-overview'
      },
      mode
    )
  }

  // Loading state to prevent multiple file clicks during loading
  const isLoadingFile = ref(false)

  const showDeleteConfirm = ref(false)
  const pendingDeleteConnectionId = ref<string | null>(null)
  const pendingDeleteName = ref('')

  const currentFileEntries = computed<FileSystemEntry[]>(() => {
    const id = explorerState.currentConnectionId.value
    if (!id) return []
    return fileExplorerStore.getEntries(id)
  })

  // Tree selection is derived from store (single source of truth)
  // Use computed to maintain reactivity when store values change
  const treeSelection = computed(() => viewState.treeSelection)

  const deleteConnectionMessage = computed(() => {
    const label = pendingDeleteName.value || 'this connection'
    return `Delete ${label}? This cannot be undone.`
  })

  const hasPaneContent = computed(() => {
    return paneTabsStore.hasPaneContent('left') || paneTabsStore.hasPaneContent('right')
  })

  const lacksExplorerContent = computed(() => !hasPaneContent.value)

  function clearRightPaneQueryParams() {
    router.replace({ path: '/explorer' })
  }

  function handleOpenFromTree(payload: {
    connectionId: string
    database: string
    schema?: string
    type: 'table' | 'view' | 'trigger' | 'function' | 'procedure'
    name: string
    mode: 'preview' | 'pinned'
    defaultTab?: 'structure' | 'data'
    openInRightSplit?: boolean
    skipUrlUpdate?: boolean
  }) {
    const previousConnectionId = explorerState.currentConnectionId.value

    // If explicitly opening in the right split (context menu / URL restore / breadcrumb pick),
    // always target the right pane regardless of the currently active pane.
    const targetPane: PaneId = payload.openInRightSplit
      ? 'right'
      : paneTabsStore.activePane || 'left'

    // For right-pane opens, do NOT update the global (left) selection.
    // The viewState watcher restores the selected object into the left pane;
    // updating it here would cause the left pane to change even when the user
    // intended to open in the active/right pane.
    if (targetPane === 'left') {
      viewState.selectTable(
        payload.connectionId,
        payload.database,
        payload.type,
        payload.name,
        payload.schema
      )

      if (!payload.skipUrlUpdate) {
        const query: Record<string, string> = {
          db: payload.database,
          type: payload.type,
          name: payload.name
        }
        if (payload.schema) query.schema = payload.schema
        pushExplorerRoute(payload.connectionId, query)
      }
    } else {
      // Ensure we are in the tab view (not connection details / overview), but
      // avoid selecting a left-pane object.
      if (viewState.viewType !== 'table-data') {
        viewState.selectDatabaseTabView(payload.connectionId, payload.database)
      }

      if (!payload.skipUrlUpdate) {
        const query: Record<string, string> = {
          rightDb: payload.database,
          rightType: payload.type,
          rightName: payload.name,
          pane: 'right'
        }
        if (payload.schema) query.rightSchema = payload.schema
        pushRightPaneRoute(payload.connectionId, query)
      }
    }

    navigationStore.setActiveConnectionId(payload.connectionId)
    connectionsStore.setCurrentConnection(payload.connectionId)

    // Clear panel states and file selection - database selection will be synced by watcher
    explorerState.clearPanelStates()
    explorerState.clearFileSelection()

    if (payload.connectionId !== previousConnectionId && previousConnectionId) {
      fileExplorerStore.clearSelection(previousConnectionId)
    }

    paneTabsStore.addTab(
      targetPane,
      {
        id: `${payload.connectionId}:${payload.database || ''}:${payload.schema || ''}:${payload.name}:${payload.type || ''}`,
        connectionId: payload.connectionId,
        database: payload.database,
        schema: payload.schema,
        name: payload.name,
        type: payload.type,
        tabType: 'database'
      },
      alwaysOpenNewTab.value ? 'pinned' : payload.mode
    )

    // Opening in the right split should always make the right pane active,
    // even if other watchers also open/restore left-pane content in the same flow.
    if (payload.openInRightSplit) {
      paneTabsStore.setActivePane('right')
    }
  }

  async function handleOpenFile(payload: {
    connectionId: string
    path: string
    entry: FileSystemEntry
    mode: 'preview' | 'pinned'
    defaultTab?: 'structure' | 'data'
    openInRightSplit?: boolean
    skipUrlUpdate?: boolean
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

    // Only update the global (URL-synced) viewState when targeting the left pane.
    // Right pane file opens should not force left pane selection/focus.
    if (targetPane === 'left') {
      viewState.selectFile(payload.connectionId, payload.path)

      if (!payload.skipUrlUpdate) {
        pushExplorerRoute(payload.connectionId, { file: payload.path })
      }
    }

    navigationStore.setActiveConnectionId(payload.connectionId)
    connectionsStore.setCurrentConnection(payload.connectionId)

    // Clear panel states - file selection will be synced by watcher
    explorerState.clearPanelStates()

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

  function handleShowDiagram(payload: ShowDiagramPayload & { skipUrlUpdate?: boolean }) {
    navigationStore.setActiveConnectionId(payload.connectionId)

    explorerState.clearPanelStates()
    explorerState.setDatabaseSelection({ database: payload.database })

    // Set viewType to 'table-data' so showDatabaseOverview becomes false
    viewState.setViewType('table-data')

    if (!payload.skipUrlUpdate) {
      const query: Record<string, string> = {
        db: payload.database,
        diagram: 'true'
      }
      if (payload.focus) {
        query.focusType = payload.focus.type
        query.focusName = payload.focus.name
        if (payload.focus.schema) query.focusSchema = payload.focus.schema
      }
      pushExplorerRoute(payload.connectionId, query)
    }

    // Create a diagram tab
    const tabId = `diagram:${payload.connectionId}:${payload.database}`

    paneTabsStore.addTab(
      'left',
      {
        id: tabId,
        connectionId: payload.connectionId,
        database: payload.database,
        name: `Diagram: ${payload.database}`,
        tabType: 'diagram',
        objectKey: tabId
      },
      'pinned'
    )
  }

  function handleRefreshMetadata() {
    const connectionId = viewState.connectionId
    const database = viewState.databaseName
    if (connectionId && database) {
      void navigationStore.ensureMetadata(connectionId, database, true)
    }
  }

  /**
   * Preload metadata for all restored database tabs.
   * This ensures tabs display data immediately after page reload
   * instead of showing empty until the user clicks on a database.
   */
  function preloadMetadataForRestoredTabs() {
    // Collect all database tabs from both panes
    const allTabs: PaneTab[] = []
    for (const paneId of ['left', 'right'] as const) {
      const state = paneTabsStore.getPaneState(paneId)
      allTabs.push(...state.tabs)
    }

    // Extract unique connectionId + database pairs from database tabs
    const seen = new Set<string>()
    for (const tab of allTabs) {
      if (tab.tabType === 'database' && tab.connectionId && tab.database) {
        const key = `${tab.connectionId}:${tab.database}`
        if (!seen.has(key)) {
          seen.add(key)
          // Fire and forget - ensureMetadata handles deduplication internally
          void navigationStore.ensureMetadata(tab.connectionId, tab.database, false)
        }
      }
    }
  }

  function handleSelectConnection(payload: { connectionId: string; mode?: 'preview' | 'pinned' }) {
    const targetPane: PaneId = paneTabsStore.activePane || 'left'

    // Only update the global (URL-synced) viewState when targeting the left pane.
    // Right pane selection should not force the left pane to open/activate.
    if (targetPane === 'left') {
      viewState.selectConnection(payload.connectionId)
      pushExplorerRoute(payload.connectionId, { details: 'true' })
    }

    navigationStore.setActiveConnectionId(payload.connectionId)
    connectionsStore.setCurrentConnection(payload.connectionId)

    explorerState.clearPanelStates()
    explorerState.clearDatabaseSelection()

    fileExplorerStore.clearSelection(payload.connectionId)

    const effectiveMode: 'preview' | 'pinned' =
      payload.mode || (alwaysOpenNewTab.value ? 'pinned' : 'preview')
    openConnectionDetailsTab(payload.connectionId, effectiveMode, targetPane)

    if (fileExplorerStore.isFilesConnectionType(payload.connectionId)) {
      // Load entries if not already cached - don't force reload to preserve expanded folders
      void fileExplorerStore.loadEntries(payload.connectionId, false)
    }
  }

  function handleSelectDatabase(payload: {
    connectionId: string
    database: string
    mode?: 'preview' | 'pinned'
  }) {
    const targetPane: PaneId = paneTabsStore.activePane || 'left'

    // Only update the global (URL-synced) viewState when targeting the left pane.
    // Right pane selection should not force the left pane to open/activate.
    if (targetPane === 'left') {
      viewState.selectDatabase(payload.connectionId, payload.database)
      pushExplorerRoute(payload.connectionId, { db: payload.database })
    }

    navigationStore.setActiveConnectionId(payload.connectionId)
    connectionsStore.setCurrentConnection(payload.connectionId)

    explorerState.clearPanelStates()
    explorerState.setDatabaseSelection({ database: payload.database })

    const effectiveMode: 'preview' | 'pinned' =
      payload.mode || (alwaysOpenNewTab.value ? 'pinned' : 'preview')
    openDatabaseOverviewTab(payload.connectionId, payload.database, effectiveMode, targetPane)

    // Ensure metadata is available for breadcrumb/object panels.
    void navigationStore.ensureMetadata(payload.connectionId, payload.database, false)
  }

  async function handleFileSelect(payload: {
    connectionId: string
    path: string
    entry?: FileSystemEntry
    skipUrlUpdate?: boolean
  }) {
    // Prevent multiple clicks while loading
    if (isLoadingFile.value) {
      return
    }

    // Skip if this file is already selected (prevents double processing from URL watcher)
    const currentSelectedPath = fileExplorerStore.getSelectedPath(payload.connectionId)
    if (currentSelectedPath === payload.path) {
      return
    }

    navigationStore.setActiveConnectionId(payload.connectionId)

    // Find entry if not provided (e.g., from router/URL navigation)
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
      defaultTab: 'data',
      skipUrlUpdate: payload.skipUrlUpdate
    })
  }

  function handleRequestFileEntries(payload: { connectionId: string }) {
    // Do not force refresh on expand; force-refresh wipes expanded folder children,
    // which breaks deep search for S3/file trees and makes the UI feel "forgetful".
    void fileExplorerStore.loadEntries(payload.connectionId, false)
  }

  async function handlePickFromBreadcrumb(
    paneId: PaneId,
    o: {
      name: string
      type: 'table' | 'view' | 'trigger' | 'function' | 'procedure'
      schema?: string
    }
  ) {
    const activeTab = paneTabsStore.getActiveTab(paneId)
    if (!activeTab || activeTab.tabType !== 'database' || !activeTab.database) return

    const targetConnId = activeTab.connectionId
    const targetDb = activeTab.database

    try {
      await navigationStore.ensureMetadata(targetConnId, targetDb)
      let obj
      if (o.type === 'table') {
        obj = navigationStore.findTableMeta(targetConnId, targetDb, o.name, o.schema)
      } else if (o.type === 'view') {
        obj = navigationStore.findViewMeta(targetConnId, targetDb, o.name, o.schema)
      } else if (o.type === 'trigger') {
        obj = navigationStore.findTriggerMeta(targetConnId, targetDb, o.name, o.schema)
      } else {
        const { routineName, signature } = parseRoutineName(o.name)
        obj = navigationStore.findRoutineMeta(
          targetConnId,
          targetDb,
          routineName,
          o.type === 'function' ? 'function' : 'procedure',
          o.schema,
          signature
        )
      }
      if (!obj) return

      handleOpenFromTree({
        connectionId: targetConnId,
        database: targetDb,
        schema: o.schema,
        type: o.type,
        name: o.name,
        mode: 'preview',
        defaultTab: 'data',
        openInRightSplit: paneId === 'right'
      })
    } catch {
      // ignore open errors
    }
  }

  function parseRoutineName(label: string): { routineName: string; signature?: string } {
    const trimmed = label.trim()
    const openParen = trimmed.indexOf('(')
    if (openParen < 0) {
      return { routineName: trimmed }
    }
    const closeParen = trimmed.lastIndexOf(')')
    if (closeParen < openParen) {
      return { routineName: trimmed }
    }
    return {
      routineName: trimmed.slice(0, openParen).trim(),
      signature: trimmed.slice(openParen + 1, closeParen).trim()
    }
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

  const onAddConnection = () => router.push('/explorer/add')

  const onEditConnection = (connectionId?: string) => {
    const id = connectionId || explorerState.activeConnectionId.value
    if (!id) return
    router.push(`/explorer/edit/${id}`)
  }

  const onEditConnectionJson = (connectionId?: string) => {
    const id = connectionId || explorerState.activeConnectionId.value
    if (!id) return
    router.push(`/explorer/edit-json/${id}`)
  }

  const onDeleteConnection = (connectionId?: string) => {
    const id = connectionId || explorerState.activeConnectionId.value
    if (!id) return
    const conn = connectionsStore.connections.find((c) => c.id === id)
    pendingDeleteConnectionId.value = id
    pendingDeleteName.value =
      conn?.name || (conn ? getConnectionHost(conn) : '') || 'this connection'
    showDeleteConfirm.value = true
  }

  async function confirmDeleteConnection() {
    if (!pendingDeleteConnectionId.value) return
    try {
      await connectionsStore.deleteConnection(pendingDeleteConnectionId.value)
      recentConnectionsManager.removeFromRecent(pendingDeleteConnectionId.value)
      router.push('/explorer')
    } catch (e) {
      console.error('Failed to delete connection from Explorer:', e)
    } finally {
      pendingDeleteConnectionId.value = null
      pendingDeleteName.value = ''
      showDeleteConfirm.value = false
    }
  }

  function cancelDeleteConnection() {
    pendingDeleteConnectionId.value = null
    pendingDeleteName.value = ''
    showDeleteConfirm.value = false
  }

  async function onCloneConnection(connectionId?: string) {
    const id = connectionId || explorerState.activeConnectionId.value
    if (!id) return
    try {
      connectionsStore.setCurrentConnection(id)
      await connectionsStore.cloneConnection(id)
      const newId = connectionsStore.currentConnection?.id
      await connectionsStore.refreshConnections()
      if (newId) router.push(`/explorer/edit/${newId}`)
    } catch (e) {
      console.error('Failed to clone connection from Explorer:', e)
    }
  }

  function handleKeyboardShortcut(e: KeyboardEvent) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
      e.preventDefault()
      sidebar.toggleSidebar()
    }

    // Check if user is typing in an input field or editor
    const target = e.target as HTMLElement
    const isInputField =
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.isContentEditable ||
      target.closest('.monaco-editor') !== null

    if (e.key === '/' && !isInputField) {
      e.preventDefault()
      searchInputRef.value?.focus()
    }
  }

  watch(
    lacksExplorerContent,
    (isEmpty) => {
      if (isEmpty && !sidebar.sidebarVisible.value) {
        sidebar.sidebarVisible.value = true
      }
    },
    { immediate: true }
  )

  watch(explorerState.currentConnectionId, async (newId) => {
    navigationStore.setActiveConnectionId(newId)

    if (newId && explorerState.currentConnection.value) {
      const conn = explorerState.currentConnection.value
      recentConnectionsManager.addToRecent({
        id: conn.id,
        name: conn.name,
        type: getConnectionTypeLabel(conn.spec, conn.type) || '',
        host: getConnectionHost(conn),
        port: getConnectionPort(conn)?.toString(),
        defaultDatabase: getConnectionDatabase(conn),
        cloud_provider: conn.cloud_provider || ''
      })
      if (fileExplorerStore.isFilesConnectionType(newId)) {
        // Don't force reload - preserves existing entries and prevents search results from disappearing
        // if the reload fails. Force reload wipes expanded folder children and breaks deep search.
        await fileExplorerStore.loadEntries(newId, false)
        const fileParam = route.query.file as string
        if (fileParam && currentFileEntries.value.length > 0) {
          // handleFileSelect will find the entry if needed (runs async)
          void handleFileSelect({ connectionId: newId, path: fileParam })
        }
      }
    }
  })

  watch(
    () =>
      [
        route.query.rightDb,
        route.query.rightType,
        route.query.rightName,
        route.query.pane
      ] as const,
    async ([rightDb, rightType, rightName, activePane]) => {
      if (
        rightDb &&
        rightType &&
        rightName &&
        explorerState.currentConnectionId.value &&
        (rightType === 'table' ||
          rightType === 'view' ||
          rightType === 'trigger' ||
          rightType === 'function' ||
          rightType === 'procedure')
      ) {
        const rightSchema = route.query.rightSchema as string | undefined

        const rightState = paneTabsStore.getPaneState('right')
        const matchesSelection = (tab: PaneTab | null | undefined) =>
          Boolean(
            tab &&
              tab.tabType === 'database' &&
              tab.connectionId === explorerState.currentConnectionId.value &&
              tab.database === rightDb &&
              tab.type === rightType &&
              tab.name === rightName &&
              (tab.schema || undefined) === (rightSchema || undefined)
          )

        const hasMatchingTab = rightState.tabs.some((tab) => matchesSelection(tab))

        if (!hasMatchingTab) {
          let obj:
            | SQLTableMeta
            | SQLViewMeta
            | SQLTriggerMeta
            | SQLRoutineMeta
            | undefined
          try {
            await navigationStore.ensureMetadata(
              explorerState.currentConnectionId.value,
              rightDb as string
            )
            if (rightType === 'table') {
              obj = navigationStore.findTableMeta(
                explorerState.currentConnectionId.value,
                rightDb as string,
                rightName as string,
                rightSchema
              )
            } else if (rightType === 'view') {
              obj = navigationStore.findViewMeta(
                explorerState.currentConnectionId.value,
                rightDb as string,
                rightName as string,
                rightSchema
              )
            } else if (rightType === 'trigger') {
              obj = navigationStore.findTriggerMeta(
                explorerState.currentConnectionId.value,
                rightDb as string,
                rightName as string,
                rightSchema
              )
            } else {
              const { routineName, signature } = parseRoutineName(rightName as string)
              obj = navigationStore.findRoutineMeta(
                explorerState.currentConnectionId.value,
                rightDb as string,
                routineName,
                rightType === 'function' ? 'function' : 'procedure',
                rightSchema,
                signature
              )
            }
          } catch (error) {
            console.warn('Failed to restore right pane tab from URL:', error)
            clearRightPaneQueryParams()
            return
          }

          if (obj) {
            handleOpenFromTree({
              connectionId: explorerState.currentConnectionId.value,
              database: rightDb as string,
              schema: rightSchema,
              type: rightType as 'table' | 'view' | 'trigger' | 'function' | 'procedure',
              name: rightName as string,
              mode: 'preview',
              openInRightSplit: true,
              skipUrlUpdate: true
            })
          } else {
            clearRightPaneQueryParams()
          }
        }
      }

      if (activePane === 'right' || activePane === 'left') {
        paneTabsStore.setActivePane(activePane)
      }
    },
    { immediate: false }
  )

  watch(
    () => commonStore.isBackendConnected,
    async (isConnected) => {
      if (isConnected) {
        try {
          await connectionsStore.refreshConnections()
        } catch (error) {
          console.error('Failed to load connections when backend connected:', error)
        }
      }
    }
  )

  // Watch viewState changes to sync with explorerState and fetch data
  // This handles URL sync updates and store changes
  watch(
    () => ({
      viewType: viewState.viewType,
      connectionId: viewState.connectionId,
      databaseName: viewState.databaseName,
      schemaName: viewState.schemaName,
      objectType: viewState.objectType,
      objectName: viewState.objectName,
      filePath: viewState.filePath
    }),
    (state) => {
      if (!state.connectionId) return

      // Sync connection
      if (state.connectionId !== explorerState.currentConnectionId.value) {
        navigationStore.setActiveConnectionId(state.connectionId)
        connectionsStore.setCurrentConnection(state.connectionId)
      }

      // Sync database selection
      if (state.viewType === 'database-overview' || state.viewType === 'table-data') {
        if (state.databaseName) {
          explorerState.setDatabaseSelection({
            database: state.databaseName,
            schema: state.schemaName || undefined,
            type: state.objectType || undefined,
            name: state.objectName || undefined
          })

          // Ensure metadata is available for breadcrumb/object panels.
          void navigationStore.ensureMetadata(state.connectionId, state.databaseName, false)
        }
      } else if (state.viewType === 'connection-details') {
        explorerState.clearDatabaseSelection()
      }

      // Skip opening tabs on initial load to let persisted paneTabs state take precedence
      if (!isInitialLoad.value && state.viewType === 'connection-details') {
        const effectiveMode: 'preview' | 'pinned' = alwaysOpenNewTab.value ? 'pinned' : 'preview'
        openConnectionDetailsTab(state.connectionId, effectiveMode, 'left')
      }

      if (!isInitialLoad.value && state.viewType === 'database-overview' && state.databaseName) {
        const effectiveMode: 'preview' | 'pinned' = alwaysOpenNewTab.value ? 'pinned' : 'preview'
        openDatabaseOverviewTab(state.connectionId, state.databaseName, effectiveMode, 'left')
      }

      // Ensure the visible content matches URL/viewState when navigating with browser back/forward.
      // Skip on initial load to let persisted paneTabs state take precedence.
      if (
        !isInitialLoad.value &&
        state.viewType === 'table-data' &&
        state.databaseName &&
        state.objectType &&
        state.objectName
      ) {
        void ensureLeftPaneMatchesViewState({
          connectionId: state.connectionId,
          database: state.databaseName,
          schema: state.schemaName,
          type: state.objectType,
          name: state.objectName
        })
      }

      // Restore/activate diagram tab from URL (skip on initial load)
      if (
        !isInitialLoad.value &&
        state.viewType === 'table-data' &&
        state.databaseName &&
        route.query.diagram === 'true'
      ) {
        ensureDiagramTabMatchesRoute(state.connectionId, state.databaseName)

        // Focus is applied by DiagramTab (route-aware) to avoid global schema state conflicts.
      }

      // Mark initial load as complete after first watcher run
      if (isInitialLoad.value) {
        isInitialLoad.value = false
      }

      // Sync file selection (and content) when URL/viewState changes
      if (state.viewType === 'file-browser' && state.filePath) {
        const targetConnectionId = state.connectionId
        const targetFilePath = state.filePath

        if (targetConnectionId && fileExplorerStore.isFilesConnectionType(targetConnectionId)) {
          void (async () => {
            await fileExplorerStore.loadEntries(targetConnectionId)
            if (!targetFilePath) return

            // Open/activate the tab for this file so the right-side content matches the URL
            await handleFileSelect({
              connectionId: targetConnectionId,
              path: targetFilePath,
              skipUrlUpdate: true
            })
          })()
        }
      }
    },
    { immediate: true, deep: true }
  )

  onMounted(async () => {
    commonStore.setCurrentPage('Data Explorer')
    sidebar.initializeSidebar()

    if (commonStore.isBackendConnected) {
      try {
        await connectionsStore.refreshConnections()
      } catch (error) {
        console.error('Failed to load connections on explorer mount:', error)
      }

      // Preload metadata for all restored database tabs
      // This ensures tabs show data immediately after page reload
      preloadMetadataForRestoredTabs()
    }

    const focusConnIdFromStream = window.sessionStorage.getItem('explorerFocusConnectionId')
    if (focusConnIdFromStream) {
      // Navigation from stream config - select the connection
      viewState.selectConnection(focusConnIdFromStream)
      window.sessionStorage.removeItem('explorerFocusConnectionId')
    }

    window.addEventListener('keydown', handleKeyboardShortcut)

    if (
      explorerState.currentConnection.value &&
      !recentConnectionsManager.recentConnections.value.find(
        (c) => c.id === explorerState.currentConnectionId.value
      )
    ) {
      const conn = explorerState.currentConnection.value
      recentConnectionsManager.addToRecent({
        id: conn.id,
        name: conn.name,
        type: getConnectionTypeLabel(conn.spec, conn.type) || '',
        host: getConnectionHost(conn),
        port: getConnectionPort(conn)?.toString(),
        defaultDatabase: getConnectionDatabase(conn),
        cloud_provider: conn.cloud_provider || ''
      })
    }

    // URL query params are intentionally not used as a source of truth.

    // If no view state at all, default to connection details for current connection
    if (!viewState.viewType && explorerState.currentConnectionId.value) {
      viewState.selectConnection(explorerState.currentConnectionId.value)
    }
  })

  onUnmounted(() => {
    window.removeEventListener('keydown', handleKeyboardShortcut)
  })

  return {
    showDeleteConfirm,
    pendingDeleteName,
    deleteConnectionMessage,
    currentFileEntries,
    treeSelection,
    isLoadingFile,
    handleOpenFromTree,
    handleOpenFile,
    handleShowDiagram,
    handleRefreshMetadata,
    handleSelectConnection,
    handleSelectDatabase,
    handleFileSelect,
    handleRequestFileEntries,
    handlePickFromBreadcrumb,
    handlePickFileFromBreadcrumb,
    onAddConnection,
    onEditConnection,
    onEditConnectionJson,
    onDeleteConnection,
    confirmDeleteConnection,
    cancelDeleteConnection,
    onCloneConnection
  }
}
