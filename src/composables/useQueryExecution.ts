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
import { isDuckDbFileQuery } from '@/composables/useConsoleSources'

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

  function stripSqlComments(sql: string): string {
    return sql
      .replace(/\/\*[\s\S]*?\*\//g, ' ')
      .replace(/--.*$/gm, ' ')
      .replace(/#.*$/gm, ' ')
  }

  function extractCteNames(sql: string): Set<string> {
    const names = new Set<string>()
    const cteRegex = /\b(?:with\s+(?:recursive\s+)?|,)\s*([a-zA-Z_][\w$]*)\s+as\s*\(/gi
    let match: RegExpExecArray | null
    while ((match = cteRegex.exec(sql)) !== null) {
      const raw = match[1]
      if (raw) names.add(raw.toLowerCase())
    }
    return names
  }

  function normalizeIdentifierPart(part: string): string {
    return part.replace(/^[`"'[]+|[`"'\]]+$/g, '').toLowerCase()
  }

  function extractReferencedAliases(query: string): Set<string> {
    const aliases = new Set<string>()
    const cleaned = stripSqlComments(query)
    const cteNames = extractCteNames(cleaned)
    const refRegex = /\b(from|join|update|into|delete\s+from)\s+([^\s,;]+)/gi
    let match: RegExpExecArray | null

    while ((match = refRegex.exec(cleaned)) !== null) {
      let token = (match[2] || '').trim()
      if (!token) continue

      token = token.replace(/[);]+$/g, '')
      const lowered = token.toLowerCase()

      if (!token || token.startsWith('(')) continue
      if (lowered === 'only' || lowered === 'lateral') continue
      if (
        lowered.startsWith('read_') ||
        lowered.startsWith('parquet_') ||
        lowered.startsWith('csv_') ||
        lowered.startsWith('json_')
      ) {
        continue
      }
      if (token.includes('(')) continue

      const parts = token
        .split('.')
        .map((p) => p.trim())
        .filter(Boolean)

      if (parts.length < 2) {
        const maybeCte = normalizeIdentifierPart(token)
        if (cteNames.has(maybeCte)) continue
        continue
      }

      aliases.add(normalizeIdentifierPart(parts[0]))
    }

    return aliases
  }

  function validateFederatedTableReferences(query: string, aliases: string[]): string | null {
    if (aliases.length === 0) return null

    const aliasSet = new Set(aliases.map((a) => a.toLowerCase()))
    aliasSet.add('memory')

    const cleaned = stripSqlComments(query)
    const cteNames = extractCteNames(cleaned)
    const refRegex = /\b(from|join|update|into|delete\s+from)\s+([^\s,;]+)/gi
    const invalidRefs = new Set<string>()
    let match: RegExpExecArray | null

    while ((match = refRegex.exec(cleaned)) !== null) {
      let token = (match[2] || '').trim()
      if (!token) continue

      token = token.replace(/[);]+$/g, '')
      const lowered = token.toLowerCase()

      if (!token || token.startsWith('(')) continue
      if (lowered === 'only' || lowered === 'lateral') continue
      if (
        lowered.startsWith('read_') ||
        lowered.startsWith('parquet_') ||
        lowered.startsWith('csv_') ||
        lowered.startsWith('json_')
      ) {
        continue
      }
      if (token.includes('(')) continue

      const parts = token
        .split('.')
        .map((p) => p.trim())
        .filter(Boolean)
      if (parts.length < 2) {
        const maybeCte = normalizeIdentifierPart(token)
        if (!cteNames.has(maybeCte)) {
          invalidRefs.add(token)
        }
        continue
      }

      const alias = normalizeIdentifierPart(parts[0])
      if (!aliasSet.has(alias)) {
        invalidRefs.add(token)
      }
    }

    if (invalidRefs.size === 0) return null

    const offending = Array.from(invalidRefs).slice(0, 3).join(', ')
    return `Federated mode requires alias-qualified tables (e.g. pg1.public.table, my1.db.table). Invalid references: ${offending}`
  }

  async function executeQuery() {
    const query = sqlQuery.value.trim()
    if (!query) return

    if (!useFederatedEngine.value) {
      const availableAliases = new Set(
        selectedConnections.value
          .map((c) => c.alias?.trim().toLowerCase())
          .filter((a): a is string => Boolean(a))
      )
      availableAliases.add('memory')

      const referencedAliases = extractReferencedAliases(query)
      const conflictingAliases = Array.from(referencedAliases).filter((a) =>
        availableAliases.has(a)
      )

      if (conflictingAliases.length > 0) {
        setExecutionError(
          `This query references source aliases (${conflictingAliases.join(', ')}). Switch to Multi-source mode to run federated queries.`
        )
        return
      }
    }

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

    // Federated mode requires explicit alias-qualified table references.
    if (selectedConnections.value.length > 0 && !isDuckDbFileQuery(query)) {
      const aliases = selectedConnections.value
        .map((c) => c.alias?.trim())
        .filter((a): a is string => Boolean(a))

      const validationError = validateFederatedTableReferences(query, aliases)
      if (validationError) {
        setExecutionError(validationError)
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
    const selectionDb =
      navigationStore.selection?.connectionId === connectionIdValue.value
        ? navigationStore.selection?.database
        : undefined
    const db = databaseValue.value?.trim() || selectionDb?.trim()
    const hasDatabaseChange = affectedObjects.includes('database')
    const hasSchemaChange = affectedObjects.includes('schema')
    const hasTableChange = affectedObjects.includes('table')

    if (hasDatabaseChange || hasSchemaChange) {
      navigationStore.invalidateDatabases(connectionIdValue.value)
      await navigationStore.ensureDatabases(connectionIdValue.value, true)
    }

    if (hasTableChange || hasSchemaChange) {
      const refreshTargets = new Set<string>()
      if (db) {
        refreshTargets.add(db)
      } else {
        const cachedMetadata = navigationStore.metadataState[connectionIdValue.value]
        if (cachedMetadata) {
          for (const dbName of Object.keys(cachedMetadata)) {
            if (dbName) refreshTargets.add(dbName)
          }
        }
        const prefix = `${connectionIdValue.value}:`
        for (const dbKey of navigationStore.expandedDatabases) {
          if (!dbKey.startsWith(prefix)) continue
          const dbName = dbKey.slice(prefix.length)
          if (dbName) refreshTargets.add(dbName)
        }
      }

      const refreshes: Promise<unknown>[] = []
      for (const targetDb of refreshTargets) {
        navigationStore.invalidateMetadata(connectionIdValue.value, targetDb)
        // Clear overview cache so it refetches with fresh schema/table stats
        overviewStore.clearOverview(connectionIdValue.value, targetDb)
        refreshes.push(navigationStore.ensureMetadata(connectionIdValue.value, targetDb, true))
        // Refresh overview in background (don't await - let it update reactively)
        overviewStore.fetchOverview(connectionIdValue.value, targetDb, true)
      }

      if (refreshes.length > 0) {
        await Promise.all(refreshes)
        // Refresh autocomplete suggestions with forced metadata refresh
        if (loadTableSuggestionsWithRefresh) {
          await loadTableSuggestionsWithRefresh(true)
        }
      }
    }
  }

  return {
    isExecuting,
    executeQuery
  }
}

export type QueryExecutionReturn = ReturnType<typeof useQueryExecution>
