import { defineStore } from 'pinia'
import { ref } from 'vue'

/**
 * Cached query results for a tab (kept in memory, not persisted)
 */
export interface QueryResultCache {
  columns: string[]
  rows: Record<string, unknown>[]
  resultSets?: Array<{
    columns: string[]
    rows: Record<string, unknown>[]
    commandTag?: string
    rowsAffected?: number
  }>
  error: string | null
  stats: { rowCount: number; duration: number } | null
  executedAt: number
}

/**
 * Represents a single SQL query tab within a SQL Console
 */
export interface SqlQueryTab {
  id: string
  name: string
  query: string
  createdAt: number
  updatedAt: number
  tableContext?: {
    tableName: string
    schema?: string
  }
  fileContext?: {
    path: string
    format?: string
    isS3?: boolean
  }
}

/**
 * State for a SQL Console (per connection + database combination)
 */
export interface SqlConsoleState {
  tabs: SqlQueryTab[]
  activeTabId: string | null
}

/**
 * Closed tab history item
 */
export interface ClosedTabHistoryItem {
  tab: SqlQueryTab
  closedAt: number
}

/**
 * Persisted state structure
 */
type PersistedSqlConsoleState = Record<
  string,
  SqlConsoleState & { closedTabsHistory?: ClosedTabHistoryItem[] }
>

const STORAGE_KEY = 'explorer.sqlConsoleTabs'
const MAX_CLOSED_TABS_HISTORY = 10

function generateTabId(): string {
  return `sql-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`
}

function generateConsoleKey(connectionId: string, database?: string): string {
  return `${connectionId}:${database || '*'}`
}

function createDefaultTab(name?: string): SqlQueryTab {
  return {
    id: generateTabId(),
    name: name || 'Query 1',
    query: '',
    createdAt: Date.now(),
    updatedAt: Date.now()
  }
}

function createEmptyConsoleState(withDefaultTab: boolean = true): SqlConsoleState {
  if (!withDefaultTab) {
    return {
      tabs: [],
      activeTabId: null
    }
  }

  const defaultTab = createDefaultTab()
  return {
    tabs: [defaultTab],
    activeTabId: defaultTab.id
  }
}

function hasBrowserStorage(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

function loadPersistedState(): PersistedSqlConsoleState {
  if (!hasBrowserStorage()) {
    return {}
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as PersistedSqlConsoleState
    if (parsed && typeof parsed === 'object') {
      return parsed
    }
  } catch (error) {
    console.warn('Failed to load SQL console state from localStorage:', error)
  }

  return {}
}

function persistState(state: PersistedSqlConsoleState) {
  if (!hasBrowserStorage()) {
    return
  }

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch (error) {
    console.warn('Failed to persist SQL console state to localStorage:', error)
  }
}

/**
 * Pinia store for managing SQL Console tabs
 * Each SQL Console (connection + database combo) can have multiple query tabs
 */
export const useSqlConsoleStore = defineStore('sqlConsole', () => {
  // Map of console keys to their state
  const consoles = ref<Map<string, SqlConsoleState>>(new Map())

  // In-memory cache for query results (not persisted to localStorage)
  // Key: tabId, Value: QueryResultCache
  const resultCache = ref<Map<string, QueryResultCache>>(new Map())

  // Closed tabs history per console (persisted to localStorage)
  // Key: console key, Value: array of closed tabs
  const closedTabsHistory = ref<Map<string, ClosedTabHistoryItem[]>>(new Map())

  // Initialize from localStorage
  function restoreFromStorage() {
    const saved = loadPersistedState()
    for (const [key, state] of Object.entries(saved)) {
      // Ensure each console has at least one tab
      if (!state.tabs || state.tabs.length === 0) {
        state.tabs = [createDefaultTab()]
        state.activeTabId = state.tabs[0].id
      }
      // Ensure activeTabId is valid
      if (!state.activeTabId || !state.tabs.find((t) => t.id === state.activeTabId)) {
        state.activeTabId = state.tabs[0].id
      }
      consoles.value.set(key, { tabs: state.tabs, activeTabId: state.activeTabId })

      // Restore closed tabs history
      if (state.closedTabsHistory && Array.isArray(state.closedTabsHistory)) {
        closedTabsHistory.value.set(key, state.closedTabsHistory.slice(0, MAX_CLOSED_TABS_HISTORY))
      }
    }
  }

  restoreFromStorage()

  // Persist current state
  function saveState() {
    const obj: PersistedSqlConsoleState = {}
    consoles.value.forEach((state, key) => {
      obj[key] = {
        ...state,
        closedTabsHistory: closedTabsHistory.value.get(key) || []
      }
    })
    persistState(obj)
  }

  // Get or create console state
  function getConsoleState(
    connectionId: string,
    database?: string,
    options?: { ensureDefaultTab?: boolean }
  ): SqlConsoleState {
    const ensureDefaultTab = options?.ensureDefaultTab !== false
    const key = generateConsoleKey(connectionId, database)
    let state = consoles.value.get(key)
    if (!state) {
      state = createEmptyConsoleState(ensureDefaultTab)
      consoles.value.set(key, state)
      saveState()
      return state
    }

    let changed = false
    if (ensureDefaultTab && state.tabs.length === 0) {
      const defaultTab = createDefaultTab()
      state.tabs = [defaultTab]
      state.activeTabId = defaultTab.id
      changed = true
    }

    if (state.tabs.length > 0 && !state.tabs.some((t) => t.id === state.activeTabId)) {
      state.activeTabId = state.tabs[0].id
      changed = true
    }

    if (changed) {
      saveState()
    }

    return state
  }

  // Get tabs for a console
  function getTabs(connectionId: string, database?: string): SqlQueryTab[] {
    return getConsoleState(connectionId, database).tabs
  }

  // Get active tab for a console
  function getActiveTab(connectionId: string, database?: string): SqlQueryTab | null {
    const state = getConsoleState(connectionId, database)
    return state.tabs.find((t) => t.id === state.activeTabId) || state.tabs[0] || null
  }

  // Get active tab ID
  function getActiveTabId(connectionId: string, database?: string): string | null {
    return getConsoleState(connectionId, database).activeTabId
  }

  // Set active tab
  function setActiveTab(connectionId: string, database: string | undefined, tabId: string) {
    const state = getConsoleState(connectionId, database)
    if (state.tabs.some((t) => t.id === tabId)) {
      state.activeTabId = tabId
      saveState()
    }
  }

  // Add a new tab
  function addTab(connectionId: string, database?: string, name?: string): SqlQueryTab {
    const state = getConsoleState(connectionId, database)
    const tabNumber = state.tabs.length + 1
    const newTab = createDefaultTab(name || `Query ${tabNumber}`)
    state.tabs.push(newTab)
    state.activeTabId = newTab.id
    saveState()
    return newTab
  }

  // Close a tab
  function closeTab(connectionId: string, database: string | undefined, tabId: string) {
    const key = generateConsoleKey(connectionId, database)
    const state = getConsoleState(connectionId, database)
    const index = state.tabs.findIndex((t) => t.id === tabId)
    if (index === -1) return

    const closedTab = state.tabs[index]

    // Clear result cache for this tab
    resultCache.value.delete(tabId)

    // Don't close if it's the last tab
    if (state.tabs.length === 1) {
      // Push to history before resetting (only if tab has content)
      if (closedTab.query.trim()) {
        pushToClosedHistory(key, closedTab)
      }
      // Reset the tab instead
      const newTab = createDefaultTab('Query 1')
      state.tabs[0] = newTab
      state.activeTabId = newTab.id
      saveState()
      return
    }

    // Push to history before removing (only if tab has content)
    if (closedTab.query.trim()) {
      pushToClosedHistory(key, closedTab)
    }

    state.tabs.splice(index, 1)

    // Update active tab if we closed the active one
    if (state.activeTabId === tabId) {
      // Select the tab to the left, or the first one
      const newIndex = Math.max(0, index - 1)
      state.activeTabId = state.tabs[newIndex]?.id || state.tabs[0]?.id
    }

    saveState()
  }

  // Push a tab to the closed history
  function pushToClosedHistory(consoleKey: string, tab: SqlQueryTab) {
    let history = closedTabsHistory.value.get(consoleKey)
    if (!history) {
      history = []
      closedTabsHistory.value.set(consoleKey, history)
    }

    // Clone tab
    const tabCopy = { ...tab }

    history.unshift({
      tab: tabCopy,
      closedAt: Date.now()
    })

    // Trim to max size
    if (history.length > MAX_CLOSED_TABS_HISTORY) {
      closedTabsHistory.value.set(consoleKey, history.slice(0, MAX_CLOSED_TABS_HISTORY))
    }
  }

  // Check if a console has closed tabs that can be reopened
  function canReopenTab(connectionId: string, database?: string): boolean {
    const key = generateConsoleKey(connectionId, database)
    const history = closedTabsHistory.value.get(key)
    return !!history && history.length > 0
  }

  // Reopen the most recently closed tab
  function reopenClosedTab(connectionId: string, database?: string): SqlQueryTab | null {
    const key = generateConsoleKey(connectionId, database)
    const history = closedTabsHistory.value.get(key)
    if (!history || history.length === 0) return null

    const item = history.shift()!
    const state = getConsoleState(connectionId, database)

    // Create a new tab with the closed tab's content
    const newTab: SqlQueryTab = {
      ...item.tab,
      id: generateTabId(), // Generate new ID to avoid conflicts
      updatedAt: Date.now()
    }

    state.tabs.push(newTab)
    state.activeTabId = newTab.id
    saveState()

    return newTab
  }

  // Update tab query content
  function updateTabQuery(
    connectionId: string,
    database: string | undefined,
    tabId: string,
    query: string
  ) {
    const state = getConsoleState(connectionId, database)
    const tab = state.tabs.find((t) => t.id === tabId)
    if (tab) {
      tab.query = query
      tab.updatedAt = Date.now()
      saveState()
    }
  }

  // Rename a tab
  function renameTab(
    connectionId: string,
    database: string | undefined,
    tabId: string,
    newName: string
  ) {
    const state = getConsoleState(connectionId, database)
    const tab = state.tabs.find((t) => t.id === tabId)
    if (tab && newName.trim()) {
      tab.name = newName.trim()
      tab.updatedAt = Date.now()
      saveState()
    }
  }

  // Duplicate a tab
  function duplicateTab(
    connectionId: string,
    database: string | undefined,
    tabId: string
  ): SqlQueryTab | null {
    const state = getConsoleState(connectionId, database)
    const sourceTab = state.tabs.find((t) => t.id === tabId)
    if (!sourceTab) return null

    const newTab: SqlQueryTab = {
      id: generateTabId(),
      name: `${sourceTab.name} (copy)`,
      query: sourceTab.query,
      createdAt: Date.now(),
      updatedAt: Date.now()
    }

    // Insert after the source tab
    const sourceIndex = state.tabs.findIndex((t) => t.id === tabId)
    state.tabs.splice(sourceIndex + 1, 0, newTab)
    state.activeTabId = newTab.id
    saveState()

    return newTab
  }

  // Reorder tabs within a console
  function reorderTab(
    connectionId: string,
    database: string | undefined,
    fromIndex: number,
    toIndex: number
  ) {
    if (fromIndex === toIndex) return

    const state = getConsoleState(connectionId, database)
    if (fromIndex < 0 || fromIndex >= state.tabs.length) return
    if (toIndex < 0 || toIndex > state.tabs.length) return

    // Remove the tab from its current position
    const [movedTab] = state.tabs.splice(fromIndex, 1)

    // Adjust toIndex if we removed an element before it
    const adjustedToIndex = fromIndex < toIndex ? toIndex - 1 : toIndex

    // Insert at the new position
    state.tabs.splice(adjustedToIndex, 0, movedTab)

    saveState()
  }

  // Clear all tabs for a console (reset to default)
  function clearTabs(connectionId: string, database?: string) {
    const key = generateConsoleKey(connectionId, database)
    const newState = createEmptyConsoleState()
    consoles.value.set(key, newState)
    saveState()
  }

  // Remove console state entirely (e.g., when connection is deleted)
  function removeConsole(connectionId: string, database?: string) {
    const key = generateConsoleKey(connectionId, database)
    consoles.value.delete(key)
    saveState()
  }

  // ========== Query Result Cache (in-memory only) ==========

  // Get cached results for a tab
  function getResultCache(tabId: string): QueryResultCache | null {
    return resultCache.value.get(tabId) || null
  }

  // Set cached results for a tab
  function setResultCache(
    tabId: string,
    results: {
      columns: string[]
      rows: Record<string, unknown>[]
      resultSets?: Array<{
        columns: string[]
        rows: Record<string, unknown>[]
        commandTag?: string
        rowsAffected?: number
      }>
      error: string | null
      stats: { rowCount: number; duration: number } | null
    }
  ) {
    resultCache.value.set(tabId, {
      ...results,
      executedAt: Date.now()
    })
  }

  // Clear cached results for a tab
  function clearResultCache(tabId: string) {
    resultCache.value.delete(tabId)
  }

  // Check if a tab has cached results
  function hasResultCache(tabId: string): boolean {
    return resultCache.value.has(tabId)
  }

  // Insert text into the active tab's query (appends to existing content)
  function insertIntoActiveTab(connectionId: string, database: string | undefined, text: string) {
    const state = getConsoleState(connectionId, database)
    const tab = state.tabs.find((t) => t.id === state.activeTabId)
    if (tab) {
      // Append text to existing query (with newline if query is not empty)
      const currentQuery = tab.query.trimEnd()
      tab.query = currentQuery ? `${currentQuery}\n\n${text}` : text
      tab.updatedAt = Date.now()
      saveState()
    }
  }

  // Create a new tab with the given query content
  function addTabWithQuery(
    connectionId: string,
    database: string | undefined,
    query: string,
    name?: string,
    tableContext?: { tableName: string; schema?: string },
    fileContext?: { path: string; format?: string; isS3?: boolean }
  ): SqlQueryTab {
    const state = getConsoleState(connectionId, database, { ensureDefaultTab: false })
    const placeholder = state.tabs.length === 1 ? state.tabs[0] : null
    const canReplacePlaceholder = Boolean(
      placeholder &&
        !placeholder.query.trim() &&
        !placeholder.tableContext &&
        !placeholder.fileContext &&
        /^Query\s+\d+$/i.test(placeholder.name.trim())
    )

    if (canReplacePlaceholder && placeholder) {
      const normalizedName = name?.trim()
      if (normalizedName) {
        placeholder.name = normalizedName
      }
      placeholder.query = query
      placeholder.updatedAt = Date.now()
      if (tableContext) {
        placeholder.tableContext = tableContext
      } else {
        delete placeholder.tableContext
      }
      if (fileContext) {
        placeholder.fileContext = fileContext
      } else {
        delete placeholder.fileContext
      }
      state.activeTabId = placeholder.id
      saveState()
      return placeholder
    }

    const tabNumber = state.tabs.length + 1
    const newTab = createDefaultTab(name || `Query ${tabNumber}`)
    newTab.query = query
    if (tableContext) {
      newTab.tableContext = tableContext
    }
    if (fileContext) {
      newTab.fileContext = fileContext
    }
    state.tabs.push(newTab)
    state.activeTabId = newTab.id
    saveState()
    return newTab
  }

  return {
    // State
    consoles,
    resultCache,

    // Getters
    getTabs,
    getActiveTab,
    getActiveTabId,

    // Actions
    setActiveTab,
    addTab,
    closeTab,
    updateTabQuery,
    renameTab,
    duplicateTab,
    reorderTab,
    clearTabs,
    removeConsole,
    saveState,
    canReopenTab,
    reopenClosedTab,

    // Result cache
    getResultCache,
    setResultCache,
    clearResultCache,
    hasResultCache,

    // Insert helpers
    insertIntoActiveTab,
    addTabWithQuery
  }
})
