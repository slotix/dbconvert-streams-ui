/**
 * Stream-based export composable for large dataset exports.
 *
 * Creates a stream to export data from the current table with filters/sorts applied.
 * Used when data is too large for client-side export.
 *
 * Features:
 * - Shared file connection for all exports (created once, reused)
 * - Custom SQL query support (with WHERE, ORDER BY, LIMIT)
 * - Navigates to stream monitor after starting export
 */

import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useConnectionsStore } from '@/stores/connections'
import { useStreamsStore } from '@/stores/streamConfig'
import { useMonitoringStore } from '@/stores/monitoring'
import { useObjectTabStateStore } from '@/stores/objectTabState'
import { updateStreamsViewState } from '@/utils/streamsViewState'
import connectionsApi from '@/api/connections'
import streamsApi from '@/api/streams'
import type { Connection } from '@/types/connections'
import type { StreamConfig, QuerySource } from '@/types/streamConfig'
import { buildFileTargetSpec } from '@/utils/specBuilder'
import { buildPanelClauses } from '@/components/query'

// Local storage key for the shared export connection ID
const EXPORT_CONNECTION_KEY = 'dbconvert-export-connection-id'
const EXPORT_CONNECTION_NAME = 'Data Explorer Export'

export type StreamExportFormat = 'csv' | 'jsonl' | 'parquet'

export interface StreamExportOptions {
  /** Source connection ID */
  connectionId: string
  /** Database name */
  database: string
  /** Schema name (optional) */
  schema?: string
  /** Table name */
  table: string
  /** Export format */
  format: StreamExportFormat
  /** Object key for query filter store (to get current filters/sorts) */
  objectKey?: string
  /** SQL dialect for building query */
  dialect?: 'mysql' | 'pgsql' | 'sql'
  /** Custom WHERE clause (if not using objectKey) */
  whereClause?: string
  /** Custom ORDER BY columns (comma-separated) */
  orderByColumns?: string
  /** Custom ORDER BY directions (comma-separated ASC/DESC) */
  orderByDirections?: string
  /** Row limit */
  limit?: number
}

export interface StreamExportResult {
  success: boolean
  streamConfigId?: string
  streamId?: string
  error?: string
}

export function useStreamExport() {
  const router = useRouter()
  const connectionsStore = useConnectionsStore()
  const streamsStore = useStreamsStore()
  const monitoringStore = useMonitoringStore()
  const tabStateStore = useObjectTabStateStore()

  const isExporting = ref(false)
  const exportError = ref<string | null>(null)

  /**
   * Get or create the shared export file connection.
   * This connection is reused for all data explorer exports.
   */
  async function getOrCreateExportConnection(): Promise<string> {
    // Check if we have a stored connection ID
    const storedConnectionId = localStorage.getItem(EXPORT_CONNECTION_KEY)

    if (storedConnectionId) {
      // Verify the connection still exists
      try {
        const connections = await connectionsApi.getConnections()
        const existingConnection = connections.find((c: Connection) => c.id === storedConnectionId)
        if (existingConnection) {
          return storedConnectionId
        }
      } catch (e) {
        console.warn('Failed to verify export connection, will create new one:', e)
      }
    }

    // Create a new file connection for exports
    // Using spec.files for local file connections (basePath only)
    const connectionData = {
      name: EXPORT_CONNECTION_NAME,
      type: 'files',
      spec: {
        files: {
          basePath: ''
        }
      }
    }

    const result = await connectionsApi.createConnection(connectionData)
    const newConnectionId = result.id

    // Store the connection ID for future use
    localStorage.setItem(EXPORT_CONNECTION_KEY, newConnectionId)

    // Refresh connections store
    await connectionsStore.refreshConnections()
    try {
      await connectionsApi.pingConnectionById(newConnectionId)
    } catch (e) {
      console.warn('Failed to initialize export connection path:', e)
    }

    return newConnectionId
  }

  /**
   * Build the custom SQL query for export based on current filters/sorts.
   * Note: Query is executed by DuckDB, so always use double quotes for identifiers.
   * DuckDB uses the connection alias as the catalog: "alias"."schema"."table" (Postgres),
   * or "alias"."table" (MySQL).
   */
  function buildExportQuery(options: StreamExportOptions): string {
    const {
      table,
      schema,
      dialect = 'sql',
      objectKey,
      whereClause,
      orderByColumns,
      orderByDirections,
      limit
    } = options

    // Always use double quotes - query is executed by DuckDB regardless of source dialect
    const quoteId = (name: string) => `"${name}"`

    // Build fully qualified table reference for DuckDB using the alias "src".
    const tableParts = [quoteId('src')]
    if (schema && dialect !== 'mysql') tableParts.push(quoteId(schema))
    tableParts.push(quoteId(table))
    const tableRef = tableParts.join('.')

    const queryParts: string[] = [`SELECT * FROM ${tableRef}`]

    // Get WHERE clause - either from params or from AG Grid panel state
    // Use 'pgsql' dialect for double quotes since query is executed by DuckDB
    let where = whereClause
    if (!where && objectKey) {
      const gridState = tabStateStore.getAGGridDataState(objectKey)
      if (gridState?.panelWhereSQL) {
        where = gridState.panelWhereSQL
      } else {
        const panelState = tabStateStore.getFilterPanelState(objectKey)
        if (panelState) {
          where = buildPanelClauses({
            filters: panelState.filters,
            sorts: panelState.sorts,
            limit: panelState.limit,
            dialect: 'pgsql',
            quoteColumns: true
          }).where
        }
      }
    }
    if (where) {
      queryParts.push(`WHERE ${where}`)
    }

    // Get ORDER BY - either from params or from AG Grid panel state
    let orderCols = orderByColumns
    let orderDirs = orderByDirections
    if (!orderCols && objectKey) {
      const gridState = tabStateStore.getAGGridDataState(objectKey)
      if (gridState?.sortModel?.length) {
        orderCols = gridState.sortModel.map((s) => s.colId).join(',')
        orderDirs = gridState.sortModel.map((s) => (s.sort || 'asc').toUpperCase()).join(',')
      } else {
        const panelState = tabStateStore.getFilterPanelState(objectKey)
        if (panelState) {
          const panelClauses = buildPanelClauses({
            filters: panelState.filters,
            sorts: panelState.sorts,
            limit: panelState.limit,
            dialect: 'pgsql',
            quoteColumns: true
          })
          orderCols = panelClauses.orderBy
          orderDirs = panelClauses.orderDir
        }
      }
    }

    if (orderCols) {
      const cols = orderCols.split(',').filter((c) => c.trim())
      const dirs = orderDirs?.split(',') || []
      const sortClauses = cols.map((col, i) => {
        const dir = dirs[i]?.trim().toUpperCase() || 'ASC'
        return `${quoteId(col.trim())} ${dir}`
      })
      if (sortClauses.length > 0) {
        queryParts.push(`ORDER BY ${sortClauses.join(', ')}`)
      }
    }

    // Add LIMIT if specified (options override panel state)
    let exportLimit = limit
    if ((!exportLimit || exportLimit <= 0) && objectKey) {
      const gridState = tabStateStore.getAGGridDataState(objectKey)
      if (gridState?.panelLimit && gridState.panelLimit > 0) {
        exportLimit = gridState.panelLimit
      } else {
        const panelState = tabStateStore.getFilterPanelState(objectKey)
        if (panelState) {
          const panelLimit = buildPanelClauses({
            filters: panelState.filters,
            sorts: panelState.sorts,
            limit: panelState.limit,
            dialect: 'pgsql',
            quoteColumns: true
          }).limit
          if (panelLimit && panelLimit > 0) {
            exportLimit = panelLimit
          }
        }
      }
    }
    if (exportLimit && exportLimit > 0) {
      queryParts.push(`LIMIT ${exportLimit}`)
    }

    return queryParts.join(' ')
  }

  /**
   * Create a stream config for export and return its ID.
   */
  async function createExportStreamConfig(
    options: StreamExportOptions,
    targetConnectionId: string
  ): Promise<string> {
    const { connectionId, database, schema, table, format } = options

    // Build the custom SQL query
    const query = buildExportQuery(options)

    // Create stream config
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
    const streamName = `Export ${table} to ${format.toUpperCase()} - ${timestamp}`

    // Use QuerySource for custom SQL queries (convert mode)
    const querySource: QuerySource = {
      name: table,
      query: query
    }

    // Build target spec for file output
    // Output goes to the connection's basePath
    // The backend handles file organization within that directory
    const targetSpec = buildFileTargetSpec(format)

    const streamConfig: Partial<StreamConfig> = {
      name: streamName,
      mode: 'convert',
      source: {
        connections: [
          {
            alias: 'src',
            connectionId,
            database: database,
            schema: schema,
            queries: [querySource]
          }
        ]
      },
      target: {
        id: targetConnectionId,
        spec: targetSpec
      }
    }

    // Create the stream config via API
    const createdConfig = await streamsApi.createStream(streamConfig as Record<string, unknown>)

    // Refresh streams store
    await streamsStore.refreshStreams()

    return createdConfig.id!
  }

  /**
   * Export a table to a file using stream-based processing.
   *
   * This will:
   * 1. Get or create a shared export file connection
   * 2. Create a stream config with the source table and custom SQL
   * 3. Start the stream
   * 4. Set up monitoring store to track the stream
   * 5. Navigate to the stream monitor
   */
  async function exportTable(options: StreamExportOptions): Promise<StreamExportResult> {
    isExporting.value = true
    exportError.value = null

    try {
      // Step 1: Get or create the shared export connection
      const targetConnectionId = await getOrCreateExportConnection()

      // Step 2: Create the stream config
      const streamConfigId = await createExportStreamConfig(options, targetConnectionId)

      // Step 3: Start the stream
      const streamId = await streamsApi.startStream(streamConfigId)

      // Step 4: Get the created stream config and set up monitoring
      const streamConfig = await streamsStore.getStreamConfigById(streamConfigId)
      if (streamConfig) {
        monitoringStore.setStream(streamId, streamConfig)
        monitoringStore.requestShowMonitorTab()
      }

      // Step 5: Navigate to streams view with the stream selected and monitor tab active
      updateStreamsViewState({ selectedStreamId: streamConfigId, tab: 'monitor' })

      router.push({ name: 'Streams' })

      return {
        success: true,
        streamConfigId,
        streamId
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to start export'
      exportError.value = errorMessage
      console.error('Stream export failed:', error)

      return {
        success: false,
        error: errorMessage
      }
    } finally {
      isExporting.value = false
    }
  }

  /**
   * Get the stored export connection ID (if any).
   */
  function getExportConnectionId(): string | null {
    return localStorage.getItem(EXPORT_CONNECTION_KEY)
  }

  /**
   * Clear the stored export connection ID.
   * Useful if the connection was deleted externally.
   */
  function clearExportConnectionId(): void {
    localStorage.removeItem(EXPORT_CONNECTION_KEY)
  }

  return {
    // State
    isExporting,
    exportError,

    // Methods
    exportTable,
    getOrCreateExportConnection,
    buildExportQuery,
    getExportConnectionId,
    clearExportConnectionId
  }
}
