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
import { detectQueryPurpose, type QueryHistoryContext } from '@/composables/useConsoleTab'
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
  selectedConnections: Ref<ConnectionMapping[]> | ComputedRef<ConnectionMapping[]>
  /** Explicit single-source target when run mode is single */
  singleSourceMapping?: ComputedRef<ConnectionMapping | null> | Ref<ConnectionMapping | null>
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
  saveToHistory: (query: string, context?: QueryHistoryContext) => void
  /** Optional confirmation callback for potentially destructive SQL */
  confirmDestructiveQuery?: (query: string) => Promise<boolean>
  /** Optional validation callback for single-source database execution target */
  validateDatabaseTarget?: (target: {
    connectionId: string
    database?: string
    alias?: string
  }) => string | null
}

export interface UseQueryExecutionReturn {
  isExecuting: Ref<boolean>
  executeQuery: (queryOverride?: string) => Promise<void>
}

export function validateDatabaseExecutionTarget(target: { database?: string }): string | null {
  const database = target.database?.trim()
  if (!database) {
    return 'Select database in Query Session before running direct database queries.'
  }

  return null
}

function mapRowsToObjects(columns: string[], rowTuples: unknown[][]): Record<string, unknown>[] {
  return (rowTuples || []).map((tuple) => {
    const obj: Record<string, unknown> = {}
    columns.forEach((col, idx) => {
      obj[col] = (tuple || [])[idx]
    })
    return obj
  })
}

function splitSqlStatements(query: string): string[] {
  return query
    .split(';')
    .map((statement) => statement.trim())
    .filter(Boolean)
}

function removeSqlComments(sql: string): string {
  return sql
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/--.*$/gm, ' ')
    .replace(/#.*$/gm, ' ')
}

function startsWithKeyword(statement: string, keyword: string): boolean {
  return new RegExp(`^\\s*${keyword}\\b`, 'i').test(statement)
}

function hasWhereClause(statement: string): boolean {
  return /\bWHERE\b/i.test(statement)
}

export function isPotentiallyDestructiveQuery(query: string): boolean {
  const statements = splitSqlStatements(removeSqlComments(query))
  if (statements.length === 0) return false

  return statements.some((statement) => {
    if (startsWithKeyword(statement, 'DROP') || startsWithKeyword(statement, 'TRUNCATE')) {
      return true
    }

    if (startsWithKeyword(statement, 'DELETE')) {
      return !hasWhereClause(statement)
    }

    if (startsWithKeyword(statement, 'UPDATE')) {
      return !hasWhereClause(statement)
    }

    return false
  })
}

export function useQueryExecution(options: UseQueryExecutionOptions): UseQueryExecutionReturn {
  const {
    mode,
    connectionId,
    selectedConnections,
    singleSourceMapping,
    useFederatedEngine,
    sqlQuery,
    activeQueryTabId,
    setExecutionResult,
    setExecutionError,
    saveToHistory,
    confirmDestructiveQuery,
    validateDatabaseTarget
  } = options

  const navigationStore = useExplorerNavigationStore()
  const overviewStore = useDatabaseOverviewStore()
  const logsStore = useLogsStore()

  // Unwrap refs to computed values
  const modeValue = computed(() => mode.value)
  const connectionIdValue = computed(() => connectionId.value)
  const singleSourceMappingValue = computed(() => singleSourceMapping?.value || null)

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

  interface ParsedTableRef {
    /** Original token from the SQL (e.g. "pg1.public.users") */
    raw: string
    /** Dot-split parts with quotes stripped and lowercased */
    parts: string[]
    /** Whether the reference is CTE-only (single-part that matches a CTE name) */
    isCte: boolean
  }

  function parseTableReferences(query: string): ParsedTableRef[] {
    const cleaned = stripSqlComments(query)
    const cteNames = extractCteNames(cleaned)
    const refRegex = /\b(from|join|update|into|delete\s+from)\s+([^\s,;]+)/gi
    const refs: ParsedTableRef[] = []
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
        .map((p) => normalizeIdentifierPart(p.trim()))
        .filter(Boolean)

      const isCte = parts.length === 1 && cteNames.has(parts[0])
      refs.push({ raw: token, parts, isCte })
    }

    return refs
  }

  function extractReferencedAliases(query: string): Set<string> {
    const aliases = new Set<string>()
    for (const ref of parseTableReferences(query)) {
      if (ref.isCte || ref.parts.length < 2) continue
      aliases.add(ref.parts[0])
    }
    return aliases
  }

  function validateFederatedTableReferences(query: string, aliases: string[]): string | null {
    if (aliases.length === 0) return null

    const aliasSet = new Set(aliases.map((a) => a.toLowerCase()))
    aliasSet.add('memory')

    const invalidRefs = new Set<string>()
    for (const ref of parseTableReferences(query)) {
      if (ref.isCte) continue
      if (ref.parts.length < 2) {
        invalidRefs.add(ref.raw)
        continue
      }
      if (!aliasSet.has(ref.parts[0])) {
        invalidRefs.add(ref.raw)
      }
    }

    if (invalidRefs.size === 0) return null

    const offending = Array.from(invalidRefs).slice(0, 3).join(', ')
    return `Federated mode requires alias-qualified tables (e.g. pg1.public.table, my1.db.table). Invalid references: ${offending}`
  }

  async function executeQuery(queryOverride?: string) {
    if (isExecuting.value) {
      return
    }

    const query = (queryOverride ?? sqlQuery.value).trim()
    if (!query) {
      return
    }

    if (confirmDestructiveQuery && isPotentiallyDestructiveQuery(query)) {
      const confirmed = await confirmDestructiveQuery(query)
      if (!confirmed) return
    }

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
      const rows = mapRowsToObjects(columns, result.rows || [])

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

      const aliases = selectedConnections.value
        .map((connection) => connection.alias?.trim())
        .filter((alias): alias is string => Boolean(alias))

      saveToHistory(query, {
        mode: 'federated',
        alias: aliases.length === 1 ? aliases[0] : undefined,
        aliases: aliases.length > 0 ? aliases : undefined
      })
    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to execute federated query'
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
      const fileScopePath =
        selectedConnections.value.find(
          (mapping) => mapping.connectionId === connectionIdValue.value
        )?.database || undefined

      const result = await executeFileQuery(query, connectionIdValue.value, fileScopePath)
      await handleSuccessResult(result, query, startTime, {
        connectionId: connectionIdValue.value,
        database: '',
        historyContext: {
          mode: 'file',
          alias: 'files',
          sourceType: 'files'
        }
      })
    } catch (error: unknown) {
      handleErrorResult(error, query, startTime)
    } finally {
      isExecuting.value = false
    }
  }

  async function executeDatabase(query: string) {
    isExecuting.value = true
    const startTime = Date.now()
    const target = resolveSingleSourceTarget()

    const defaultValidationError = validateDatabaseExecutionTarget(target)
    if (defaultValidationError) {
      setExecutionError(defaultValidationError)
      isExecuting.value = false
      return
    }

    const customValidationError = validateDatabaseTarget?.(target)
    if (customValidationError) {
      setExecutionError(customValidationError)
      isExecuting.value = false
      return
    }

    try {
      const result = await connections.executeQuery(target.connectionId, query, target.database)
      await handleSuccessResult(result, query, startTime, {
        connectionId: target.connectionId,
        database: target.database || '',
        historyContext: {
          mode: 'single',
          alias: target.alias || undefined,
          sourceType: 'database'
        }
      })

      // Refresh sidebar/overview if backend reports a schema change
      if (result.affectedObjects?.length) {
        await handleDdlChange(result.affectedObjects, target.connectionId, target.database)
      }
    } catch (error: unknown) {
      handleErrorResult(error, query, startTime, {
        connectionId: target.connectionId,
        database: target.database || ''
      })
    } finally {
      isExecuting.value = false
    }
  }

  function resolveSingleSourceTarget(): {
    connectionId: string
    database?: string
    alias?: string
  } {
    const selectedSingle = singleSourceMappingValue.value

    return {
      connectionId: selectedSingle?.connectionId || connectionIdValue.value,
      database: selectedSingle?.database?.trim() || undefined,
      alias: selectedSingle?.alias?.trim() || undefined
    }
  }

  async function handleSuccessResult(
    result: ExecuteQueryApiResult,
    query: string,
    startTime: number,
    executionContext?: {
      connectionId: string
      database: string
      historyContext?: QueryHistoryContext
    }
  ) {
    const normalizedSets: NormalizedResultSet[] = []

    if (Array.isArray(result.results) && result.results.length > 0) {
      for (const set of result.results) {
        const cols = set.columns || []
        const rows = mapRowsToObjects(cols, set.rows || [])
        normalizedSets.push({
          columns: cols,
          rows,
          commandTag: set.commandTag,
          rowsAffected: set.rowsAffected
        })
      }
    } else {
      const cols = result.columns || []
      const rows = mapRowsToObjects(cols, result.rows || [])
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
        connectionId: executionContext?.connectionId || connectionIdValue.value,
        tabId: activeQueryTabId.value || undefined,
        database: modeValue.value === 'file' ? '' : (executionContext?.database ?? ''),
        query: query,
        purpose: detectQueryPurpose(query),
        startedAt: new Date(startTime).toISOString(),
        durationMs: duration,
        rowCount: totalRowCount
      })
    }

    saveToHistory(query, executionContext?.historyContext)
  }

  function handleErrorResult(
    error: unknown,
    query: string,
    startTime: number,
    executionContext?: { connectionId: string; database: string }
  ) {
    const errorMsg = error instanceof Error ? error.message : 'Failed to execute query'
    const duration = Date.now() - startTime

    setExecutionError(errorMsg)

    if (shouldLogLocally()) {
      logsStore.addSQLLog({
        id: `sql-console-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
        connectionId: executionContext?.connectionId || connectionIdValue.value,
        tabId: activeQueryTabId.value || undefined,
        database: modeValue.value === 'file' ? '' : (executionContext?.database ?? ''),
        query: query,
        purpose: detectQueryPurpose(query),
        startedAt: new Date(startTime).toISOString(),
        durationMs: duration,
        rowCount: 0,
        error: errorMsg
      })
    }
  }

  async function handleDdlChange(
    affectedObjects: string[],
    targetConnectionId: string,
    targetDatabase?: string
  ) {
    const selectionDb =
      navigationStore.selection?.connectionId === targetConnectionId
        ? navigationStore.selection?.database
        : undefined
    const db = targetDatabase?.trim() || selectionDb?.trim()
    const hasDatabaseChange = affectedObjects.includes('database')
    const hasSchemaChange = affectedObjects.includes('schema')
    const hasTableChange = affectedObjects.includes('table')

    if (hasDatabaseChange || hasSchemaChange) {
      navigationStore.invalidateDatabases(targetConnectionId)
      await navigationStore.ensureDatabases(targetConnectionId, true)
    }

    if (hasTableChange || hasSchemaChange) {
      const refreshTargets = new Set<string>()
      if (db) {
        refreshTargets.add(db)
      } else {
        const cachedMetadata = navigationStore.metadataState[targetConnectionId]
        if (cachedMetadata) {
          for (const dbName of Object.keys(cachedMetadata)) {
            if (dbName) refreshTargets.add(dbName)
          }
        }
        const prefix = `${targetConnectionId}:`
        for (const dbKey of navigationStore.expandedDatabases) {
          if (!dbKey.startsWith(prefix)) continue
          const dbName = dbKey.slice(prefix.length)
          if (dbName) refreshTargets.add(dbName)
        }
      }

      const refreshes: Promise<unknown>[] = []
      for (const targetDb of refreshTargets) {
        navigationStore.invalidateMetadata(targetConnectionId, targetDb)
        // Clear overview cache so it refetches with fresh schema/table stats
        overviewStore.clearOverview(targetConnectionId, targetDb)
        refreshes.push(navigationStore.ensureMetadata(targetConnectionId, targetDb, true))
        // Refresh overview in background (don't await - let it update reactively)
        overviewStore.fetchOverview(targetConnectionId, targetDb, true)
      }

      if (refreshes.length > 0) {
        await Promise.all(refreshes)
      }
    }
  }

  return {
    isExecuting,
    executeQuery
  }
}

export type QueryExecutionReturn = ReturnType<typeof useQueryExecution>
