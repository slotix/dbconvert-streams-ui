import { defineStore } from 'pinia'
import api from '@/api/streams'
import type {
  StreamConfig,
  Table,
  StreamConnectionMapping,
  S3SourceConfig,
  FileEntry
} from '@/types/streamConfig'
import type { TargetSpec } from '@/types/specs'
import { getConnectionKindFromSpec, getConnectionTypeLabel, isFileBasedKind } from '@/types/specs'
import type { Step } from '@/stores/common'
import { useConnectionsStore } from '@/stores/connections'
import { useMonitoringStore } from '@/stores/monitoring'
import { STATUS } from '@/constants'
import {
  buildDatabaseTargetSpec,
  buildFileTargetSpec,
  buildS3TargetSpec,
  buildGCSTargetSpec,
  buildAzureTargetSpec,
  buildSnowflakeTargetSpec
} from '@/utils/specBuilder'
import { getFileSpec } from '@/composables/useTargetSpec'
import { normalizeStreamConnections, DEFAULT_ALIAS } from '@/utils/federatedUtils'

interface State {
  generateDefaultStreamConfigName(
    source: string,
    target: string,
    tables: Table[],
    sourceDatabase?: string,
    targetDatabase?: string,
    targetFileFormat?: string
  ): string
  streamConfigs: StreamConfig[]
  currentStreamConfig: StreamConfig | null
  currentStep: Step | null
  currentFilter: string
}

function normalizeSource(source: StreamConfig['source']): StreamConfig['source'] {
  const normalized = { ...source }
  const connections = normalized.connections ? [...normalized.connections] : []

  // Use shared utility for alias normalization
  normalized.connections = normalizeStreamConnections(connections)
  return normalized
}

function normalizeStreamConfig(config: StreamConfig): StreamConfig {
  return {
    ...config,
    source: normalizeSource(config.source)
  }
}

export const defaultStreamConfigOptions: StreamConfig = {
  id: '',
  name: '',
  mode: 'convert',
  reportingInterval: 3,
  source: {
    connections: [],
    options: {
      dataBundleSize: 500,
      operations: ['insert', 'update', 'delete']
    }
  },
  target: {
    id: '',
    spec: undefined
  },
  limits: { numberOfEvents: 0, elapsedTime: 0 },
  files: []
}

export const buildStreamPayload = (stream: StreamConfig): Partial<StreamConfig> => {
  const normalizedSource = normalizeSource(stream.source)
  const connectionsStore = useConnectionsStore()
  const filteredStream: Partial<StreamConfig> = {
    name: stream.name,
    mode: stream.mode
  }

  // Include ID and created if they exist
  if (stream.id) filteredStream.id = stream.id
  if (stream.created) filteredStream.created = stream.created
  if (stream.description) filteredStream.description = stream.description

  // Handle reportingInterval - always include if defined (even if it matches default)
  if (stream.reportingInterval !== undefined) {
    filteredStream.reportingInterval = stream.reportingInterval
  }

  // Handle source configuration - filter out any deleted connections
  const connections: StreamConnectionMapping[] =
    normalizedSource.connections && normalizedSource.connections.length > 0
      ? normalizedSource.connections.filter((c) => connectionsStore.connectionByID(c.connectionId))
      : []

  const primarySourceConnId = connections[0]?.connectionId
  const primarySourceConn = primarySourceConnId
    ? connectionsStore.connectionByID(primarySourceConnId)
    : undefined
  const sourceKind = getConnectionKindFromSpec(primarySourceConn?.spec)
  const isS3Source = sourceKind === 's3' && connections.length === 1

  function parseS3Path(path: string): { bucket: string; keyOrPrefix: string } | null {
    const match = path.match(/^s3:\/\/([^/]+)\/?(.*)$/)
    if (!match) return null
    const bucket = match[1]
    const rest = (match[2] || '').replace(/^\/+/, '')
    return { bucket, keyOrPrefix: rest }
  }

  /**
   * Build S3 config from explicitly selected files.
   * - Selected folders → prefixes (all contents included)
   * - Selected files (not under a selected folder) → objects
   */
  function s3ConfigFromFiles(files: NonNullable<StreamConfig['files']>): {
    prefixes: string[]
    objects: string[]
  } {
    const prefixes: string[] = []
    const objects: string[] = []

    // First pass: collect all selected folders as prefixes
    for (const f of files) {
      if (!f.selected) continue
      if (f.type !== 'dir') continue

      const parsed = parseS3Path(f.path)
      if (!parsed?.keyOrPrefix) continue

      const prefix = parsed.keyOrPrefix.endsWith('/')
        ? parsed.keyOrPrefix
        : `${parsed.keyOrPrefix}/`
      prefixes.push(prefix)
    }

    // Deduplicate prefixes (remove child prefixes when parent is selected)
    const dedupedPrefixes = deduplicatePrefixes(prefixes)

    // Second pass: collect selected files not covered by any prefix
    for (const f of files) {
      if (!f.selected) continue
      if (f.type === 'dir') continue // folders already handled

      const parsed = parseS3Path(f.path)
      if (!parsed?.keyOrPrefix) continue

      // Only include if not covered by a selected prefix
      const coveredByPrefix = dedupedPrefixes.some((prefix) =>
        parsed.keyOrPrefix.startsWith(prefix)
      )
      if (!coveredByPrefix) {
        objects.push(parsed.keyOrPrefix)
      }
    }

    return { prefixes: dedupedPrefixes, objects }
  }

  function deduplicatePrefixes(prefixes: string[]): string[] {
    const sorted = [...prefixes].sort((a, b) => a.length - b.length)
    return sorted.filter((prefix, i) => !sorted.slice(0, i).some((p) => prefix.startsWith(p)))
  }

  function filesForConnection(
    allFiles: NonNullable<StreamConfig['files']> | undefined,
    connectionId: string,
    bucketFallback?: string
  ): NonNullable<StreamConfig['files']> {
    const files = allFiles || []
    const hasTagged = files.some((f) => !!f.connectionId)
    if (hasTagged) {
      return files.filter((f) => f.connectionId === connectionId)
    }
    // Legacy fallback (older configs): scope by bucket.
    if (bucketFallback) {
      return files.filter((f) => parseS3Path(f.path)?.bucket === bucketFallback)
    }
    return files
  }

  if (isS3Source) {
    const bucket = connections[0]?.s3?.bucket || ''

    // Get existing prefixes/objects or derive from selected files
    const existingS3 = connections[0]?.s3
    const hasExistingSelections =
      (existingS3?.prefixes && existingS3.prefixes.length > 0) ||
      (existingS3?.objects && existingS3.objects.length > 0)

    const scopedFiles = filesForConnection(stream.files, connections[0]?.connectionId || '', bucket)

    const s3Config: S3SourceConfig = hasExistingSelections
      ? { bucket, prefixes: existingS3?.prefixes, objects: existingS3?.objects }
      : scopedFiles.length > 0
        ? { bucket, ...s3ConfigFromFiles(scopedFiles) }
        : { bucket, prefixes: [], objects: [] }

    // Clean up empty arrays before sending
    const s3Payload: S3SourceConfig = { bucket: s3Config.bucket }
    if (s3Config.prefixes && s3Config.prefixes.length > 0) {
      s3Payload.prefixes = s3Config.prefixes
    }
    if (s3Config.objects && s3Config.objects.length > 0) {
      s3Payload.objects = s3Config.objects
    }

    filteredStream.source = {
      connections: [
        {
          alias: connections[0]?.alias || 'src',
          connectionId: connections[0]?.connectionId || '',
          s3: s3Payload
        }
      ]
    }

    // Handle source options (same behavior as non-S3)
    if (normalizedSource.options) {
      const sourceOptions: NonNullable<StreamConfig['source']['options']> = {}
      const defaultSourceOptions = defaultStreamConfigOptions.source.options!

      if (normalizedSource.options.dataBundleSize !== defaultSourceOptions.dataBundleSize) {
        sourceOptions.dataBundleSize = normalizedSource.options.dataBundleSize
      }
      if (stream.mode === 'cdc' && normalizedSource.options.operations) {
        sourceOptions.operations = normalizedSource.options.operations
      }
      if (normalizedSource.options.replicationSlot) {
        sourceOptions.replicationSlot = normalizedSource.options.replicationSlot
      }
      if (normalizedSource.options.publicationName) {
        sourceOptions.publicationName = normalizedSource.options.publicationName
      }
      if (normalizedSource.options.binlogPosition) {
        sourceOptions.binlogPosition = normalizedSource.options.binlogPosition
      }

      if (Object.keys(sourceOptions).length > 0) {
        filteredStream.source.options = sourceOptions
      }
    }

    // Handle target configuration
    filteredStream.target = {
      id: stream.target.id,
      spec: stream.target.spec
    }

    // Handle limits
    if (stream.limits && (stream.limits.numberOfEvents || stream.limits.elapsedTime)) {
      filteredStream.limits = stream.limits
    }

    return filteredStream
  }

  // For file sources, convert selected files to table entries
  // Files are stored in stream.files, and each file becomes a table
  let sourceTables: Table[] = []
  if (stream.files && stream.files.length > 0) {
    const selectedFiles = stream.files.filter((f) => f.selected)
    if (selectedFiles.length > 0) {
      // Convert files to tables (file name without extension = table name)
      sourceTables = selectedFiles.map((file) => {
        // Extract table name from file name (remove extension)
        const tableName = file.name.replace(/\.(parquet|csv|json|jsonl|gz|zst)$/gi, '')
        return { name: tableName, selected: true }
      })
    }
  }

  // Helper to filter tables with their filters
  function filterTables(tables: Table[]): Table[] {
    return tables.map((table) => {
      const filteredTable: Partial<Table> = { name: table.name }

      // Include structured filter if it has any meaningful data
      if (stream.mode === 'convert' && table.filter) {
        const hasContent =
          (table.filter.selectedColumns && table.filter.selectedColumns.length > 0) ||
          (table.filter.filters && table.filter.filters.length > 0) ||
          (table.filter.sorts && table.filter.sorts.length > 0) ||
          (table.filter.limit !== undefined && table.filter.limit !== null)
        if (hasContent) {
          filteredTable.filter = table.filter
        }
      }

      return filteredTable as Table
    })
  }

  // Build connections with their per-connection database/schema/tables/queries
  const builtConnections: StreamConnectionMapping[] = connections.map((conn) => {
    const result: StreamConnectionMapping = {
      alias: conn.alias,
      connectionId: conn.connectionId
    }

    // For S3 connections, do NOT include database/schema/tables/queries (backend requires them empty)
    // Only include these fields for non-S3 connections
    if (!conn.s3) {
      if (conn.database) {
        result.database = conn.database
      }
      if (conn.schema) {
        result.schema = conn.schema
      }

      // Get tables from connection or use converted file tables (for single-source file streams)
      const connTables = conn.tables && conn.tables.length > 0 ? conn.tables : sourceTables
      if (connTables.length > 0) {
        result.tables = filterTables(connTables)
      }

      // Include custom queries (only for convert mode)
      if (stream.mode === 'convert' && conn.queries && conn.queries.length > 0) {
        result.queries = conn.queries.map((q) => ({
          name: q.name,
          query: q.query
        }))
      }
    }

    // Include S3 config if present (for S3-backed connections)
    if (conn.s3) {
      const bucket = conn.s3.bucket || ''

      // If s3 already has prefixes/objects, use them directly
      if (
        (conn.s3.prefixes && conn.s3.prefixes.length > 0) ||
        (conn.s3.objects && conn.s3.objects.length > 0)
      ) {
        result.s3 = conn.s3
      } else if (stream.files && stream.files.length > 0) {
        // Otherwise, build from selected files for this connection (bucket match only for legacy configs)
        const scopedFiles = filesForConnection(stream.files, conn.connectionId, bucket)
        if (scopedFiles.length > 0) {
          const s3FromFiles = s3ConfigFromFiles(scopedFiles)
          result.s3 = {
            bucket,
            ...(s3FromFiles.prefixes.length > 0 ? { prefixes: s3FromFiles.prefixes } : {}),
            ...(s3FromFiles.objects.length > 0 ? { objects: s3FromFiles.objects } : {})
          }
        } else {
          // No files selected, just set bucket (will fail backend validation)
          result.s3 = { bucket }
        }
      } else {
        // No files array, just preserve the s3 config as-is
        result.s3 = conn.s3
      }
    }

    return result
  })

  filteredStream.source = {
    connections: builtConnections
  }

  // Handle source options
  if (normalizedSource.options) {
    const sourceOptions: NonNullable<StreamConfig['source']['options']> = {}
    const defaultSourceOptions = defaultStreamConfigOptions.source.options!

    if (normalizedSource.options.dataBundleSize !== defaultSourceOptions.dataBundleSize) {
      sourceOptions.dataBundleSize = normalizedSource.options.dataBundleSize
    }
    if (stream.mode === 'cdc' && normalizedSource.options.operations) {
      sourceOptions.operations = normalizedSource.options.operations
    }
    if (normalizedSource.options.replicationSlot) {
      sourceOptions.replicationSlot = normalizedSource.options.replicationSlot
    }
    if (normalizedSource.options.publicationName) {
      sourceOptions.publicationName = normalizedSource.options.publicationName
    }
    if (normalizedSource.options.binlogPosition) {
      sourceOptions.binlogPosition = normalizedSource.options.binlogPosition
    }

    if (Object.keys(sourceOptions).length > 0) {
      filteredStream.source.options = sourceOptions
    }
  }

  // Handle target configuration
  // Backend TargetConfig only has: id and spec (no options field)
  // All settings flow into spec via prepareStreamData()
  filteredStream.target = {
    id: stream.target.id,
    spec: stream.target.spec
  }

  // Handle limits
  if (stream.limits && (stream.limits.numberOfEvents || stream.limits.elapsedTime)) {
    filteredStream.limits = stream.limits
  }

  return filteredStream
}

export const useStreamsStore = defineStore('streams', {
  state: (): State => ({
    streamConfigs: [],
    currentStreamConfig: null,
    currentStep: null,
    currentFilter: '',
    generateDefaultStreamConfigName: function (
      _source: string,
      _target: string,
      _tables: Table[],
      _sourceDatabase?: string,
      _targetDatabase?: string,
      _targetFileFormat?: string
    ): string {
      throw new Error('Function not implemented.')
    }
  }),
  getters: {
    countStreams(state: State): number {
      return state.streamConfigs ? state.streamConfigs.length : 0
    },
    // newestFirst(state: State): Stream[] {
    //     return state.streams ? state.streams.slice().reverse() : [];
    // },
    newestFirst(state: State): StreamConfig[] {
      return state.streamConfigs
        ? state.streamConfigs.slice().sort((a, b) => (b.created as number) - (a.created as number))
        : []
    },

    streamsByType(state: State): StreamConfig[] {
      return state.streamConfigs
        .filter((el) => {
          // Filter by stream name or mode
          const filterLower = state.currentFilter.toLowerCase()
          return (
            el.name?.toLowerCase().includes(filterLower) ||
            el.mode?.toLowerCase().includes(filterLower)
          )
        })
        .reverse()
    },
    currentStreamIndexInArray(state: State): number {
      return state.streamConfigs.indexOf(this.currentStreamConfig!)
    }
  },
  actions: {
    setCurrentStream(id: string) {
      const curStream = this.streamConfigs.find((c) => c.id === id)
      this.currentStreamConfig = curStream
        ? normalizeStreamConfig(curStream)
        : normalizeStreamConfig({ ...defaultStreamConfigOptions })

      // Restore S3 prefixes/objects to stream.files[] for FilePreviewList
      if (this.currentStreamConfig?.source?.connections) {
        const files: FileEntry[] = this.currentStreamConfig.files || []
        for (const conn of this.currentStreamConfig.source.connections) {
          if (conn.s3?.bucket) {
            const bucket = conn.s3.bucket
            // Convert prefixes to directory entries (paths must have trailing slash to match file explorer)
            if (conn.s3.prefixes) {
              for (const prefix of conn.s3.prefixes) {
                // Ensure trailing slash for directory paths
                const normalizedPrefix = prefix.endsWith('/') ? prefix : `${prefix}/`
                const path = `s3://${bucket}/${normalizedPrefix}`
                const name = prefix.split('/').filter(Boolean).pop() || prefix
                if (!files.find((f) => f.path === path && f.connectionId === conn.connectionId)) {
                  files.push({
                    name,
                    connectionId: conn.connectionId,
                    path,
                    type: 'dir',
                    selected: true
                  })
                }
              }
            }
            // Convert objects to file entries
            if (conn.s3.objects) {
              for (const obj of conn.s3.objects) {
                const path = `s3://${bucket}/${obj}`
                const name = obj.split('/').pop() || obj
                if (!files.find((f) => f.path === path && f.connectionId === conn.connectionId)) {
                  files.push({
                    name,
                    connectionId: conn.connectionId,
                    path,
                    type: 'file',
                    selected: true
                  })
                }
              }
            }
          }
        }
        this.currentStreamConfig.files = files
      }

      // Clear source connections that reference deleted connections
      if (this.currentStreamConfig?.source?.connections) {
        const connectionsStore = useConnectionsStore()
        const hasInvalidConnection = this.currentStreamConfig.source.connections.some(
          (c) => !connectionsStore.connectionByID(c.connectionId)
        )
        if (hasInvalidConnection) {
          // Clear ALL source connections - user must select new ones
          this.currentStreamConfig.source.connections = []
        }
      }

      if (this.currentStreamConfig && !this.currentStreamConfig.name) {
        const primarySourceConn = this.currentStreamConfig.source.connections?.[0]
        const primarySourceConnectionId = primarySourceConn?.connectionId || ''
        this.currentStreamConfig.name = this.generateDefaultStreamConfigName(
          primarySourceConnectionId,
          this.currentStreamConfig.target.id || '',
          primarySourceConn?.tables || []
        )
      }
    },
    updateSource(sourceId: string, database?: string) {
      if (this.currentStreamConfig) {
        const existingConn = this.currentStreamConfig.source.connections?.[0]
        const alias = existingConn?.alias || DEFAULT_ALIAS
        this.currentStreamConfig.source = normalizeSource({
          ...this.currentStreamConfig.source,
          connections: [
            {
              alias,
              connectionId: sourceId,
              database: database ?? existingConn?.database,
              schema: existingConn?.schema,
              tables: existingConn?.tables,
              queries: existingConn?.queries,
              s3: existingConn?.s3
            }
          ]
        })
      }
    },
    setSourceConnections(connections: StreamConnectionMapping[]) {
      if (this.currentStreamConfig) {
        this.currentStreamConfig.source = normalizeSource({
          ...this.currentStreamConfig.source,
          connections
        })
      }
    },
    updateTarget(targetId: string) {
      if (this.currentStreamConfig) {
        this.currentStreamConfig.target.id = targetId
        // Note: fileFormat is set in target.spec by prepareStreamData() and StreamSettings component
      }
    },
    setFilter(filter: string) {
      this.currentFilter = filter
    },
    addStream() {
      this.resetCurrentStream()
      useConnectionsStore().resetCurrentConnection()
    },
    async saveStream(isEditMode: boolean = false): Promise<string | undefined> {
      try {
        this.prepareStreamData()
        if (!this.currentStreamConfig?.name) {
          const primarySourceConn = this.currentStreamConfig?.source.connections?.[0]
          const primarySourceConnectionId = primarySourceConn?.connectionId || ''
          this.currentStreamConfig!.name = this.generateDefaultStreamConfigName(
            primarySourceConnectionId,
            this.currentStreamConfig?.target.id || '',
            primarySourceConn?.tables || [],
            primarySourceConn?.database,
            this.currentStreamConfig?.targetDatabase,
            getFileSpec(this.currentStreamConfig?.target.spec)?.fileFormat
          )
        }

        if (!this.currentStreamConfig) {
          throw new Error('No stream configuration to save')
        }

        // Build the payload for API (filters out UI-only properties)
        const streamPayload = buildStreamPayload(this.currentStreamConfig)

        // Remove temporary UI-only state property before saving
        delete (streamPayload as StreamConfig & { _allTablesWithState?: unknown })
          ._allTablesWithState

        let stream: StreamConfig
        if (isEditMode && this.currentStreamConfig?.id) {
          // Update existing stream config
          stream = await api.updateStreamConfig(
            this.currentStreamConfig.id,
            streamPayload as StreamConfig
          )
        } else {
          // Create new stream config
          stream = await api.createStream(streamPayload as unknown as Record<string, unknown>)
        }
        stream = normalizeStreamConfig(stream)

        const savedId = stream.id
        this.resetCurrentStream()
        await this.refreshStreams()
        this.currentStreamConfig = normalizeStreamConfig(stream)
        return savedId
      } catch (err) {
        console.error('Failed to save stream:', err)
        throw err
      }
    },
    prepareStreamData() {
      if (this.currentStreamConfig) {
        const connectionCount = this.currentStreamConfig.source.connections?.length || 0

        const connectionsStore = useConnectionsStore()
        const primarySourceConnId = this.currentStreamConfig.source.connections?.[0]?.connectionId
        const primarySourceConn = primarySourceConnId
          ? connectionsStore.connectionByID(primarySourceConnId)
          : null
        const primarySourceKind = getConnectionKindFromSpec(primarySourceConn?.spec)
        const isS3Source = primarySourceKind === 's3' && connectionCount === 1

        // Copy database/schema from root level to per-connection fields
        if (isS3Source) {
          // S3 sources: set bucket in s3 config, clear database fields
          const bucket =
            this.currentStreamConfig.sourceDatabase ||
            this.currentStreamConfig.source.connections?.[0]?.s3?.bucket ||
            ''

          if (this.currentStreamConfig.source.connections?.length) {
            const [first, ...rest] = this.currentStreamConfig.source.connections
            this.currentStreamConfig.source.connections = [
              {
                ...first,
                database: undefined,
                schema: undefined,
                s3: bucket
                  ? {
                      bucket,
                      prefixes: first.s3?.prefixes,
                      objects: first.s3?.objects
                    }
                  : first.s3
              },
              ...rest
            ]
          }
        } else {
          // Database sources: copy database/schema from root to connection
          if (connectionCount === 1 && this.currentStreamConfig.source.connections?.length) {
            const [first, ...rest] = this.currentStreamConfig.source.connections
            this.currentStreamConfig.source.connections = [
              {
                ...first,
                database: this.currentStreamConfig.sourceDatabase || first.database,
                schema: this.currentStreamConfig.sourceSchema || first.schema
              },
              ...rest
            ]
          }
        }

        // Always rebuild target spec to ensure structureOptions and other settings are current
        const targetConnection = connectionsStore.connectionByID(this.currentStreamConfig.target.id)

        if (!targetConnection) {
          throw new Error('Target connection not found')
        }

        // Use spec to determine target kind - spec is the ONLY source of truth
        const targetKind = getConnectionKindFromSpec(targetConnection.spec)
        if (!targetKind) {
          throw new Error('Target connection has no valid spec - cannot determine type')
        }

        // Get existing spec values (spec is the source of truth)
        const existingSpec = this.currentStreamConfig.target.spec
        const existingFileSpec =
          existingSpec?.files || existingSpec?.s3 || existingSpec?.gcs || existingSpec?.azure
        const existingFormat = existingFileSpec?.format

        // Get structure options and skipData from root level (set by wizard) or existing spec
        // These only apply to database targets (not file targets)
        const structureOptions = this.currentStreamConfig.structureOptions ||
          existingSpec?.database?.structureOptions || {
            tables: true,
            indexes: true,
            foreignKeys: true,
            checkConstraints: true
          }
        const skipData =
          this.currentStreamConfig.skipData ?? existingSpec?.database?.skipData ?? false

        const targetDatabase = this.currentStreamConfig.targetDatabase || ''
        const targetSchema = this.currentStreamConfig.targetSchema
        // Empty string lets backend use platform-appropriate temp directory
        const targetPath = this.currentStreamConfig.targetPath || ''
        const fileFormat = isFileBasedKind(targetKind)
          ? getFileSpec(this.currentStreamConfig.target.spec)?.fileFormat
          : 'parquet'
        if (isFileBasedKind(targetKind) && !fileFormat) {
          throw new Error('Target file format is required for file-based targets')
        }
        const resolvedFileFormat = fileFormat || 'parquet'

        // Read format settings from existing spec (spec is source of truth)
        const compressionType = existingFormat?.compression || 'zstd'
        const parquetConfig = existingFormat?.parquet
        const csvConfig = existingFormat?.csv
        // useDuckDB defaults to true
        const useDuckDB = existingFormat?.useDuckDB ?? true

        // Build the appropriate target spec based on connection type
        const specBuilders: Record<string, () => TargetSpec> = {
          snowflake: () =>
            buildSnowflakeTargetSpec(
              targetDatabase,
              targetPath,
              resolvedFileFormat,
              targetSchema,
              structureOptions,
              compressionType,
              parquetConfig,
              csvConfig,
              existingSpec?.snowflake?.staging?.config?.filePrefix,
              existingSpec?.snowflake?.staging?.config?.timestampFormat,
              useDuckDB,
              skipData
            ),
          s3: () => {
            // Read S3 upload config from existing spec, fall back to connection scope
            const existingUpload = existingSpec?.s3?.upload
            const s3ConnSpec = targetConnection.spec?.s3
            return buildS3TargetSpec(
              targetPath,
              resolvedFileFormat,
              existingUpload?.bucket || s3ConnSpec?.scope?.bucket || '',
              existingUpload?.prefix || s3ConnSpec?.scope?.prefix,
              existingUpload?.storageClass,
              existingUpload?.keepLocalFiles,
              compressionType,
              parquetConfig,
              csvConfig,
              existingUpload?.serverSideEnc,
              existingUpload?.kmsKeyId,
              useDuckDB
            )
          },
          gcs: () => {
            // Read GCS upload config from existing spec, fall back to connection scope
            const existingUpload = existingSpec?.gcs?.upload
            const gcsConnSpec = targetConnection.spec?.gcs
            return buildGCSTargetSpec(
              targetPath,
              resolvedFileFormat,
              existingUpload?.bucket || gcsConnSpec?.scope?.bucket || '',
              existingUpload?.prefix || gcsConnSpec?.scope?.prefix,
              existingUpload?.storageClass,
              existingUpload?.keepLocalFiles,
              compressionType,
              parquetConfig,
              csvConfig,
              useDuckDB
            )
          },
          azure: () => {
            // Read Azure upload config from existing spec, fall back to connection scope
            const existingUpload = existingSpec?.azure?.upload
            const azureConnSpec = targetConnection.spec?.azure
            return buildAzureTargetSpec(
              targetPath,
              resolvedFileFormat,
              existingUpload?.container || azureConnSpec?.scope?.container || '',
              existingUpload?.prefix || azureConnSpec?.scope?.prefix,
              existingUpload?.keepLocalFiles,
              compressionType,
              parquetConfig,
              csvConfig,
              useDuckDB
            )
          },
          file: () =>
            buildFileTargetSpec(
              resolvedFileFormat,
              compressionType,
              parquetConfig,
              csvConfig,
              useDuckDB
            ),
          database: () =>
            buildDatabaseTargetSpec(targetDatabase, targetSchema, structureOptions, skipData)
        }

        // Determine which builder to use based on spec-derived kind
        let builderKey: string
        switch (targetKind) {
          case 'snowflake':
            builderKey = 'snowflake'
            break
          case 's3':
            builderKey = 's3'
            break
          case 'gcs':
            builderKey = 'gcs'
            break
          case 'azure':
            builderKey = 'azure'
            break
          case 'files':
            builderKey = 'file'
            break
          case 'database':
            builderKey = 'database'
            break
          default:
            throw new Error(`Unknown target kind: ${targetKind}`)
        }

        this.currentStreamConfig.target.spec = specBuilders[builderKey]()

        // Note: Do NOT call buildStreamPayload here and reassign to currentStreamConfig
        // because it will filter out properties and lose the tables array.
        // buildStreamPayload will be called in saveStream when creating the API payload.
      }
    },
    async refreshStreams() {
      try {
        const streams = await api.getStreams()
        this.streamConfigs = streams.map((cfg) => normalizeStreamConfig(cfg))
      } catch (err) {
        console.error('Failed to fetch streams:', err)
      }
    },
    async deleteStreamConfig(configID: string) {
      try {
        await api.deleteStream(configID)
        await this.refreshStreams()
      } catch (err) {
        console.error('Failed to delete stream config:', err)
        throw err
      }
    },
    async cloneStreamConfig(configID: string) {
      try {
        await api.cloneStreamConfig(configID)
        await this.refreshStreams()
      } catch (err) {
        console.error('Failed to clone stream config:', err)
        throw err
      }
    },
    async updateStreamConfig(configID: string, config: StreamConfig) {
      try {
        const updatedConfig = await api.updateStreamConfig(configID, config)
        const normalized = normalizeStreamConfig(updatedConfig)
        // Update local store
        const index = this.streamConfigs.findIndex((c) => c.id === configID)
        if (index !== -1) {
          this.streamConfigs[index] = normalized
        }
        if (this.currentStreamConfig?.id === configID) {
          this.currentStreamConfig = normalized
        }
        return normalized
      } catch (err) {
        console.error('Failed to update stream config:', err)
        throw err
      }
    },
    async startStream(configID: string): Promise<string> {
      try {
        const streamID = await api.startStream(configID)
        const monitoringStore = useMonitoringStore()
        monitoringStore.streamID = streamID
        return streamID
      } catch (err) {
        console.error('Failed to start stream:', err)
        throw err
      }
    },
    async pauseStream(id: string) {
      try {
        await api.pauseStream(id)
        // Optionally update the monitoring store
        // const monitoringStore = useMonitoringStore()
        // monitoringStore.updateStreamStatus(statusEnum.paused)
      } catch (err) {
        console.error('Failed to pause stream:', err)
        throw err
      }
    },
    async resumeStream(id: string) {
      try {
        await api.resumeStream(id)
        // Optionally update the monitoring store
        // const monitoringStore = useMonitoringStore()
        // monitoringStore.updateStreamStatus(statusEnum.running)
      } catch (err) {
        console.error('Failed to resume stream:', err)
        throw err
      }
    },
    async stopStream(id: string) {
      try {
        await api.stopStream(id)
        // Update monitoring store status immediately
        const monitoringStore = useMonitoringStore()
        monitoringStore.updateStreamStatus(STATUS.STOPPED)
        // Status updates will come via SSE structured logs
      } catch (err) {
        console.error('Failed to stop stream:', err)
        throw err
      }
    },
    async runTargetConstraintsAction(configID: string) {
      try {
        return await api.runTargetConstraintsAction(configID)
      } catch (err) {
        console.error('Failed to run constraints action:', err)
        throw err
      }
    },
    resetCurrentStream() {
      this.currentStreamConfig = normalizeStreamConfig({
        ...defaultStreamConfigOptions,
        id: '',
        name: ''
      })
    },
    async clearStreams() {
      this.streamConfigs = []
    },
    generateDefaultStreamConfigName(
      source: string,
      target: string,
      tables: Table[],
      _sourceDatabase?: string,
      _targetDatabase?: string,
      targetFileFormat?: string
    ): string {
      const connectionsStore = useConnectionsStore()
      const sourceConnection = connectionsStore.connectionByID(source)
      const targetConnection = connectionsStore.connectionByID(target)

      const targetKind = getConnectionKindFromSpec(targetConnection?.spec)

      const sourceType =
        getConnectionTypeLabel(sourceConnection?.spec, sourceConnection?.type) || ''
      const targetType =
        getConnectionTypeLabel(targetConnection?.spec, targetConnection?.type) || ''

      // Determine target format/type
      let targetPart: string
      const isFileTarget = isFileBasedKind(targetKind)

      if (isFileTarget) {
        // For file targets, use the format (e.g., 'parquet', 'csv')
        targetPart = targetFileFormat || targetKind || ''
      } else {
        // For database targets, use the target connection type
        targetPart = targetType
      }

      // Calculate table count
      const tableCount = tables.length > 0 ? tables.length : 'all'

      // Format: {sourceType}_to_{targetType}_{count}_tables
      // Examples: postgresql_to_csv_14_tables, mysql_to_snowflake_5_tables
      return `${sourceType}_to_${targetPart}_${tableCount}_tables`
    },
    async getStreamConfigById(configId: string): Promise<StreamConfig | null> {
      try {
        const streamConfigs = await api.getStreams()
        const normalized = streamConfigs.map((cfg) => normalizeStreamConfig(cfg))
        return normalized.find((config) => config.id === configId) || null
      } catch (error) {
        console.error('Failed to get stream config by ID:', error)
        return null
      }
    }
  }
})
