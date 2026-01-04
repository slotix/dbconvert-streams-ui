import { useConnectionsStore } from '@/stores/connections'
import { useSqlConsoleStore } from '@/stores/sqlConsole'
import { usePaneTabsStore } from '@/stores/paneTabs'
import { useExplorerViewStateStore } from '@/stores/explorerViewState'
import { getSqlDialectFromConnection, getConnectionKindFromSpec } from '@/types/specs'

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
}

export function useSqlConsoleActions() {
  const connectionsStore = useConnectionsStore()
  const sqlConsoleStore = useSqlConsoleStore()
  const paneTabsStore = usePaneTabsStore()
  const viewStateStore = useExplorerViewStateStore()

  /**
   * Quote identifier based on SQL dialect
   */
  function quoteIdentifier(name: string, dialect: string | null): string {
    if (dialect === 'mysql') return `\`${name}\``
    if (dialect === 'pgsql') return `"${name}"`
    return name
  }

  /**
   * Generate a SELECT query for a table with proper dialect-specific quoting
   */
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

  /**
   * Generate DuckDB read function call based on file extension
   * For directories, uses glob pattern to read all files
   */
  function generateDuckDBReadQuery(
    path: string,
    fileName: string,
    isDir: boolean = false,
    format?: string
  ): string {
    // For directories, use glob pattern with appropriate read function
    if (isDir) {
      const joinPath = (prefix: string, suffix: string) => {
        const cleanedSuffix = suffix.replace(/^\/+/, '')
        if (prefix === '') return cleanedSuffix
        return prefix.endsWith('/') ? `${prefix}${cleanedSuffix}` : `${prefix}/${cleanedSuffix}`
      }

      const fmt = format?.toLowerCase()
      if (fmt === 'parquet') {
        const fullPath = joinPath(path, '*.parquet')
        return `SELECT * FROM read_parquet('${fullPath}') LIMIT 100;`
      } else if (fmt === 'json' || fmt === 'jsonl') {
        const fullPath = joinPath(path, '*.json*')
        return `SELECT * FROM read_json_auto('${fullPath}') LIMIT 100;`
      }

      // Default to csv_auto which handles most formats
      const fullPath = joinPath(path, '*.*')
      return `SELECT * FROM read_csv_auto('${fullPath}') LIMIT 100;`
    }

    // Get file extension (handle compressed files like .csv.gz)
    const lowerName = fileName.toLowerCase()
    let ext = ''

    if (
      lowerName.endsWith('.csv') ||
      lowerName.endsWith('.csv.gz') ||
      lowerName.endsWith('.csv.zst')
    ) {
      ext = 'csv'
    } else if (
      lowerName.endsWith('.json') ||
      lowerName.endsWith('.json.gz') ||
      lowerName.endsWith('.json.zst')
    ) {
      ext = 'json'
    } else if (
      lowerName.endsWith('.jsonl') ||
      lowerName.endsWith('.jsonl.gz') ||
      lowerName.endsWith('.jsonl.zst')
    ) {
      ext = 'jsonl'
    } else if (lowerName.endsWith('.parquet')) {
      ext = 'parquet'
    }

    // Generate the appropriate read function
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

  /**
   * Open SQL Console with a SELECT query for a specific table
   * Used by both context menu and Data tab toolbar button
   */
  function openTableInSqlConsole(payload: OpenTableSqlConsolePayload): void {
    const { connectionId, database, tableName, schema } = payload
    const consoleKey = `${connectionId}:${database}`

    // Get connection to determine dialect for proper quoting
    const conn = connectionsStore.connectionByID(connectionId)
    const dialect = getSqlDialectFromConnection(conn?.spec, conn?.type)

    // Generate SELECT query
    const query = generateSelectQuery(tableName, schema, dialect)

    // Create table context for customizing templates
    const tableContext = {
      tableName,
      schema
    }

    // Create a new tab with the query
    sqlConsoleStore.addTabWithQuery(consoleKey, undefined, query, tableName, tableContext)

    // Open the SQL console pane tab
    const connection = connectionsStore.connectionByID(connectionId)
    const connName = connection?.name || 'SQL'
    const tabName = `${connName} → ${database}`

    paneTabsStore.addTab(
      paneTabsStore.activePane || 'left',
      {
        id: `sql-console:${connectionId}:${database}`,
        connectionId,
        database,
        name: tabName,
        tabType: 'sql-console',
        sqlScope: 'database'
      },
      'pinned'
    )

    // Switch view state to show tabs
    viewStateStore.setViewType('table-data')
  }

  /**
   * Open DuckDB Console with a read query for a file or directory
   * Used by both context menu and Data tab toolbar button for file connections
   */
  function openFileInDuckDbConsole(payload: OpenFileDuckDbConsolePayload): void {
    const { connectionId, filePath, fileName, isDir, format } = payload
    const consoleKey = `file:${connectionId}`

    // Get connection to determine if S3
    const conn = connectionsStore.connectionByID(connectionId)
    const kind = getConnectionKindFromSpec(conn?.spec)
    if (kind !== 'files' && kind !== 's3') {
      return
    }
    const isS3 = kind === 's3'

    // Generate DuckDB read query
    const query = generateDuckDBReadQuery(filePath, fileName, isDir, format)

    // Create file context for customizing templates
    const fileContext = {
      path: filePath,
      format,
      isS3
    }

    // Create a new tab with the query
    sqlConsoleStore.addTabWithQuery(consoleKey, undefined, query, fileName, undefined, fileContext)

    // Get base path for the console
    const basePath = isS3 ? conn?.spec?.s3?.scope?.bucket : conn?.spec?.files?.basePath

    // Open the file console pane tab
    const tabId = `file-console:${connectionId}`

    paneTabsStore.addTab(
      paneTabsStore.activePane || 'left',
      {
        id: tabId,
        connectionId,
        name: conn?.name || 'Files',
        tabType: 'file-console',
        fileConnectionType: isS3 ? 's3' : 'files',
        basePath,
        objectKey: tabId
      },
      'pinned'
    )

    // Switch view state to show tabs
    viewStateStore.setViewType('table-data')
  }

  return {
    quoteIdentifier,
    generateSelectQuery,
    generateDuckDBReadQuery,
    openTableInSqlConsole,
    openFileInDuckDbConsole
  }
}
