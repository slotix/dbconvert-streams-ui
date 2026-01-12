import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { SQLRoutineMeta, SQLSequenceMeta, SQLTableMeta, SQLViewMeta } from '@/types/metadata'
import type { FileSystemEntry } from '@/api/fileSystem'
import type { FileMetadata } from '@/types/files'
import { useObjectTabStateStore } from '@/stores/objectTabState'

/**
 * Pane identifier type - extensible to support multiple panes
 * Can add 'middle', 'bottom', etc. in the future
 */
export type PaneId = 'left' | 'right'

/**
 * Tab representation for any pane
 */
export type PaneTab = {
  id: string
  connectionId: string
  name: string
  tabType:
    | 'database'
    | 'file'
    | 'sql-console'
    | 'file-console'
    | 'diagram'
    | 'connection-details'
    | 'database-overview'
  pinned: boolean
  objectKey?: string

  // Database-specific properties
  database?: string
  schema?: string
  type?: 'table' | 'view' | 'function' | 'procedure' | 'sequence'
  meta?: SQLTableMeta | SQLViewMeta | SQLRoutineMeta | SQLSequenceMeta

  // SQL Console specific properties
  sqlScope?: 'database' | 'connection' // database = pre-sets USE db; connection = raw

  // File-specific properties
  filePath?: string
  fileEntry?: FileSystemEntry
  fileMetadata?: FileMetadata | null
  fileType?: string

  // File console specific properties
  fileConnectionType?: 'files' | 's3'
  basePath?: string
}

/**
 * State for a single pane
 */
export interface PaneState {
  /**
   * Ordered list of tabs for the pane.
   * Includes both kept (pinned=true) and preview (pinned=false) tabs.
   */
  tabs: PaneTab[]
  /** Index of the currently active tab in `tabs` */
  activeIndex: number | null
  /** Index of the preview tab in `tabs` (null if none) */
  previewIndex: number | null
}

/**
 * Entry in closed tab history for "Reopen Closed Tab" feature
 */
export interface ClosedTabHistoryItem {
  tab: PaneTab
  paneId: PaneId
  closedAt: number
}

/**
 * Initial empty pane state
 */
function createEmptyPaneState(): PaneState {
  return {
    tabs: [],
    activeIndex: null,
    previewIndex: null
  }
}

const STORAGE_KEY = 'explorer.paneTabs'
const MAX_CLOSED_TABS_HISTORY = 20

type PersistedPaneTabsState = {
  panes: Record<PaneId, PaneState>
  activePane: PaneId
  visiblePanes: PaneId[]
  closedTabsHistory?: ClosedTabHistoryItem[]
}

function buildObjectKey(paneId: PaneId, tab: PaneTab): string | null {
  if (tab.tabType === 'database' && tab.database && tab.name) {
    const schema = tab.schema || 'default'
    const kind = tab.type || 'table'
    return `${paneId}:db-${tab.database}-${schema}-${kind}-${tab.name}`
  }
  if (tab.tabType === 'file' && tab.filePath) {
    return `${paneId}:file-${tab.filePath}`
  }
  if (tab.tabType === 'sql-console') {
    const dbPart = tab.database || '*'
    return `${paneId}:sql-${tab.connectionId}-${dbPart}`
  }
  if (tab.tabType === 'diagram' && tab.database) {
    return `${paneId}:diagram-${tab.connectionId}-${tab.database}`
  }
  return null
}

function hasBrowserStorage(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

function loadPersistedPaneTabsState(): PersistedPaneTabsState | null {
  if (!hasBrowserStorage()) {
    return null
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as PersistedPaneTabsState
    if (parsed && parsed.panes) {
      return parsed
    }
  } catch (error) {
    console.warn('Failed to load pane tabs state from localStorage:', error)
  }

  return null
}

function persistPaneTabsState(state: PersistedPaneTabsState) {
  if (!hasBrowserStorage()) {
    return
  }

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch (error) {
    console.warn('Failed to persist pane tabs state to localStorage:', error)
  }
}

/**
 * Pinia store for managing multiple independent panes with tabs
 * Each pane (left, right, future: middle, etc.) has its own tab state
 */
export const usePaneTabsStore = defineStore('paneTabs', () => {
  // Core state
  const panes = ref<Map<PaneId, PaneState>>(new Map())
  const activePane = ref<PaneId>('left')
  const visiblePanes = ref<Set<PaneId>>(new Set<PaneId>(['left'])) // Left always visible by default
  const closedTabsHistory = ref<ClosedTabHistoryItem[]>([])
  const objectTabStateStore = useObjectTabStateStore()

  // Initialize panes
  panes.value.set('left', createEmptyPaneState())
  panes.value.set('right', createEmptyPaneState())

  const getPaneState = (paneId: PaneId): PaneState => {
    const state = panes.value.get(paneId)
    if (!state) {
      // Initialize if doesn't exist
      const newState = createEmptyPaneState()
      panes.value.set(paneId, newState)
      return newState
    }
    return state
  }

  const ensureObjectKey = (paneId: PaneId, tab?: PaneTab | null): string | null => {
    if (!tab) return null
    if (tab.objectKey) return tab.objectKey
    const key = buildObjectKey(paneId, tab)
    if (key) {
      tab.objectKey = key
    }
    return tab.objectKey || null
  }

  const clearObjectState = (paneId: PaneId, tab?: PaneTab | null) => {
    const key = ensureObjectKey(paneId, tab)
    if (key) {
      objectTabStateStore.clearTabState(key)
    }
  }

  const clampIndex = (index: number, length: number): number => {
    if (length <= 0) return 0
    return Math.min(Math.max(0, index), length - 1)
  }

  const getPreviewTab = (paneId: PaneId): PaneTab | null => {
    const state = getPaneState(paneId)
    if (state.previewIndex === null) return null
    return state.tabs[state.previewIndex] || null
  }

  const isPreviewIndex = (state: PaneState, index: number): boolean => {
    return state.previewIndex !== null && state.previewIndex === index
  }

  const hydratePaneState = (paneId: PaneId, savedState?: Partial<PaneState>): PaneState => {
    const base = createEmptyPaneState()
    const state: PaneState = {
      ...base,
      ...(savedState || {})
    } as PaneState

    state.tabs = (state.tabs || []).map((tab) => {
      const hydratedTab = { ...tab }
      if (hydratedTab.tabType === 'database') {
        delete hydratedTab.meta
      }
      ensureObjectKey(paneId, hydratedTab)
      return hydratedTab
    })

    if (state.previewIndex !== null) {
      if (!state.tabs[state.previewIndex]) {
        state.previewIndex = null
      } else {
        state.tabs[state.previewIndex] = { ...state.tabs[state.previewIndex], pinned: false }
      }
    }

    if (state.activeIndex !== null) {
      if (!state.tabs[state.activeIndex]) {
        state.activeIndex = state.tabs.length ? 0 : null
      }
    }

    return state
  }

  function persistState() {
    persistPaneTabsState({
      panes: {
        left: getPaneState('left'),
        right: getPaneState('right')
      },
      activePane: activePane.value,
      visiblePanes: Array.from(visiblePanes.value),
      closedTabsHistory: closedTabsHistory.value
    })
  }

  function restoreFromStorage() {
    const savedState = loadPersistedPaneTabsState()
    if (!savedState) return

    const leftState = hydratePaneState('left', savedState.panes?.left)
    const rightState = hydratePaneState('right', savedState.panes?.right)

    panes.value.set('left', leftState)
    panes.value.set('right', rightState)

    activePane.value = savedState.activePane || 'left'
    const visible: PaneId[] =
      savedState.visiblePanes && savedState.visiblePanes.length > 0
        ? savedState.visiblePanes
        : ['left']
    visiblePanes.value = new Set<PaneId>(visible)

    // Restore closed tabs history
    if (savedState.closedTabsHistory && Array.isArray(savedState.closedTabsHistory)) {
      closedTabsHistory.value = savedState.closedTabsHistory.slice(0, MAX_CLOSED_TABS_HISTORY)
    }

    // Persist immediately to remove any stale cached fields (e.g., tab.meta).
    persistState()
  }

  restoreFromStorage()

  const hasPaneContent = (paneId: PaneId): boolean => {
    const state = getPaneState(paneId)
    return state.tabs.length > 0
  }

  const isPaneVisible = (paneId: PaneId): boolean => {
    return visiblePanes.value.has(paneId)
  }

  const getActiveTab = (paneId: PaneId): PaneTab | null => {
    const state = getPaneState(paneId)
    if (state.activeIndex !== null && state.tabs[state.activeIndex]) {
      return state.tabs[state.activeIndex]
    }
    return null
  }

  const isActivePane = (paneId: PaneId): boolean => {
    return activePane.value === paneId
  }

  // Computed
  const leftPaneState = computed(() => getPaneState('left'))
  const rightPaneState = computed(() => getPaneState('right'))
  const hasRightPaneContent = computed(() => hasPaneContent('right'))
  const isRightPaneVisible = computed(() => isPaneVisible('right'))
  const canReopenTab = computed(() => closedTabsHistory.value.length > 0)

  // Tab key generation for deduplication
  function generateTabKey(tab: PaneTab): string {
    if (tab.tabType === 'file') {
      return `file:${tab.filePath}`
    }
    if (tab.tabType === 'sql-console') {
      const dbPart = tab.database || '*'
      return `sql:${tab.connectionId}:${dbPart}`
    }
    if (tab.tabType === 'diagram') {
      return `diagram:${tab.connectionId}:${tab.database || ''}`
    }
    if (tab.tabType === 'connection-details') {
      return `connection:${tab.connectionId}`
    }
    if (tab.tabType === 'database-overview') {
      return `db-overview:${tab.connectionId}:${tab.database || ''}`
    }
    return `db:${tab.connectionId}:${tab.database || ''}:${tab.schema || ''}:${tab.name || ''}:${tab.type || ''}`
  }

  // Actions

  /**
   * Set which pane is currently active
   */
  function setActivePane(paneId: PaneId) {
    activePane.value = paneId
    persistState()
  }

  /**
   * Show a pane (make it visible)
   */
  function showPane(paneId: PaneId) {
    visiblePanes.value.add(paneId)
    persistState()
  }

  /**
   * Hide a pane (make it invisible)
   * Note: Cannot hide left pane - it's always visible
   */
  function hidePane(paneId: PaneId) {
    if (paneId === 'left') {
      console.warn('Cannot hide left pane - it is always visible')
      return
    }
    visiblePanes.value.delete(paneId)
    // If hiding active pane, switch to left
    if (activePane.value === paneId) {
      activePane.value = 'left'
    }
    persistState()
  }

  /**
   * Add or activate a tab in the specified pane
   * If tab already exists, activate it. Otherwise add as new tab.
   */
  function addTab(
    paneId: PaneId,
    tab: Omit<PaneTab, 'pinned'>,
    mode: 'preview' | 'pinned' = 'preview',
    options?: { focus?: boolean }
  ) {
    const state = getPaneState(paneId)
    const fullTab: PaneTab = { ...tab, pinned: mode === 'pinned' }
    ensureObjectKey(paneId, fullTab)
    const key = generateTabKey(fullTab)

    const focus = options?.focus !== undefined ? options.focus : true

    // Show pane if not visible
    showPane(paneId)

    // If tab already exists in this pane, reveal it (no duplicates).
    const existingIndex = state.tabs.findIndex((t) => generateTabKey(t) === key)
    if (existingIndex >= 0) {
      // If we are "pinning" the preview tab, convert it to kept in place.
      if (
        mode === 'pinned' &&
        state.previewIndex !== null &&
        existingIndex === state.previewIndex
      ) {
        state.tabs[existingIndex] = { ...state.tabs[existingIndex], pinned: true }
        state.previewIndex = null
      }
      state.activeIndex = existingIndex
      if (focus) setActivePane(paneId)
      persistState()
      return
    }

    const safeActiveIndex =
      state.activeIndex !== null && state.activeIndex >= 0
        ? clampIndex(state.activeIndex, state.tabs.length)
        : null

    if (mode === 'pinned') {
      // Insert adjacent to current active tab (VS Code style).
      const insertIndex = safeActiveIndex !== null ? safeActiveIndex + 1 : state.tabs.length
      state.tabs.splice(insertIndex, 0, { ...fullTab, pinned: true })
      if (state.previewIndex !== null && insertIndex <= state.previewIndex) {
        state.previewIndex += 1
      }
      state.activeIndex = insertIndex
    } else {
      // Preview open.
      if (state.previewIndex !== null && state.tabs[state.previewIndex]) {
        const prev = state.tabs[state.previewIndex]
        // If we're replacing a different preview, clear the old tab's stored object state.
        if (generateTabKey(prev) !== key) {
          clearObjectState(paneId, prev)
        }
        state.tabs[state.previewIndex] = { ...fullTab, pinned: false }
        state.activeIndex = state.previewIndex
      } else {
        // Create preview tab.
        const insertIndex = safeActiveIndex !== null ? safeActiveIndex + 1 : state.tabs.length
        state.tabs.splice(insertIndex, 0, { ...fullTab, pinned: false })
        state.previewIndex = insertIndex
        state.activeIndex = insertIndex
      }
    }

    if (focus) {
      setActivePane(paneId)
    }
    persistState()
  }

  /**
   * Set preview tab for a pane (single-click behavior)
   */
  function setPreviewTab(paneId: PaneId, tab: PaneTab | null, options?: { focus?: boolean }) {
    const focus = options?.focus !== undefined ? options.focus : true

    if (!tab) {
      closePreviewTab(paneId)
      return
    }

    // Delegate to addTab to preserve dedupe + stable replacement semantics.
    addTab(paneId, tab, 'preview', { focus })
  }

  /**
   * Pin the current preview tab (convert to pinned)
   */
  function pinPreviewTab(paneId: PaneId) {
    const state = getPaneState(paneId)
    if (state.previewIndex === null) return
    const tab = state.tabs[state.previewIndex]
    if (!tab) {
      state.previewIndex = null
      persistState()
      return
    }

    // Keep in place.
    state.tabs[state.previewIndex] = { ...tab, pinned: true }
    state.activeIndex = state.previewIndex
    state.previewIndex = null
    persistState()
  }

  /**
   * Convert a preview tab to a kept tab by index (no-op if not preview).
   * Used when a preview tab is moved via drag/drop: dropping implies keep.
   */
  function keepTab(paneId: PaneId, index: number) {
    const state = getPaneState(paneId)
    if (state.previewIndex === null) return
    if (index !== state.previewIndex) return
    const tab = state.tabs[index]
    if (!tab) return
    state.tabs[index] = { ...tab, pinned: true }
    state.previewIndex = null
    persistState()
  }

  /**
   * Push a tab to closed history for "Reopen Closed Tab" feature
   */
  function pushToClosedHistory(paneId: PaneId, tab: PaneTab) {
    // Clone tab without volatile properties
    const tabCopy = { ...tab }
    delete tabCopy.meta

    closedTabsHistory.value.unshift({
      tab: tabCopy,
      paneId,
      closedAt: Date.now()
    })

    // Trim to max size
    if (closedTabsHistory.value.length > MAX_CLOSED_TABS_HISTORY) {
      closedTabsHistory.value = closedTabsHistory.value.slice(0, MAX_CLOSED_TABS_HISTORY)
    }
  }

  /**
   * Close a pinned tab by index
   */
  function closeTab(paneId: PaneId, index: number) {
    const state = getPaneState(paneId)
    if (index < 0 || index >= state.tabs.length) return

    const wasActive = state.activeIndex === index
    const wasPreview = isPreviewIndex(state, index)
    const [removedTab] = state.tabs.splice(index, 1)

    // Save to history before clearing state
    pushToClosedHistory(paneId, removedTab)
    clearObjectState(paneId, removedTab)

    if (wasPreview) {
      state.previewIndex = null
    } else if (state.previewIndex !== null && state.previewIndex > index) {
      state.previewIndex -= 1
    }

    if (!state.tabs.length) {
      state.activeIndex = null
      if (paneId !== 'left') {
        hidePane(paneId)
      }
      persistState()
      return
    }

    if (wasActive) {
      const newIndex = Math.min(index, state.tabs.length - 1)
      state.activeIndex = newIndex
    } else if (state.activeIndex !== null && state.activeIndex > index) {
      state.activeIndex -= 1
    }
    persistState()
  }

  /**
   * Close all tabs except the one at keepIndex
   */
  function closeOtherTabs(paneId: PaneId, keepIndex: number) {
    const state = getPaneState(paneId)
    if (keepIndex < 0 || keepIndex >= state.tabs.length) return

    const keepTabValue = state.tabs[keepIndex]
    state.tabs.forEach((tab, idx) => {
      if (idx !== keepIndex) {
        pushToClosedHistory(paneId, tab)
        clearObjectState(paneId, tab)
      }
    })
    state.tabs = [{ ...keepTabValue, pinned: true }]
    state.activeIndex = 0
    state.previewIndex = null
    persistState()
  }

  /**
   * Close all pinned tabs in a pane
   */
  function closeAllTabs(paneId: PaneId) {
    const state = getPaneState(paneId)

    state.tabs.forEach((tab) => {
      pushToClosedHistory(paneId, tab)
      clearObjectState(paneId, tab)
    })
    state.tabs = []
    state.previewIndex = null
    state.activeIndex = null

    // If not left pane, hide it
    if (paneId !== 'left') {
      hidePane(paneId)
    }
    persistState()
  }

  /**
   * Close preview tab
   */
  function closePreviewTab(paneId: PaneId) {
    const state = getPaneState(paneId)
    if (state.previewIndex === null) return
    const idx = state.previewIndex
    const tab = state.tabs[idx]
    if (tab) {
      pushToClosedHistory(paneId, tab)
      clearObjectState(paneId, tab)
    }
    state.tabs.splice(idx, 1)
    state.previewIndex = null
    if (state.activeIndex !== null) {
      if (state.activeIndex === idx) {
        state.activeIndex = state.tabs.length ? clampIndex(idx, state.tabs.length) : null
      } else if (state.activeIndex > idx) {
        state.activeIndex -= 1
      }
    }
    if (!state.tabs.length && paneId !== 'left') {
      hidePane(paneId)
    }
    persistState()
  }

  /**
   * Reorder a pinned tab within the same pane.
   * Moves tab from fromIndex to toIndex.
   */
  function reorderTab(paneId: PaneId, fromIndex: number, toIndex: number) {
    if (fromIndex === toIndex) return

    const state = getPaneState(paneId)
    if (fromIndex < 0 || fromIndex >= state.tabs.length) return
    if (toIndex < 0 || toIndex > state.tabs.length) return

    // Remove the tab from its current position
    const [movedTab] = state.tabs.splice(fromIndex, 1)

    // Adjust toIndex if we removed an element before it
    const adjustedToIndex = fromIndex < toIndex ? toIndex - 1 : toIndex

    // Insert at the new position
    state.tabs.splice(adjustedToIndex, 0, movedTab)

    // Update active index if it was affected
    if (state.activeIndex !== null) {
      if (state.activeIndex === fromIndex) {
        // The moved tab was active, update to its new position
        state.activeIndex = adjustedToIndex
      } else if (fromIndex < state.activeIndex && adjustedToIndex >= state.activeIndex) {
        // Tab moved from before active to after/at active
        state.activeIndex--
      } else if (fromIndex > state.activeIndex && adjustedToIndex <= state.activeIndex) {
        // Tab moved from after active to before/at active
        state.activeIndex++
      }
    }

    if (state.previewIndex !== null) {
      if (state.previewIndex === fromIndex) {
        state.previewIndex = adjustedToIndex
      } else if (fromIndex < state.previewIndex && adjustedToIndex >= state.previewIndex) {
        state.previewIndex--
      } else if (fromIndex > state.previewIndex && adjustedToIndex <= state.previewIndex) {
        state.previewIndex++
      }
    }

    persistState()
  }

  /**
   * Move a pinned tab from one pane to another.
   * - Pinned-only (does not touch preview tabs)
   * - If destination already has the same tab (same generateTabKey),
   *   activate destination and close source (no duplicates)
   * - Migrates per-tab UI state by moving objectTabStateStore key
   * @param toIndex - optional target index in destination pane (defaults to end)
   */
  function moveTab(
    fromPaneId: PaneId,
    fromIndex: number,
    toPaneId: PaneId,
    toIndex?: number,
    options?: { focus?: boolean }
  ) {
    if (fromPaneId === toPaneId) return

    const focus = options?.focus !== undefined ? options.focus : true

    const fromState = getPaneState(fromPaneId)
    const toState = getPaneState(toPaneId)
    if (fromIndex < 0 || fromIndex >= fromState.tabs.length) return

    const sourceTab = fromState.tabs[fromIndex]
    const tabKey = generateTabKey(sourceTab)

    const existingDestIndex = toState.tabs.findIndex((t) => generateTabKey(t) === tabKey)
    if (existingDestIndex >= 0) {
      // Destination already has this tab; just activate it and close the source.
      toState.activeIndex = existingDestIndex
      if (focus) setActivePane(toPaneId)

      // Remove source without history; the content still exists.
      const wasSourcePreview = isPreviewIndex(fromState, fromIndex)
      const [removedTab] = fromState.tabs.splice(fromIndex, 1)
      clearObjectState(fromPaneId, removedTab)
      if (wasSourcePreview) {
        fromState.previewIndex = null
      } else if (fromState.previewIndex !== null && fromState.previewIndex > fromIndex) {
        fromState.previewIndex -= 1
      }
      if (fromState.activeIndex !== null) {
        if (fromState.activeIndex === fromIndex) {
          fromState.activeIndex = fromState.tabs.length
            ? clampIndex(fromIndex, fromState.tabs.length)
            : null
        } else if (fromState.activeIndex > fromIndex) {
          fromState.activeIndex -= 1
        }
      }
      if (!fromState.tabs.length && fromPaneId !== 'left') {
        hidePane(fromPaneId)
      }
      persistState()
      return
    }

    // Prepare object key migration
    const fromObjectKey = ensureObjectKey(fromPaneId, sourceTab)

    const wasSourcePreview = isPreviewIndex(fromState, fromIndex)

    // Remove from source without clearing its object state (we migrate it)
    const wasSourceActive = fromState.activeIndex === fromIndex
    const [removedTab] = fromState.tabs.splice(fromIndex, 1)

    if (wasSourcePreview) {
      fromState.previewIndex = null
    } else if (fromState.previewIndex !== null && fromState.previewIndex > fromIndex) {
      fromState.previewIndex -= 1
    }

    if (!fromState.tabs.length) {
      fromState.activeIndex = null
      if (fromPaneId !== 'left') {
        hidePane(fromPaneId)
      }
    } else {
      if (wasSourceActive) {
        const newIndex = Math.min(fromIndex, fromState.tabs.length - 1)
        fromState.activeIndex = newIndex
      } else if (fromState.activeIndex !== null && fromState.activeIndex > fromIndex) {
        fromState.activeIndex--
      }
    }

    // Rebuild objectKey for the destination pane (pane-scoped)
    // Any moved tab becomes kept in the destination (dropping implies keep).
    const movedTab: PaneTab = { ...removedTab, pinned: true }
    delete movedTab.objectKey
    const toObjectKey = ensureObjectKey(toPaneId, movedTab)
    if (fromObjectKey && toObjectKey) {
      objectTabStateStore.moveTabState(fromObjectKey, toObjectKey, true)
    }

    // Insert into destination at specified index or at the end
    showPane(toPaneId)
    const insertIndex =
      toIndex !== undefined
        ? Math.min(Math.max(0, toIndex), toState.tabs.length)
        : toState.tabs.length
    toState.tabs.splice(insertIndex, 0, movedTab)
    if (toState.previewIndex !== null && insertIndex <= toState.previewIndex) {
      toState.previewIndex += 1
    }
    toState.activeIndex = insertIndex
    if (focus) setActivePane(toPaneId)
    persistState()
  }

  /**
   * Activate a pinned tab by index
   */
  function activateTab(paneId: PaneId, index: number) {
    const state = getPaneState(paneId)
    if (index < 0 || index >= state.tabs.length) return

    state.activeIndex = index
    setActivePane(paneId)
    persistState()
  }

  /**
   * Activate the preview tab
   */
  function activatePreviewTab(paneId: PaneId) {
    const state = getPaneState(paneId)
    if (state.previewIndex === null) return

    state.activeIndex = state.previewIndex
    setActivePane(paneId)
    persistState()
  }

  /**
   * Update file metadata for an existing file tab
   * Used to update metadata after initial tab creation for immediate loading feedback
   */
  function updateTabFileMetadata(paneId: PaneId, tabId: string, metadata: FileMetadata | null) {
    const state = getPaneState(paneId)
    const index = state.tabs.findIndex((t) => t.id === tabId)
    if (index < 0) return
    state.tabs[index] = { ...state.tabs[index], fileMetadata: metadata }
    persistState()
  }

  /**
   * Reopen the most recently closed tab
   * @returns true if a tab was reopened, false if history is empty
   */
  function reopenClosedTab(): boolean {
    if (closedTabsHistory.value.length === 0) return false

    const item = closedTabsHistory.value.shift()!
    // addTab handles deduplication - if tab already exists, it activates the existing one
    addTab(item.paneId, item.tab, 'pinned')
    persistState()
    return true
  }

  /**
   * Clear all state for a pane (reset to empty)
   */
  function clearPane(paneId: PaneId) {
    const state = getPaneState(paneId)
    state.tabs.forEach((tab) => clearObjectState(paneId, tab))
    panes.value.set(paneId, createEmptyPaneState())
    if (paneId !== 'left') {
      hidePane(paneId)
    }
    persistState()
  }

  /**
   * Clear all panes and reset to initial state
   */
  function clearAllPanes() {
    panes.value.get('left')?.tabs.forEach((tab) => clearObjectState('left', tab))
    panes.value.get('right')?.tabs.forEach((tab) => clearObjectState('right', tab))
    panes.value.set('left', createEmptyPaneState())
    panes.value.set('right', createEmptyPaneState())
    activePane.value = 'left'
    visiblePanes.value = new Set<PaneId>(['left'])
    persistState()
  }

  return {
    // State
    panes,
    activePane,
    visiblePanes,
    closedTabsHistory,

    // Getters
    getPaneState,
    hasPaneContent,
    isPaneVisible,
    getActiveTab,
    isActivePane,
    generateTabKey,
    getPreviewTab,

    // Computed
    leftPaneState,
    rightPaneState,
    hasRightPaneContent,
    isRightPaneVisible,
    canReopenTab,

    // Actions
    setActivePane,
    showPane,
    hidePane,
    addTab,
    setPreviewTab,
    pinPreviewTab,
    keepTab,
    closeTab,
    closeOtherTabs,
    closeAllTabs,
    closePreviewTab,
    reorderTab,
    moveTab,
    activateTab,
    activatePreviewTab,
    updateTabFileMetadata,
    clearPane,
    clearAllPanes,
    reopenClosedTab
  }
})
