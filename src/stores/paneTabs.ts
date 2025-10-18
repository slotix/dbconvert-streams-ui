import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { SQLTableMeta, SQLViewMeta } from '@/types/metadata'
import type { FileSystemEntry } from '@/api/fileSystem'
import type { FileMetadata } from '@/types/files'

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

/**
 * Pinia store for managing multiple independent panes with tabs
 * Each pane (left, right, future: middle, etc.) has its own tab state
 */
export const usePaneTabsStore = defineStore('paneTabs', () => {
  // Core state
  const panes = ref<Map<PaneId, PaneState>>(new Map())
  const activePane = ref<PaneId>('left')
  const visiblePanes = ref<Set<PaneId>>(new Set(['left'])) // Left always visible by default

  // Initialize panes
  panes.value.set('left', createEmptyPaneState())
  panes.value.set('right', createEmptyPaneState())

  // Getters
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
  }

  /**
   * Show a pane (make it visible)
   */
  function showPane(paneId: PaneId) {
    visiblePanes.value.add(paneId)
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
      state.previewTab = fullTab
      state.activePinnedIndex = null
    }

    // Set this pane as active
    setActivePane(paneId)
  }

  /**
   * Set preview tab for a pane (single-click behavior)
   */
  function setPreviewTab(paneId: PaneId, tab: PaneTab | null) {
    const state = getPaneState(paneId)
    state.previewTab = tab
    if (tab) {
      state.activePinnedIndex = null
      showPane(paneId)
      setActivePane(paneId)
    }
  }

  /**
   * Pin the current preview tab (convert to pinned)
   */
  function pinPreviewTab(paneId: PaneId) {
    const state = getPaneState(paneId)
    if (!state.previewTab) return

    const tab = { ...state.previewTab, pinned: true }
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
  }

  /**
   * Close a pinned tab by index
   */
  function closeTab(paneId: PaneId, index: number) {
    const state = getPaneState(paneId)
    if (index < 0 || index >= state.pinnedTabs.length) return

    const wasActive = state.activePinnedIndex === index
    state.pinnedTabs.splice(index, 1)

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
  }

  /**
   * Close all tabs except the one at keepIndex
   */
  function closeOtherTabs(paneId: PaneId, keepIndex: number) {
    const state = getPaneState(paneId)
    if (keepIndex < 0 || keepIndex >= state.pinnedTabs.length) return

    const keepTab = state.pinnedTabs[keepIndex]
    state.pinnedTabs = [keepTab]
    state.activePinnedIndex = 0
  }

  /**
   * Close all pinned tabs in a pane
   */
  function closeAllTabs(paneId: PaneId) {
    const state = getPaneState(paneId)
    state.pinnedTabs = []
    state.activePinnedIndex = null

    // If no preview tab and not left pane, hide it
    if (!state.previewTab && paneId !== 'left') {
      hidePane(paneId)
    }
  }

  /**
   * Close preview tab
   */
  function closePreviewTab(paneId: PaneId) {
    const state = getPaneState(paneId)
    state.previewTab = null

    // If no pinned tabs and not left pane, hide it
    if (!state.pinnedTabs.length && paneId !== 'left') {
      hidePane(paneId)
    }
  }

  /**
   * Activate a pinned tab by index
   */
  function activateTab(paneId: PaneId, index: number) {
    const state = getPaneState(paneId)
    if (index < 0 || index >= state.pinnedTabs.length) return

    state.activePinnedIndex = index
    setActivePane(paneId)
  }

  /**
   * Activate the preview tab
   */
  function activatePreviewTab(paneId: PaneId) {
    const state = getPaneState(paneId)
    if (!state.previewTab) return

    state.activePinnedIndex = null
    setActivePane(paneId)
  }

  /**
   * Clear all state for a pane (reset to empty)
   */
  function clearPane(paneId: PaneId) {
    panes.value.set(paneId, createEmptyPaneState())
    if (paneId !== 'left') {
      hidePane(paneId)
    }
  }

  /**
   * Clear all panes and reset to initial state
   */
  function clearAllPanes() {
    panes.value.set('left', createEmptyPaneState())
    panes.value.set('right', createEmptyPaneState())
    activePane.value = 'left'
    visiblePanes.value = new Set(['left'])
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
