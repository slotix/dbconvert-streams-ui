/**
 * Composable for executing SQL queries in the console.
 * Handles federated, file (DuckDB), and database query execution.
 */
import { ref, computed, type Ref, type ComputedRef } from 'vue'
import { useExplorerNavigationStore } from '@/stores/explorerNavigation'
import { useDatabaseOverviewStore } from '@/stores/databaseOverview'
import { useLogsStore } from '@/stores/logs'
import { sseLogsService } from '@/api/sseLogsServiceStructured'
import connections from '@/api/connections'
import { executeFileQuery } from '@/api/files'
import { executeFederatedQuery, type ConnectionMapping } from '@/api/federated'
import { detectQueryPurpose } from '@/composables/useConsoleTab'
import { isDuckDbFileQuery, escapeRegExp } from '@/composables/useConsoleSources'

export type ConsoleMode = 'database' | 'file'

type QueryResultSet = {
  columns?: string[]
  rows?: unknown[][]
  commandTag?: string
  rowsAffected?: number
}

type ExecuteQueryApiResult = {
  columns: string[]
  rows: unknown[][]
  results?: QueryResultSet[]
  affectedObjects?: string[]
}

export interface NormalizedResultSet {
  columns: string[]
  rows: Record<string, unknown>[]
  commandTag?: string
  rowsAffected?: number
}

export interface ExecutionResult {
  columns: string[]
  rows: Record<string, unknown>[]
  resultSets?: NormalizedResultSet[]
  stats: { rowCount: number; duration: number }
}

export interface UseQueryExecutionOptions {
  /** Console mode: 'database' or 'file' */
  mode: ComputedRef<ConsoleMode> | Ref<ConsoleMode>
  /** Current connection ID */
  connectionId: ComputedRef<string> | Ref<string>
  /** Database name (for database mode) */
  database?: ComputedRef<string | undefined> | Ref<string | undefined>
  /** Selected data sources for federated queries */
  selectedConnections: Ref<ConnectionMapping[]>
  /** Whether to use the federated query engine */
  useFederatedEngine: ComputedRef<boolean>
  /** Current SQL query */
  sqlQuery: Ref<string>
  /** Active query tab ID for logging */
  activeQueryTabId: Ref<string | null>
  /** Callback to set execution result */
  setExecutionResult: (result: ExecutionResult) => void
  /** Callback to set execution error */
  setExecutionError: (error: string) => void
  /** Callback to save query to history */
  saveToHistory: (query: string) => void
  /** Callback to refresh table suggestions (for DDL changes) */
  loadTableSuggestionsWithRefresh?: (forceRefresh: boolean) => Promise<void>
}

export interface UseQueryExecutionReturn {
  isExecuting: Ref<boolean>
  executeQuery: () => Promise<void>
}

export function useQueryExecution(options: UseQueryExecutionOptions): UseQueryExecutionReturn {
  const {
    mode,
    connectionId,
    database,
    selectedConnections,
    useFederatedEngine,
    sqlQuery,
    activeQueryTabId,
    setExecutionResult,
    setExecutionError,
    saveToHistory,
    loadTableSuggestionsWithRefresh
  } = options

  const navigationStore = useExplorerNavigationStore()
  const overviewStore = useDatabaseOverviewStore()
  const logsStore = useLogsStore()

  // Unwrap refs to computed values
  const modeValue = computed(() => mode.value)
  const connectionIdValue = computed(() => connectionId.value)
  const databaseValue = computed(() => database?.value)

  const isExecuting = ref(false)
  const shouldLogLocally = () => !sseLogsService.isActive()

  async function executeQuery() {
    const query = sqlQuery.value.trim()
    if (!query) return

    if (useFederatedEngine.value) {
      await executeFederated(query)
    } else if (modeValue.value === 'file') {
      await executeFile(query)
    } else {
      await executeDatabase(query)
    }
  }

  async function executeFederated(query: string) {
    // Allow file queries without connections
    if (selectedConnections.value.length === 0 && !isDuckDbFileQuery(query)) {
      setExecutionError(
        'Select at least one data source (or query files with read_parquet/read_csv)'
      )
      return
    }

    // Help catch a common confusion when users add data sources but keep unqualified table names
    if (
      selectedConnections.value.length > 0 &&
      !isDuckDbFileQuery(query) &&
      /\b(from|join|update|into|delete)\b/i.test(query)
    ) {
      const hasAliasReference = selectedConnections.value.some((c) => {
        if (!c.alias) return false
        return new RegExp(`\\b${escapeRegExp(c.alias)}\\.`, 'i').test(query)
      })
      if (!hasAliasReference) {
        setExecutionError(
          'Federated queries must reference tables using aliases (e.g. pg1.public.table, my1.db.table)'
        )
        return
      }
    }

    isExecuting.value = true
    const startTime = Date.now()

    try {
      const result = await executeFederatedQuery({
        query,
        connections: selectedConnections.value
      })

      const columns = result.columns || []
      const rows = (result.rows || []).map((row) => {
        const obj: Record<string, unknown> = {}
        columns.forEach((col, idx) => {
          obj[col] = row[idx]
        })
        return obj
      })

      const duration = result.duration || Date.now() - startTime

      setExecutionResult({
        columns,
        rows,
        stats: { rowCount: result.count || rows.length, duration }
      })

      if (shouldLogLocally()) {
        logsStore.addSQLLog({
          id: `federated-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
          connectionId: 'federated',
          tabId: activeQueryTabId.value || undefined,
          database: selectedConnections.value.map((c) => c.alias).join(', '),
          query,
          purpose: detectQueryPurpose(query),
          startedAt: new Date(startTime).toISOString(),
          durationMs: duration,
          rowCount: rows.length
        })
      }

      saveToHistory(query)
    } catch (error: unknown) {
      const err = error as Error
      const errorMsg = err.message || 'Failed to execute federated query'
      const duration = Date.now() - startTime

      setExecutionError(errorMsg)

      if (shouldLogLocally()) {
        logsStore.addSQLLog({
          id: `federated-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
          connectionId: 'federated',
          tabId: activeQueryTabId.value || undefined,
          database: selectedConnections.value.map((c) => c.alias).join(', '),
          query,
          purpose: detectQueryPurpose(query),
          startedAt: new Date(startTime).toISOString(),
          durationMs: duration,
          rowCount: 0,
          error: errorMsg
        })
      }
    } finally {
      isExecuting.value = false
    }
  }

  async function executeFile(query: string) {
    isExecuting.value = true
    const startTime = Date.now()

    try {
      const result = await executeFileQuery(query, connectionIdValue.value)
      handleSuccessResult(result, query, startTime)
    } catch (error: unknown) {
      handleErrorResult(error, query, startTime)
    } finally {
      isExecuting.value = false
    }
  }

  async function executeDatabase(query: string) {
    isExecuting.value = true
    const startTime = Date.now()

    try {
      const db = databaseValue.value?.trim() || undefined
      const result = await connections.executeQuery(connectionIdValue.value, query, db)
      handleSuccessResult(result, query, startTime)

      // Refresh sidebar/overview if backend reports a schema change
      if (result.affectedObjects?.length) {
        await handleDdlChange(result.affectedObjects)
      }
    } catch (error: unknown) {
      handleErrorResult(error, query, startTime)
    } finally {
      isExecuting.value = false
    }
  }

  function handleSuccessResult(result: ExecuteQueryApiResult, query: string, startTime: number) {
    const normalizedSets: NormalizedResultSet[] = []

    if (Array.isArray(result.results) && result.results.length > 0) {
      for (const set of result.results) {
        const cols = set.columns || []
        const rows = (set.rows || []).map((row) => {
          const obj: Record<string, unknown> = {}
          cols.forEach((col, idx) => {
            obj[col] = row[idx]
          })
          return obj
        })
        normalizedSets.push({
          columns: cols,
          rows,
          commandTag: set.commandTag,
          rowsAffected: set.rowsAffected
        })
      }
    } else {
      const cols = result.columns || []
      const rows = (result.rows || []).map((row) => {
        const obj: Record<string, unknown> = {}
        cols.forEach((col, idx) => {
          obj[col] = row[idx]
        })
        return obj
      })
      normalizedSets.push({ columns: cols, rows })
    }

    let primary = normalizedSets.find((s) => s.columns.length > 0)
    if (!primary) primary = normalizedSets[0]
    if (!primary) primary = { columns: [], rows: [] }

    const totalRowCount = normalizedSets.reduce((acc, s) => acc + s.rows.length, 0)
    const duration = Date.now() - startTime

    setExecutionResult({
      columns: primary.columns,
      rows: primary.rows,
      resultSets: normalizedSets,
      stats: { rowCount: totalRowCount, duration }
    })

    // Log the SQL query
    if (shouldLogLocally()) {
      logsStore.addSQLLog({
        id: `sql-console-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
        connectionId: connectionIdValue.value,
        tabId: activeQueryTabId.value || undefined,
        database: modeValue.value === 'file' ? '' : databaseValue.value || '',
        query: query,
        purpose: detectQueryPurpose(query),
        startedAt: new Date(startTime).toISOString(),
        durationMs: duration,
        rowCount: totalRowCount
      })
    }

    saveToHistory(query)
  }

  function handleErrorResult(error: unknown, query: string, startTime: number) {
    const err = error as Error
    const errorMsg = err.message || 'Failed to execute query'
    const duration = Date.now() - startTime

    setExecutionError(errorMsg)

    if (shouldLogLocally()) {
      logsStore.addSQLLog({
        id: `sql-console-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
        connectionId: connectionIdValue.value,
        tabId: activeQueryTabId.value || undefined,
        database: modeValue.value === 'file' ? '' : databaseValue.value || '',
        query: query,
        purpose: detectQueryPurpose(query),
        startedAt: new Date(startTime).toISOString(),
        durationMs: duration,
        rowCount: 0,
        error: errorMsg
      })
    }
  }

  async function handleDdlChange(affectedObjects: string[]) {
    const db = databaseValue.value?.trim()

    if (affectedObjects.includes('database') || affectedObjects.includes('schema')) {
      navigationStore.invalidateDatabases(connectionIdValue.value)
      await navigationStore.ensureDatabases(connectionIdValue.value, true)
    }

    if (affectedObjects.includes('table') && db) {
      navigationStore.invalidateMetadata(connectionIdValue.value, db)
      // Clear overview cache so it refetches with fresh table stats
      overviewStore.clearOverview(connectionIdValue.value, db)
      await navigationStore.ensureMetadata(connectionIdValue.value, db, true)
      // Refresh autocomplete suggestions with forced metadata refresh
      if (loadTableSuggestionsWithRefresh) {
        await loadTableSuggestionsWithRefresh(true)
      }
      // Refresh overview in background (don't await - let it update reactively)
      overviewStore.fetchOverview(connectionIdValue.value, db, true)
    }
  }

  return {
    isExecuting,
    executeQuery
  }
}

export type QueryExecutionReturn = ReturnType<typeof useQueryExecution>
