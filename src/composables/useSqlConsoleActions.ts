import { useConnectionsStore } from '@/stores/connections'
import { useExplorerViewStateStore } from '@/stores/explorerViewState'
import { usePaneTabsStore, createConsoleSessionId } from '@/stores/paneTabs'
import { useSqlConsoleStore } from '@/stores/sqlConsole'
import { useUnsavedChangesGuard } from '@/composables/useUnsavedChangesGuard'
import { getConnectionKindFromSpec, getSqlDialectFromConnection } from '@/types/specs'

export interface OpenTableSqlConsolePayload {
  connectionId: string
  database: string
  tableName: string
  schema?: string
}

export interface OpenFileDuckDbConsolePayload {
  connectionId: string
  filePath: string
  fileName: string
  isDir?: boolean
  format?: string
  query?: string
}

export function useSqlConsoleActions() {
  const connectionsStore = useConnectionsStore()
  const sqlConsoleStore = useSqlConsoleStore()
  const paneTabsStore = usePaneTabsStore()
  const viewStateStore = useExplorerViewStateStore()
  const { confirmLeavePaneIfDirty } = useUnsavedChangesGuard()

  function quoteIdentifier(name: string, dialect: string | null): string {
    if (dialect === 'mysql') return `\`${name}\``
    if (dialect === 'pgsql') return `"${name}"`
    return name
  }

  function generateSelectQuery(
    tableName: string,
    schema: string | undefined,
    dialect: string | null
  ): string {
    const quotedTable = schema
      ? `${quoteIdentifier(schema, dialect)}.${quoteIdentifier(tableName, dialect)}`
      : quoteIdentifier(tableName, dialect)
    return `SELECT * FROM ${quotedTable} LIMIT 100;`
  }

  function generateDuckDBReadQuery(
    path: string,
    fileName: string,
    isDir: boolean = false,
    format?: string
  ): string {
    const joinPath = (prefix: string, suffix: string) => {
      const cleanedSuffix = suffix.replace(/^\/+/, '')
      if (prefix === '') return cleanedSuffix
      return prefix.endsWith('/') ? `${prefix}${cleanedSuffix}` : `${prefix}/${cleanedSuffix}`
    }

    if (isDir) {
      const fmt = format?.toLowerCase()
      if (fmt === 'parquet') {
        const fullPath = joinPath(path, '*.parquet')
        return `SELECT * FROM read_parquet('${fullPath}') LIMIT 100;`
      }
      if (fmt === 'json' || fmt === 'jsonl') {
        const fullPath = joinPath(path, '*.*')
        return `SELECT * FROM read_json_auto('${fullPath}') LIMIT 100;`
      }

      const fullPath = joinPath(path, '*.*')
      return `SELECT * FROM read_csv_auto('${fullPath}') LIMIT 100;`
    }

    const lowerName = fileName.toLowerCase()
    let ext = lowerName.split('.').pop() || ''

    if (lowerName.endsWith('.csv.gz') || lowerName.endsWith('.csv.zst')) {
      ext = 'csv'
    } else if (lowerName.endsWith('.json.gz') || lowerName.endsWith('.json.zst')) {
      ext = 'json'
    } else if (lowerName.endsWith('.jsonl.gz') || lowerName.endsWith('.jsonl.zst')) {
      ext = 'jsonl'
    }

    let funcCall: string
    switch (ext) {
      case 'csv':
        funcCall = `read_csv_auto('${path}')`
        break
      case 'json':
      case 'jsonl':
        funcCall = `read_json_auto('${path}')`
        break
      case 'parquet':
        funcCall = `read_parquet('${path}')`
        break
      default:
        funcCall = `read_csv_auto('${path}')`
    }

    return `SELECT * FROM ${funcCall} LIMIT 100;`
  }

  function openTableInSqlConsole(payload: OpenTableSqlConsolePayload): void {
    ;(async () => {
      const targetPane = paneTabsStore.activePane || 'left'
      const ok = await confirmLeavePaneIfDirty(targetPane)
      if (!ok) return

      const { connectionId, database, tableName, schema } = payload

      const conn = connectionsStore.connectionByID(connectionId)
      const dialect = getSqlDialectFromConnection(conn?.spec, conn?.type)
      const query = generateSelectQuery(tableName, schema, dialect)
      const consoleSessionKey = createConsoleSessionId()
      const tabId = `sql-console:${consoleSessionKey}`

      const tableContext = { tableName, schema }
      sqlConsoleStore.addTabWithQuery(consoleSessionKey, database, query, tableName, tableContext)

      const connection = connectionsStore.connectionByID(connectionId)
      const connName = connection?.name || 'SQL'
      const tabName = `${connName} → ${database}`

      paneTabsStore.addTab(
        targetPane,
        {
          id: tabId,
          connectionId,
          database,
          name: tabName,
          consoleSessionId: consoleSessionKey,
          tabType: 'sql-console',
          sqlScope: 'database',
          objectKey: tabId
        },
        'pinned'
      )

      viewStateStore.setViewType('table-data')
    })().catch(console.error)
  }

  function openFileInDuckDbConsole(payload: OpenFileDuckDbConsolePayload): void {
    ;(async () => {
      const targetPane = paneTabsStore.activePane || 'left'
      const ok = await confirmLeavePaneIfDirty(targetPane)
      if (!ok) return

      const { connectionId, filePath, fileName, isDir, format, query: providedQuery } = payload

      const conn = connectionsStore.connectionByID(connectionId)
      const kind = getConnectionKindFromSpec(conn?.spec)
      if (kind !== 'files' && kind !== 's3') {
        return
      }
      const isS3 = kind === 's3'
      const consoleSessionKey = createConsoleSessionId()
      const tabId = `file-console:${consoleSessionKey}`

      const query = providedQuery?.trim()
        ? providedQuery
        : generateDuckDBReadQuery(filePath, fileName, Boolean(isDir), format)
      const fileContext = { path: filePath, format, isS3 }
      sqlConsoleStore.addTabWithQuery(
        consoleSessionKey,
        undefined,
        query,
        fileName,
        undefined,
        fileContext
      )

      const basePath = isS3 ? conn?.spec?.s3?.scope?.bucket : conn?.spec?.files?.basePath

      paneTabsStore.addTab(
        targetPane,
        {
          id: tabId,
          connectionId,
          name: conn?.name || 'Files',
          consoleSessionId: consoleSessionKey,
          tabType: 'file-console',
          fileConnectionType: isS3 ? 's3' : 'files',
          basePath,
          objectKey: tabId
        },
        'pinned'
      )

      viewStateStore.setViewType('table-data')
    })().catch(console.error)
  }

  return {
    quoteIdentifier,
    generateSelectQuery,
    generateDuckDBReadQuery,
    openTableInSqlConsole,
    openFileInDuckDbConsole
  }
}
