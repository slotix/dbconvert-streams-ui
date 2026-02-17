import { ref, computed, watch, onScopeDispose, type ComputedRef } from 'vue'
import { useSqlConsoleStore } from '@/stores/sqlConsole'
import type { QueryPurpose } from '@/stores/logs'
import { format as formatSQL, type SqlLanguage } from 'sql-formatter'
import { useSplitPaneResize } from './useSplitPaneResize'

export type QueryHistoryMode = 'single' | 'federated' | 'file'

export interface QueryHistoryContext {
  mode: QueryHistoryMode
  alias?: string
  aliases?: string[]
  sourceType?: 'database' | 'files' | 's3'
}

export interface QueryHistoryItem {
  id: string
  query: string
  timestamp: number
  pinned?: boolean
  context?: QueryHistoryContext
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
   * SQL dialect for formatting (e.g., 'mysql', 'postgresql', 'sql')
   */
  dialect?: string | ComputedRef<string>

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
    dialect: dialectOption,
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
  const dialect = computed(() =>
    dialectOption === undefined
      ? 'sql'
      : typeof dialectOption === 'string'
        ? dialectOption
        : dialectOption.value
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
  const nextFormatMode = ref<'format' | 'compact'>('format')
  const formatState = ref<'formatted' | 'compacted'>('formatted')
  let formatTaskTimer: ReturnType<typeof setTimeout> | null = null
  const lastQueryStats = ref<QueryStats | null>(null)
  const currentPage = ref(1)
  const pageSize = ref(100)

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
  let saveTimeout: ReturnType<typeof setTimeout> | null = null

  watch(activeQueryTabId, () => {
    nextFormatMode.value = 'format'
  })

  // ========== Tab Sync ==========
  watch(
    [activeQueryTabId, () => activeQueryTab.value?.query, () => activeQueryTab.value?.updatedAt],
    () => {
      const tab = activeQueryTab.value
      if (!tab) return

      // Prevent delayed save from a stale editor value overriding store-driven updates.
      if (saveTimeout) {
        clearTimeout(saveTimeout)
        saveTimeout = null
      }

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
    },
    { immediate: true }
  )

  // Debounced save of query content
  watch(sqlQuery, (newQuery) => {
    if (newQuery === (activeQueryTab.value?.query ?? '')) {
      return
    }
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

  function closeOthersQueryTabs(keepTabId: string) {
    const tabs = sqlConsoleStore.getTabs(consoleKey.value, database.value)
    // Close all tabs except the one to keep
    tabs.forEach((tab) => {
      if (tab.id !== keepTabId) {
        sqlConsoleStore.closeTab(consoleKey.value, database.value, tab.id)
      }
    })
  }

  function canReopenQueryTab(): boolean {
    return sqlConsoleStore.canReopenTab(consoleKey.value, database.value)
  }

  function reopenQueryTab() {
    sqlConsoleStore.reopenClosedTab(consoleKey.value, database.value)
  }

  // ========== Query Formatting ==========
  // Map our dialect names to sql-formatter language names
  function getFormatterLanguage(d: string): SqlLanguage {
    const dialectMap: Record<string, SqlLanguage> = {
      mysql: 'mysql',
      mariadb: 'mariadb',
      postgresql: 'postgresql',
      pgsql: 'postgresql',
      postgres: 'postgresql',
      mssql: 'tsql',
      sqlserver: 'tsql',
      oracle: 'plsql',
      snowflake: 'snowflake',
      redshift: 'redshift',
      bigquery: 'bigquery',
      spark: 'spark',
      duckdb: 'duckdb',
      sqlite: 'sqlite'
    }
    return dialectMap[d.toLowerCase()] || 'sql'
  }

  function compactSql(sql: string): string {
    const lines = sql.split('\n')
    const segments: Array<{ type: 'comment' | 'statement'; text: string }> = []
    const pushStatement = (value: string) => {
      const normalized = value.replace(/\s+/g, ' ').trim()
      if (!normalized) return

      const splitByTerminator = normalized
        .replace(/;\s*(?=\S)/g, ';\n\n')
        .split('\n\n')
        .map((part) => part.trim())
        .filter(Boolean)

      for (const part of splitByTerminator) {
        segments.push({ type: 'statement', text: part })
      }
    }

    let statementBuffer = ''
    for (const rawLine of lines) {
      const line = rawLine.trim()
      if (!line) continue

      if (line.startsWith('--') || line.startsWith('#')) {
        pushStatement(statementBuffer)
        statementBuffer = ''
        segments.push({ type: 'comment', text: line })
        continue
      }

      statementBuffer = statementBuffer ? `${statementBuffer} ${line}` : line
    }

    pushStatement(statementBuffer)
    if (segments.length === 0) return ''

    let output = ''
    for (let i = 0; i < segments.length; i += 1) {
      const current = segments[i]
      const next = segments[i + 1]
      output += current.text
      if (!next) continue
      output += current.type === 'statement' && next.type === 'statement' ? '\n\n' : '\n'
    }

    return output
  }

  function formatQuery() {
    const lang = getFormatterLanguage(dialect.value)
    const appliedMode = nextFormatMode.value
    const sourceQuery = sqlQuery.value

    if (formatTaskTimer) {
      clearTimeout(formatTaskTimer)
    }

    formatTaskTimer = setTimeout(() => {
      formatTaskTimer = null
      try {
        const nextQuery =
          appliedMode === 'format'
            ? formatSQL(sourceQuery, { language: lang })
            : compactSql(sourceQuery)

        if (nextQuery !== sqlQuery.value) {
          sqlQuery.value = nextQuery
        }

        formatState.value = appliedMode === 'format' ? 'formatted' : 'compacted'
        nextFormatMode.value = appliedMode === 'format' ? 'compact' : 'format'
      } catch (e) {
        console.error('SQL formatting failed:', e)
      }
    }, 0)
  }

  // ========== History Management ==========
  function normalizeHistoryContext(raw: unknown): QueryHistoryContext | undefined {
    if (!raw || typeof raw !== 'object') return undefined

    const value = raw as Partial<QueryHistoryContext>
    const mode = value.mode
    if (mode !== 'single' && mode !== 'federated' && mode !== 'file') {
      return undefined
    }

    const alias = typeof value.alias === 'string' ? value.alias.trim() : ''
    const aliases = Array.isArray(value.aliases)
      ? value.aliases
          .filter((entry): entry is string => typeof entry === 'string')
          .map((entry) => entry.trim())
          .filter(Boolean)
      : []
    const sourceType =
      value.sourceType === 'database' || value.sourceType === 'files' || value.sourceType === 's3'
        ? value.sourceType
        : undefined

    return {
      mode,
      alias: alias || undefined,
      aliases: aliases.length > 0 ? aliases : undefined,
      sourceType
    }
  }

  function createHistoryId(query: string, timestamp: number): string {
    let hash = 0
    for (let i = 0; i < query.length; i += 1) {
      hash = (hash << 5) - hash + query.charCodeAt(i)
      hash |= 0
    }
    return `hist_${timestamp.toString(36)}_${Math.abs(hash).toString(36)}_${Math.random().toString(36).slice(2, 7)}`
  }

  function historyFingerprint(query: string, context?: QueryHistoryContext): string {
    const aliases = context?.aliases?.join(',') || ''
    return `${query}|${context?.mode || ''}|${context?.alias || ''}|${aliases}|${context?.sourceType || ''}`
  }

  function sortHistoryItems(items: QueryHistoryItem[]): QueryHistoryItem[] {
    return [...items].sort((a, b) => {
      const pinDiff = Number(Boolean(b.pinned)) - Number(Boolean(a.pinned))
      if (pinDiff !== 0) return pinDiff
      return b.timestamp - a.timestamp
    })
  }

  function persistHistory() {
    try {
      localStorage.setItem(historyKey.value, JSON.stringify(queryHistory.value))
    } catch (e) {
      console.warn('Failed to save query history:', e)
    }
  }

  function normalizeHistoryItem(raw: unknown, index: number): QueryHistoryItem | null {
    if (!raw || typeof raw !== 'object') return null

    const value = raw as Partial<QueryHistoryItem>
    const query = typeof value.query === 'string' ? value.query.trim() : ''
    if (!query) return null

    const timestamp =
      typeof value.timestamp === 'number' && Number.isFinite(value.timestamp)
        ? value.timestamp
        : Date.now() - index
    const context = normalizeHistoryContext(value.context)
    const id =
      typeof value.id === 'string' && value.id.trim()
        ? value.id.trim()
        : createHistoryId(query, timestamp)

    return {
      id,
      query,
      timestamp,
      pinned: Boolean(value.pinned),
      context
    }
  }

  function loadHistory() {
    try {
      const stored = localStorage.getItem(historyKey.value)
      if (stored) {
        const parsed = JSON.parse(stored)
        if (Array.isArray(parsed)) {
          queryHistory.value = sortHistoryItems(
            parsed
              .map((item, index) => normalizeHistoryItem(item, index))
              .filter((item): item is QueryHistoryItem => Boolean(item))
          ).slice(0, maxHistoryItems)
        }
      }
    } catch (e) {
      console.warn('Failed to load query history:', e)
    }
  }

  function saveToHistory(query: string, context?: QueryHistoryContext) {
    const trimmed = query.trim()
    if (!trimmed) return

    const normalizedContext = normalizeHistoryContext(context)
    const fingerprint = historyFingerprint(trimmed, normalizedContext)
    const existing = queryHistory.value.find(
      (item) => historyFingerprint(item.query, item.context) === fingerprint
    )

    // Remove duplicate if exists, preserving pinned state on re-run.
    queryHistory.value = queryHistory.value.filter(
      (item) => historyFingerprint(item.query, item.context) !== fingerprint
    )

    const timestamp = Date.now()
    queryHistory.value.unshift({
      id: createHistoryId(trimmed, timestamp),
      query: trimmed,
      timestamp,
      pinned: Boolean(existing?.pinned),
      context: normalizedContext
    })

    queryHistory.value = sortHistoryItems(queryHistory.value).slice(0, maxHistoryItems)
    persistHistory()
  }

  function insertHistoryQuery(historyItem: QueryHistoryItem) {
    sqlQuery.value = historyItem.query
  }

  function removeHistoryItem(historyItem: QueryHistoryItem) {
    const before = queryHistory.value.length
    queryHistory.value = queryHistory.value.filter((item) => item.id !== historyItem.id)
    if (queryHistory.value.length !== before) {
      persistHistory()
    }
  }

  function toggleHistoryPinned(historyItem: QueryHistoryItem) {
    let changed = false
    queryHistory.value = sortHistoryItems(
      queryHistory.value.map((item) => {
        if (item.id !== historyItem.id) return item
        changed = true
        return { ...item, pinned: !item.pinned }
      })
    )
    if (changed) {
      persistHistory()
    }
  }

  function openHistoryQueryInNewTab(historyItem: QueryHistoryItem) {
    sqlConsoleStore.addTabWithQuery(consoleKey.value, database.value, historyItem.query)
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
    if (formatTaskTimer) {
      clearTimeout(formatTaskTimer)
      formatTaskTimer = null
    }
    if (saveTimeout) {
      clearTimeout(saveTimeout)
      saveTimeout = null
      const tabId = activeQueryTabId.value
      if (tabId) {
        sqlConsoleStore.updateTabQuery(consoleKey.value, database.value, tabId, sqlQuery.value)
      }
    }
  }

  // Auto-cleanup when the composable's scope is disposed (component unmounts)
  onScopeDispose(cleanup)

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
    formatState,
    lastQueryStats,
    currentPage,
    pageSize,
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
    closeOthersQueryTabs,
    handleRenameTab,
    reorderQueryTab,
    canReopenQueryTab,
    reopenQueryTab,

    // Query operations
    formatQuery,
    insertTemplate,
    insertHistoryQuery,
    saveToHistory,
    removeHistoryItem,
    toggleHistoryPinned,
    openHistoryQueryInNewTab,
    setExecutionResult,
    setExecutionError,

    // Lifecycle
    initialize,
    cleanup
  }
}

export type ConsoleTabReturn = ReturnType<typeof useConsoleTab>
