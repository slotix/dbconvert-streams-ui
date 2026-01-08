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
import { useQueryFilterStore } from '@/stores/queryFilterStore'
import { updateStreamsViewState } from '@/utils/streamsViewState'
import connectionsApi from '@/api/connections'
import streamsApi from '@/api/streams'
import type { Connection } from '@/types/connections'
import type { StreamConfig, QuerySource } from '@/types/streamConfig'
import { buildFileTargetSpec } from '@/utils/specBuilder'

// Local storage key for the shared export connection ID
const EXPORT_CONNECTION_KEY = 'dbconvert-export-connection-id'
const EXPORT_CONNECTION_NAME = 'Data Explorer Export'
// Empty string lets backend use platform-appropriate temp directory
const DEFAULT_EXPORT_PATH = ''

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
  const queryFilterStore = useQueryFilterStore()

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
          basePath: DEFAULT_EXPORT_PATH
        }
      }
    }

    const result = await connectionsApi.createConnection(connectionData)
    const newConnectionId = result.id

    // Store the connection ID for future use
    localStorage.setItem(EXPORT_CONNECTION_KEY, newConnectionId)

    // Refresh connections store
    await connectionsStore.refreshConnections()

    return newConnectionId
  }

  /**
   * Build the custom SQL query for export based on current filters/sorts.
   */
  function buildExportQuery(options: StreamExportOptions): string {
    const {
      table,
      schema,
      dialect = 'mysql',
      objectKey,
      whereClause,
      orderByColumns,
      orderByDirections,
      limit
    } = options

    const quoteId = (name: string) => {
      if (dialect === 'mysql') return `\`${name}\``
      if (dialect === 'pgsql') return `"${name}"`
      return name
    }

    // Build table reference with schema if provided
    const tableRef = schema ? `${quoteId(schema)}.${quoteId(table)}` : quoteId(table)

    const parts: string[] = [`SELECT * FROM ${tableRef}`]

    // Get WHERE clause - either from params or from query filter store
    let where = whereClause
    if (!where && objectKey) {
      where = queryFilterStore.buildWhereClause(objectKey, true, dialect)
    }
    if (where) {
      parts.push(`WHERE ${where}`)
    }

    // Get ORDER BY - either from params or from query filter store
    let orderCols = orderByColumns
    let orderDirs = orderByDirections
    if (!orderCols && objectKey) {
      orderCols = queryFilterStore.buildOrderByColumns(objectKey)
      orderDirs = queryFilterStore.buildOrderByDirections(objectKey)
    }

    if (orderCols) {
      const cols = orderCols.split(',').filter((c) => c.trim())
      const dirs = orderDirs?.split(',') || []
      const sortClauses = cols.map((col, i) => {
        const dir = dirs[i]?.trim().toUpperCase() || 'ASC'
        return `${quoteId(col.trim())} ${dir}`
      })
      if (sortClauses.length > 0) {
        parts.push(`ORDER BY ${sortClauses.join(', ')}`)
      }
    }

    // Add LIMIT if specified
    if (limit && limit > 0) {
      parts.push(`LIMIT ${limit}`)
    }

    return parts.join(' ')
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
