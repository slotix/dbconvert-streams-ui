import { ref, computed, watch, type ComputedRef } from 'vue'
import { useSqlConsoleStore } from '@/stores/sqlConsole'
import type { QueryPurpose } from '@/stores/logs'
import { format as formatSQL } from 'sql-formatter'
import { useSplitPaneResize } from './useSplitPaneResize'

export interface QueryHistoryItem {
  query: string
  timestamp: number
}

export interface QueryStats {
  rowCount: number
  duration: number
}

export interface ConsoleTabOptions {
  /**
   * Unique console key for store (e.g., 'federated-console', 'file:connId', 'connId:database')
   */
  consoleKey: string | ComputedRef<string>

  /**
   * Key for localStorage history (e.g., 'federated-console-history')
   */
  historyKey: string | ComputedRef<string>

  /**
   * Optional database name for database-scoped consoles
   */
  database?: string | ComputedRef<string | undefined>

  /**
   * Function to get default query template for new tabs
   */
  getDefaultQuery?: () => string

  /**
   * Max history items to keep
   */
  maxHistoryItems?: number
}

export interface ExecuteQueryResult {
  columns: string[]
  rows: Record<string, unknown>[]
  resultSets?: Array<{
    columns: string[]
    rows: Record<string, unknown>[]
    commandTag?: string
    rowsAffected?: number
  }>
  error?: string | null
  stats?: QueryStats | null
}

/**
 * Helper to detect query purpose from SQL for logging
 */
export function detectQueryPurpose(query: string): QueryPurpose {
  const normalized = query.trim().toUpperCase()
  const firstWord = normalized.split(/\s+/)[0]

  if (['CREATE', 'ALTER', 'DROP', 'TRUNCATE'].includes(firstWord)) {
    return 'SCHEMA_CHANGE'
  }
  if (['INSERT', 'UPDATE', 'DELETE', 'MERGE', 'UPSERT'].includes(firstWord)) {
    return 'DML_OPERATION'
  }
  if (
    ['SHOW', 'DESCRIBE', 'DESC', 'EXPLAIN'].includes(firstWord) ||
    normalized.includes('INFORMATION_SCHEMA') ||
    normalized.includes('PG_CATALOG') ||
    normalized.includes('PG_TABLES') ||
    normalized.includes('PG_DATABASE')
  ) {
    return 'SCHEMA_INTROSPECTION'
  }
  if (normalized.includes('COUNT(') || normalized.includes('COUNT (')) {
    return 'COUNT_QUERY'
  }
  return 'DATA_QUERY'
}

/**
 * Composable for SQL console tab functionality.
 * Handles tab management, query state, history, and split pane resize.
 */
export function useConsoleTab(options: ConsoleTabOptions) {
  const {
    consoleKey: consoleKeyOption,
    historyKey: historyKeyOption,
    database: databaseOption,
    getDefaultQuery = () => '',
    maxHistoryItems = 50
  } = options

  const sqlConsoleStore = useSqlConsoleStore()

  // Convert options to computed refs for reactivity
  const consoleKey = computed(() =>
    typeof consoleKeyOption === 'string' ? consoleKeyOption : consoleKeyOption.value
  )
  const historyKey = computed(() =>
    typeof historyKeyOption === 'string' ? historyKeyOption : historyKeyOption.value
  )
  const database = computed(() =>
    databaseOption === undefined
      ? undefined
      : typeof databaseOption === 'string'
        ? databaseOption
        : databaseOption.value
  )

  // ========== Query State ==========
  const sqlQuery = ref('')
  const isExecuting = ref(false)
  const hasExecutedQuery = ref(false)
  const queryError = ref<string | null>(null)
  const queryResults = ref<Record<string, unknown>[]>([])
  const resultColumns = ref<string[]>([])
  const resultSets = ref<
    Array<{
      columns: string[]
      rows: Record<string, unknown>[]
      commandTag?: string
      rowsAffected?: number
    }>
  >([])
  const lastQueryStats = ref<QueryStats | null>(null)
  const currentPage = ref(1)
  const pageSize = ref(100)
  const showHelp = ref(false)

  // ========== Query History ==========
  const queryHistory = ref<QueryHistoryItem[]>([])

  // ========== Split Pane ==========
  const {
    splitGrow: editorWidth,
    onDividerMouseDown: startResize,
    splitContainerRef,
    leftPaneRef
  } = useSplitPaneResize()

  // ========== Tab State ==========
  const queryTabs = computed(() => sqlConsoleStore.getTabs(consoleKey.value, database.value))
  const activeQueryTabId = computed(() =>
    sqlConsoleStore.getActiveTabId(consoleKey.value, database.value)
  )
  const activeQueryTab = computed(() =>
    sqlConsoleStore.getActiveTab(consoleKey.value, database.value)
  )

  // ========== Tab Sync ==========
  watch(
    activeQueryTab,
    (tab) => {
      if (tab) {
        sqlQuery.value = tab.query

        // Restore cached results
        const cached = sqlConsoleStore.getResultCache(tab.id)
        if (cached) {
          hasExecutedQuery.value = true
          queryError.value = cached.error
          queryResults.value = cached.rows
          resultColumns.value = cached.columns
          resultSets.value = cached.resultSets || []
          lastQueryStats.value = cached.stats
          currentPage.value = 1
        } else {
          hasExecutedQuery.value = false
          queryError.value = null
          queryResults.value = []
          resultColumns.value = []
          resultSets.value = []
          lastQueryStats.value = null
          currentPage.value = 1
        }
      }
    },
    { immediate: true }
  )

  // Debounced save of query content
  let saveTimeout: ReturnType<typeof setTimeout> | null = null
  watch(sqlQuery, (newQuery) => {
    const tabId = activeQueryTabId.value
    if (tabId) {
      if (saveTimeout) clearTimeout(saveTimeout)
      saveTimeout = setTimeout(() => {
        sqlConsoleStore.updateTabQuery(consoleKey.value, database.value, tabId, newQuery)
      }, 500)
    }
  })

  // ========== Tab Management ==========
  function setActiveQueryTab(tabId: string) {
    const currentTabId = activeQueryTabId.value
    if (currentTabId) {
      sqlConsoleStore.updateTabQuery(consoleKey.value, database.value, currentTabId, sqlQuery.value)
    }
    sqlConsoleStore.setActiveTab(consoleKey.value, database.value, tabId)
  }

  function addQueryTab() {
    const currentTabId = activeQueryTabId.value
    if (currentTabId) {
      sqlConsoleStore.updateTabQuery(consoleKey.value, database.value, currentTabId, sqlQuery.value)
    }
    const newTab = sqlConsoleStore.addTab(consoleKey.value, database.value)
    const defaultQuery = getDefaultQuery()
    if (defaultQuery) {
      sqlConsoleStore.updateTabQuery(consoleKey.value, database.value, newTab.id, defaultQuery)
    }
  }

  function closeQueryTab(tabId: string) {
    sqlConsoleStore.closeTab(consoleKey.value, database.value, tabId)
  }

  function closeAllQueryTabs() {
    sqlConsoleStore.clearTabs(consoleKey.value, database.value)
  }

  function handleRenameTab(tabId: string, newName: string) {
    sqlConsoleStore.renameTab(consoleKey.value, database.value, tabId, newName)
  }

  function reorderQueryTab(fromIndex: number, toIndex: number) {
    sqlConsoleStore.reorderTab(consoleKey.value, database.value, fromIndex, toIndex)
  }

  // ========== Query Formatting ==========
  function formatQuery() {
    try {
      sqlQuery.value = formatSQL(sqlQuery.value, { language: 'sql' })
    } catch {
      // Keep original if formatting fails
    }
  }

  // ========== History Management ==========
  function loadHistory() {
    try {
      const stored = localStorage.getItem(historyKey.value)
      if (stored) {
        queryHistory.value = JSON.parse(stored)
      }
    } catch (e) {
      console.warn('Failed to load query history:', e)
    }
  }

  function saveToHistory(query: string) {
    const trimmed = query.trim()
    if (!trimmed) return

    // Remove duplicate if exists
    queryHistory.value = queryHistory.value.filter((h) => h.query !== trimmed)

    // Add to beginning
    queryHistory.value.unshift({
      query: trimmed,
      timestamp: Date.now()
    })

    // Trim to max items
    if (queryHistory.value.length > maxHistoryItems) {
      queryHistory.value = queryHistory.value.slice(0, maxHistoryItems)
    }

    // Persist
    try {
      localStorage.setItem(historyKey.value, JSON.stringify(queryHistory.value))
    } catch (e) {
      console.warn('Failed to save query history:', e)
    }
  }

  function insertHistoryQuery(historyItem: QueryHistoryItem) {
    sqlQuery.value = historyItem.query
  }

  // ========== Template Insertion ==========
  function insertTemplate(query: string) {
    sqlQuery.value = query
  }

  // ========== Query Execution Helpers ==========
  function setExecutionResult(result: ExecuteQueryResult) {
    hasExecutedQuery.value = true
    queryError.value = result.error || null
    queryResults.value = result.rows
    resultColumns.value = result.columns
    resultSets.value = result.resultSets || []
    lastQueryStats.value = result.stats || null
    currentPage.value = 1

    // Cache results
    const tabId = activeQueryTabId.value
    if (tabId) {
      sqlConsoleStore.setResultCache(tabId, {
        columns: result.columns,
        rows: result.rows,
        resultSets: result.resultSets || [],
        error: result.error || null,
        stats: result.stats || null
      })
    }
  }

  function setExecutionError(error: string) {
    hasExecutedQuery.value = true
    queryError.value = error
    queryResults.value = []
    resultColumns.value = []
    resultSets.value = []
    lastQueryStats.value = null
    currentPage.value = 1

    // Cache error
    const tabId = activeQueryTabId.value
    if (tabId) {
      sqlConsoleStore.setResultCache(tabId, {
        columns: [],
        rows: [],
        resultSets: [],
        error,
        stats: null
      })
    }
  }

  // ========== Cleanup ==========
  function cleanup() {
    if (saveTimeout) clearTimeout(saveTimeout)
    const tabId = activeQueryTabId.value
    if (tabId) {
      sqlConsoleStore.updateTabQuery(consoleKey.value, database.value, tabId, sqlQuery.value)
    }
  }

  // ========== Initialization ==========
  function initialize() {
    loadHistory()

    // Initialize first tab if needed
    if (queryTabs.value.length === 0) {
      addQueryTab()
    }

    // Set default query if tab is empty
    const activeTab = activeQueryTab.value
    if (activeTab && !activeTab.query.trim()) {
      const defaultQuery = getDefaultQuery()
      if (defaultQuery) {
        sqlQuery.value = defaultQuery
        const tabId = activeQueryTabId.value
        if (tabId) {
          sqlConsoleStore.updateTabQuery(consoleKey.value, database.value, tabId, defaultQuery)
        }
      }
    }
  }

  return {
    // State
    sqlQuery,
    isExecuting,
    hasExecutedQuery,
    queryError,
    queryResults,
    resultColumns,
    resultSets,
    lastQueryStats,
    currentPage,
    pageSize,
    showHelp,
    queryHistory,

    // Split pane
    editorWidth,
    startResize,
    splitContainerRef,
    leftPaneRef,

    // Tabs
    queryTabs,
    activeQueryTabId,
    activeQueryTab,
    setActiveQueryTab,
    addQueryTab,
    closeQueryTab,
    closeAllQueryTabs,
    handleRenameTab,
    reorderQueryTab,

    // Query operations
    formatQuery,
    insertTemplate,
    insertHistoryQuery,
    saveToHistory,
    setExecutionResult,
    setExecutionError,

    // Lifecycle
    initialize,
    cleanup
  }
}

export type ConsoleTabReturn = ReturnType<typeof useConsoleTab>
