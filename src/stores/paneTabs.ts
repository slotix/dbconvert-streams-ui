import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { SQLTableMeta, SQLViewMeta } from '@/types/metadata'
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
  tabType: 'database' | 'file'
  pinned: boolean
  objectKey?: string

  // Database-specific properties
  database?: string
  schema?: string
  type?: 'table' | 'view'
  meta?: SQLTableMeta | SQLViewMeta

  // File-specific properties
  filePath?: string
  fileEntry?: FileSystemEntry
  fileMetadata?: FileMetadata | null
  fileType?: string
}

/**
 * State for a single pane
 */
export interface PaneState {
  pinnedTabs: PaneTab[]
  previewTab: PaneTab | null
  activePinnedIndex: number | null
}

/**
 * Initial empty pane state
 */
function createEmptyPaneState(): PaneState {
  return {
    pinnedTabs: [],
    previewTab: null,
    activePinnedIndex: null
  }
}

const STORAGE_KEY = 'explorer.paneTabs'

type PersistedPaneTabsState = {
  panes: Record<PaneId, PaneState>
  activePane: PaneId
  visiblePanes: PaneId[]
}

function buildObjectKey(paneId: PaneId, tab: PaneTab): string | null {
  if (tab.tabType === 'database' && tab.database && tab.name) {
    const schema = tab.schema || 'default'
    return `${paneId}:db-${tab.database}-${schema}-${tab.name}`
  }
  if (tab.tabType === 'file' && tab.filePath) {
    return `${paneId}:file-${tab.filePath}`
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
  const visiblePanes = ref<Set<PaneId>>(new Set(['left'])) // Left always visible by default
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

  const hydratePaneState = (paneId: PaneId, savedState?: PaneState): PaneState => {
    const state = {
      ...createEmptyPaneState(),
      ...(savedState || {})
    }
    state.pinnedTabs = state.pinnedTabs.map((tab) => {
      const hydratedTab = { ...tab }
      ensureObjectKey(paneId, hydratedTab)
      return hydratedTab
    })
    if (state.previewTab) {
      const hydratedPreview = { ...state.previewTab }
      ensureObjectKey(paneId, hydratedPreview)
      state.previewTab = hydratedPreview
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
      visiblePanes: Array.from(visiblePanes.value)
    })
  }

  function restoreFromStorage() {
    const savedState = loadPersistedPaneTabsState()
    if (!savedState) return

    panes.value.set('left', hydratePaneState('left', savedState.panes?.left))
    panes.value.set('right', hydratePaneState('right', savedState.panes?.right))

    activePane.value = savedState.activePane || 'left'
    const visible =
      savedState.visiblePanes && savedState.visiblePanes.length > 0
        ? savedState.visiblePanes
        : ['left']
    visiblePanes.value = new Set(visible)
  }

  restoreFromStorage()

  const hasPaneContent = (paneId: PaneId): boolean => {
    const state = getPaneState(paneId)
    return state.pinnedTabs.length > 0 || state.previewTab !== null
  }

  const isPaneVisible = (paneId: PaneId): boolean => {
    return visiblePanes.value.has(paneId)
  }

  const getActiveTab = (paneId: PaneId): PaneTab | null => {
    const state = getPaneState(paneId)
    if (state.activePinnedIndex !== null && state.pinnedTabs[state.activePinnedIndex]) {
      return state.pinnedTabs[state.activePinnedIndex]
    }
    return state.previewTab
  }

  const isActivePane = (paneId: PaneId): boolean => {
    return activePane.value === paneId
  }

  // Computed
  const leftPaneState = computed(() => getPaneState('left'))
  const rightPaneState = computed(() => getPaneState('right'))
  const hasRightPaneContent = computed(() => hasPaneContent('right'))
  const isRightPaneVisible = computed(() => isPaneVisible('right'))

  // Tab key generation for deduplication
  function generateTabKey(tab: PaneTab): string {
    if (tab.tabType === 'file') {
      return `file:${tab.filePath}`
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
    mode: 'preview' | 'pinned' = 'preview'
  ) {
    const state = getPaneState(paneId)
    const fullTab: PaneTab = { ...tab, pinned: mode === 'pinned' }
    ensureObjectKey(paneId, fullTab)
    const key = generateTabKey(fullTab)

    // Show pane if not visible
    showPane(paneId)

    if (mode === 'pinned') {
      // Check if already exists in pinned tabs
      const existingIndex = state.pinnedTabs.findIndex((t) => generateTabKey(t) === key)
      if (existingIndex >= 0) {
        // Activate existing pinned tab
        state.activePinnedIndex = existingIndex
      } else {
        // Add new pinned tab
        state.pinnedTabs.push(fullTab)
        state.activePinnedIndex = state.pinnedTabs.length - 1
      }
    } else {
      // Set as preview tab (replaces current preview)
      if (state.previewTab) {
        clearObjectState(paneId, state.previewTab)
      }
      state.previewTab = fullTab
      state.activePinnedIndex = null
    }

    // Set this pane as active
    setActivePane(paneId)
    persistState()
  }

  /**
   * Set preview tab for a pane (single-click behavior)
   */
  function setPreviewTab(paneId: PaneId, tab: PaneTab | null) {
    const state = getPaneState(paneId)
    if (
      state.previewTab &&
      (!tab || ensureObjectKey(paneId, tab) !== ensureObjectKey(paneId, state.previewTab))
    ) {
      clearObjectState(paneId, state.previewTab)
    }
    state.previewTab = tab
    if (tab) {
      ensureObjectKey(paneId, tab)
      state.activePinnedIndex = null
      showPane(paneId)
      setActivePane(paneId)
    }
    persistState()
  }

  /**
   * Pin the current preview tab (convert to pinned)
   */
  function pinPreviewTab(paneId: PaneId) {
    const state = getPaneState(paneId)
    if (!state.previewTab) return

    const tab = { ...state.previewTab, pinned: true }
    ensureObjectKey(paneId, tab)
    const key = generateTabKey(tab)

    // Check if already exists in pinned tabs
    const existingIndex = state.pinnedTabs.findIndex((t) => generateTabKey(t) === key)
    if (existingIndex >= 0) {
      // Activate existing
      state.activePinnedIndex = existingIndex
    } else {
      // Add as new pinned tab
      state.pinnedTabs.push(tab)
      state.activePinnedIndex = state.pinnedTabs.length - 1
    }

    // Clear preview
    state.previewTab = null
    persistState()
  }

  /**
   * Close a pinned tab by index
   */
  function closeTab(paneId: PaneId, index: number) {
    const state = getPaneState(paneId)
    if (index < 0 || index >= state.pinnedTabs.length) return

    const wasActive = state.activePinnedIndex === index
    const [removedTab] = state.pinnedTabs.splice(index, 1)
    clearObjectState(paneId, removedTab)

    // Adjust active index
    if (!state.pinnedTabs.length) {
      state.activePinnedIndex = null
      // If no pinned tabs and no preview, hide pane (except left)
      if (!state.previewTab && paneId !== 'left') {
        hidePane(paneId)
      }
      return
    }

    if (wasActive) {
      // Move to next tab, or previous if was last
      const newIndex = Math.min(index, state.pinnedTabs.length - 1)
      state.activePinnedIndex = newIndex
    } else if (state.activePinnedIndex !== null && state.activePinnedIndex > index) {
      // Adjust index if we closed a tab before the active one
      state.activePinnedIndex--
    }
    persistState()
  }

  /**
   * Close all tabs except the one at keepIndex
   */
  function closeOtherTabs(paneId: PaneId, keepIndex: number) {
    const state = getPaneState(paneId)
    if (keepIndex < 0 || keepIndex >= state.pinnedTabs.length) return

    const keepTab = state.pinnedTabs[keepIndex]
    state.pinnedTabs.forEach((tab, idx) => {
      if (idx !== keepIndex) {
        clearObjectState(paneId, tab)
      }
    })
    state.pinnedTabs = [keepTab]
    state.activePinnedIndex = 0
    persistState()
  }

  /**
   * Close all pinned tabs in a pane
   */
  function closeAllTabs(paneId: PaneId) {
    const state = getPaneState(paneId)
    state.pinnedTabs.forEach((tab) => clearObjectState(paneId, tab))
    clearObjectState(paneId, state.previewTab)
    state.pinnedTabs = []
    state.activePinnedIndex = null

    // If no preview tab and not left pane, hide it
    if (!state.previewTab && paneId !== 'left') {
      hidePane(paneId)
    }
    persistState()
  }

  /**
   * Close preview tab
   */
  function closePreviewTab(paneId: PaneId) {
    const state = getPaneState(paneId)
    clearObjectState(paneId, state.previewTab)
    state.previewTab = null

    // If no pinned tabs and not left pane, hide it
    if (!state.pinnedTabs.length && paneId !== 'left') {
      hidePane(paneId)
    }
    persistState()
  }

  /**
   * Activate a pinned tab by index
   */
  function activateTab(paneId: PaneId, index: number) {
    const state = getPaneState(paneId)
    if (index < 0 || index >= state.pinnedTabs.length) return

    state.activePinnedIndex = index
    setActivePane(paneId)
    persistState()
  }

  /**
   * Activate the preview tab
   */
  function activatePreviewTab(paneId: PaneId) {
    const state = getPaneState(paneId)
    if (!state.previewTab) return

    state.activePinnedIndex = null
    setActivePane(paneId)
    persistState()
  }

  /**
   * Clear all state for a pane (reset to empty)
   */
  function clearPane(paneId: PaneId) {
    const state = getPaneState(paneId)
    state.pinnedTabs.forEach((tab) => clearObjectState(paneId, tab))
    clearObjectState(paneId, state.previewTab)
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
    panes.value.get('left')?.pinnedTabs.forEach((tab) => clearObjectState('left', tab))
    panes.value.get('right')?.pinnedTabs.forEach((tab) => clearObjectState('right', tab))
    clearObjectState('left', panes.value.get('left')?.previewTab)
    clearObjectState('right', panes.value.get('right')?.previewTab)
    panes.value.set('left', createEmptyPaneState())
    panes.value.set('right', createEmptyPaneState())
    activePane.value = 'left'
    visiblePanes.value = new Set(['left'])
    persistState()
  }

  return {
    // State
    panes,
    activePane,
    visiblePanes,

    // Getters
    getPaneState,
    hasPaneContent,
    isPaneVisible,
    getActiveTab,
    isActivePane,
    generateTabKey,

    // Computed
    leftPaneState,
    rightPaneState,
    hasRightPaneContent,
    isRightPaneVisible,

    // Actions
    setActivePane,
    showPane,
    hidePane,
    addTab,
    setPreviewTab,
    pinPreviewTab,
    closeTab,
    closeOtherTabs,
    closeAllTabs,
    closePreviewTab,
    activateTab,
    activatePreviewTab,
    clearPane,
    clearAllPanes
  }
})
