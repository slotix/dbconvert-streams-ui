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
 * Persisted state structure
 */
type PersistedSqlConsoleState = Record<string, SqlConsoleState>

const STORAGE_KEY = 'explorer.sqlConsoleTabs'

function generateTabId(): string {
  return `sql-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
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

function createEmptyConsoleState(): SqlConsoleState {
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
      consoles.value.set(key, state)
    }
  }

  restoreFromStorage()

  // Persist current state
  function saveState() {
    const obj: PersistedSqlConsoleState = {}
    consoles.value.forEach((state, key) => {
      obj[key] = state
    })
    persistState(obj)
  }

  // Get or create console state
  function getConsoleState(connectionId: string, database?: string): SqlConsoleState {
    const key = generateConsoleKey(connectionId, database)
    let state = consoles.value.get(key)
    if (!state) {
      state = createEmptyConsoleState()
      consoles.value.set(key, state)
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
    const state = getConsoleState(connectionId, database)
    const index = state.tabs.findIndex((t) => t.id === tabId)
    if (index === -1) return

    // Clear result cache for this tab
    resultCache.value.delete(tabId)

    // Don't close if it's the last tab
    if (state.tabs.length === 1) {
      // Reset the tab instead
      const newTab = createDefaultTab('Query 1')
      state.tabs[0] = newTab
      state.activeTabId = newTab.id
      saveState()
      return
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
    const state = getConsoleState(connectionId, database)
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
    clearTabs,
    removeConsole,
    saveState,

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
