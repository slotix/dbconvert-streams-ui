/**
 * Stream-based export composable for large dataset exports.
 *
 * Creates a stream to export data from the current table with filters/sorts applied.
 * Used when data is too large for client-side export.
 *
 * Features:
 * - Shared file connection for all exports (created once, reused)
 * - Uses table filters/sorts/limit from the filter panel
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
import type { StreamConfig, TableFilterState } from '@/types/streamConfig'
import { buildFileTargetSpec } from '@/utils/specBuilder'

// Local storage key for the shared export connection ID
const EXPORT_CONNECTION_KEY = 'dbconvert-export-connection-id'
const EXPORT_CONNECTION_NAME = 'Data Explorer Export'

export type StreamExportFormat = 'csv' | 'jsonl' | 'parquet'

function formatSortableTimestamp(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0')
  const year = date.getFullYear()
  const month = pad(date.getMonth() + 1)
  const day = pad(date.getDate())
  const hours = pad(date.getHours())
  const minutes = pad(date.getMinutes())
  const seconds = pad(date.getSeconds())
  return `${year}${month}${day}_${hours}${minutes}${seconds}`
}

export function buildExportStreamName(table: string, format: StreamExportFormat): string {
  const timestamp = formatSortableTimestamp(new Date())
  return `export_${table}_to_${format}_${timestamp}`
}

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
  /** Optional custom stream name */
  streamName?: string
  /** Run immediately after creation (default: true) */
  runImmediately?: boolean
  /** Optional compression setting */
  compression?: 'gzip' | 'zstd' | 'snappy' | 'none'
  /** Optional override for export connection base path */
  targetBasePath?: string
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
  async function getOrCreateExportConnection(basePath?: string): Promise<string> {
    // Check if we have a stored connection ID
    const storedConnectionId = localStorage.getItem(EXPORT_CONNECTION_KEY)
    const normalizedBasePath = basePath?.trim() || ''

    if (storedConnectionId) {
      // Verify the connection still exists
      try {
        const connections = await connectionsApi.getConnections()
        const existingConnection = connections.find((c: Connection) => c.id === storedConnectionId)
        if (existingConnection) {
          const existingBasePath = existingConnection.spec?.files?.basePath || ''
          if (normalizedBasePath && existingBasePath !== normalizedBasePath) {
            const updatedConnection = {
              ...existingConnection,
              spec: {
                ...existingConnection.spec,
                files: {
                  ...existingConnection.spec.files,
                  basePath: normalizedBasePath
                }
              }
            }
            await connectionsApi.updateConnectionById(storedConnectionId, updatedConnection)
            await connectionsStore.refreshConnections()
          }
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
          basePath: normalizedBasePath
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

  function buildTableFilterState(objectKey?: string): TableFilterState | undefined {
    if (!objectKey) return undefined
    const panelState = tabStateStore.getFilterPanelState(objectKey)
    if (!panelState) return undefined

    const hasFilters = panelState.filters?.some((f) => f.column && (f.value || f.operator))
    const hasSorts = panelState.sorts?.some((s) => s.column)
    const hasLimit = Boolean(panelState.limit && panelState.limit > 0)
    const hasSelectedColumns = Boolean(panelState.selectedColumns?.length)

    if (!hasFilters && !hasSorts && !hasLimit && !hasSelectedColumns) {
      return undefined
    }

    return {
      selectedColumns: panelState.selectedColumns?.length ? panelState.selectedColumns : undefined,
      filters: panelState.filters?.length ? panelState.filters : undefined,
      sorts: panelState.sorts?.length ? panelState.sorts : undefined,
      limit: panelState.limit ?? undefined
    }
  }

  /**
   * Create a stream config for export and return its ID.
   */
  async function createExportStreamConfig(
    options: StreamExportOptions,
    targetConnectionId: string
  ): Promise<string> {
    const { connectionId, database, schema, table, format, objectKey } = options

    const filter = buildTableFilterState(objectKey)

    // Create stream config
    const defaultStreamName = buildExportStreamName(table, format)
    const streamName = options.streamName?.trim() || defaultStreamName

    // Build target spec for file output
    // Output goes to the connection's basePath
    // The backend handles file organization within that directory
    const compression =
      options.compression && options.compression !== 'none' ? options.compression : undefined
    const targetSpec = buildFileTargetSpec(format, compression)

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
            tables: [
              {
                name: table,
                ...(filter ? { filter } : {})
              }
            ]
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
    return createStreamFromView({ ...options, runImmediately: true })
  }

  /**
   * Create a stream from the current view with optional run control.
   */
  async function createStreamFromView(options: StreamExportOptions): Promise<StreamExportResult> {
    isExporting.value = true
    exportError.value = null

    try {
      const runImmediately = options.runImmediately !== false

      // Step 1: Get or create the shared export connection
      const targetConnectionId = await getOrCreateExportConnection(options.targetBasePath)

      // Step 2: Create the stream config
      const streamConfigId = await createExportStreamConfig(options, targetConnectionId)

      if (!runImmediately) {
        updateStreamsViewState({ selectedStreamId: streamConfigId, tab: 'configuration' })
        router.push({ name: 'Streams' })

        return {
          success: true,
          streamConfigId
        }
      }

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
    createStreamFromView,
    getOrCreateExportConnection,
    getExportConnectionId,
    clearExportConnectionId
  }
}
