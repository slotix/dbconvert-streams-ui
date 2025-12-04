import { defineStore } from 'pinia'
import api from '@/api/streams'
import type { StreamConfig } from '@/types/streamConfig'
import type { Table } from '@/types/streamConfig'
import type { TargetSpec } from '@/types/specs'
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

export const defaultStreamConfigOptions: StreamConfig = {
  id: '',
  name: '',
  mode: 'convert',
  reportingInterval: 3,
  source: {
    id: '',
    tables: [],
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

const defaultTableOptions: Partial<Table> = {
  selected: false
}

export const buildStreamPayload = (stream: StreamConfig): Partial<StreamConfig> => {
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

  // Handle source configuration
  filteredStream.source = {
    id: stream.source.id,
    // Include database and schema if specified
    ...(stream.source.database && { database: stream.source.database }),
    ...(stream.source.schema && { schema: stream.source.schema }),
    ...(stream.source.tables &&
      stream.source.tables.length > 0 && {
        tables: stream.source.tables.map((table) => {
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
      }),
    // Include custom queries (only for convert mode)
    ...(stream.mode === 'convert' &&
      stream.source.queries &&
      stream.source.queries.length > 0 && {
        queries: stream.source.queries.map((q) => ({
          name: q.name,
          query: q.query
        }))
      })
  }

  // Handle source options
  if (stream.source.options) {
    const sourceOptions: any = {}
    const defaultSourceOptions = defaultStreamConfigOptions.source.options!

    if (stream.source.options.dataBundleSize !== defaultSourceOptions.dataBundleSize) {
      sourceOptions.dataBundleSize = stream.source.options.dataBundleSize
    }
    if (stream.mode === 'cdc' && stream.source.options.operations) {
      sourceOptions.operations = stream.source.options.operations
    }
    if (stream.source.options.replicationSlot) {
      sourceOptions.replicationSlot = stream.source.options.replicationSlot
    }
    if (stream.source.options.publicationName) {
      sourceOptions.publicationName = stream.source.options.publicationName
    }
    if (stream.source.options.binlogPosition) {
      sourceOptions.binlogPosition = stream.source.options.binlogPosition
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
      this.currentStreamConfig = curStream ? curStream : { ...defaultStreamConfigOptions }

      if (this.currentStreamConfig && !this.currentStreamConfig.name) {
        this.currentStreamConfig.name = this.generateDefaultStreamConfigName(
          this.currentStreamConfig.source.id || '',
          this.currentStreamConfig.target.id || '',
          this.currentStreamConfig.source.tables || []
        )
      }
    },
    updateSource(sourceId: string) {
      if (this.currentStreamConfig) {
        this.currentStreamConfig.source.id = sourceId
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
          this.currentStreamConfig!.name = this.generateDefaultStreamConfigName(
            this.currentStreamConfig?.source.id || '',
            this.currentStreamConfig?.target.id || '',
            this.currentStreamConfig?.source.tables || [],
            (this.currentStreamConfig as any)?.sourceDatabase,
            (this.currentStreamConfig as any)?.targetDatabase,
            getFileSpec(this.currentStreamConfig?.target.spec)?.fileFormat
          )
        }

        let stream: StreamConfig
        if (isEditMode && this.currentStreamConfig?.id) {
          // Update existing stream config
          stream = await api.updateStreamConfig(
            this.currentStreamConfig.id,
            this.currentStreamConfig as StreamConfig
          )
        } else {
          // Create new stream config
          stream = await api.createStream(
            this.currentStreamConfig as unknown as Record<string, unknown>
          )
        }

        const savedId = stream.id
        this.resetCurrentStream()
        await this.refreshStreams()
        this.currentStreamConfig!.id = stream.id
        this.currentStreamConfig!.created = stream.created
        this.currentStreamConfig!.name = stream.name // The backend will return the updated name with uppended 5 last characters of the id
        return savedId
      } catch (err) {
        console.error('Failed to save stream:', err)
        throw err
      }
    },
    prepareStreamData() {
      if (this.currentStreamConfig) {
        // Ensure database/schema are copied from root level to source/target objects
        if (this.currentStreamConfig.sourceDatabase) {
          this.currentStreamConfig.source.database = this.currentStreamConfig.sourceDatabase
        }
        if (this.currentStreamConfig.sourceSchema) {
          this.currentStreamConfig.source.schema = this.currentStreamConfig.sourceSchema
        }

        // Always rebuild target spec to ensure structureOptions and other settings are current
        const connectionsStore = useConnectionsStore()
        const targetConnection = connectionsStore.connectionByID(this.currentStreamConfig.target.id)

        if (!targetConnection) {
          throw new Error('Target connection not found')
        }

        // Use connection metadata to determine what kind of target spec to build
        const connectionType = targetConnection.type?.toLowerCase() || ''
        // Check for S3/GCS/Azure by spec presence (new format)
        const isS3Target = !!targetConnection.spec?.s3
        const isGCSTarget = !!targetConnection.spec?.gcs
        const isAzureTarget = !!targetConnection.spec?.azure
        const isLocalFileTarget = !!targetConnection.spec?.files
        const isFileConnectionType = connectionType.includes('file')

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
            foreignKeys: true
          }
        const skipData =
          this.currentStreamConfig.skipData ?? existingSpec?.database?.skipData ?? false

        const targetDatabase = this.currentStreamConfig.targetDatabase || ''
        const targetSchema = this.currentStreamConfig.targetSchema
        const targetPath = this.currentStreamConfig.targetPath || '/tmp/dbconvert'
        const fileFormat =
          isS3Target || isGCSTarget || isAzureTarget || isLocalFileTarget || isFileConnectionType
            ? getFileSpec(this.currentStreamConfig.target.spec)?.fileFormat || 'csv'
            : 'parquet'

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
              fileFormat,
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
              fileFormat,
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
              fileFormat,
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
              fileFormat,
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
            buildFileTargetSpec(fileFormat, compressionType, parquetConfig, csvConfig, useDuckDB),
          database: () =>
            buildDatabaseTargetSpec(targetDatabase, targetSchema, structureOptions, skipData)
        }

        // Determine which builder to use
        let builderKey: string
        if (connectionType === 'snowflake') {
          builderKey = 'snowflake'
        } else if (isS3Target) {
          builderKey = 's3'
        } else if (isGCSTarget) {
          builderKey = 'gcs'
        } else if (isAzureTarget) {
          builderKey = 'azure'
        } else if (isLocalFileTarget || isFileConnectionType) {
          builderKey = 'file'
        } else {
          builderKey = 'database'
        }

        this.currentStreamConfig.target.spec = specBuilders[builderKey]()

        const refinedStream = buildStreamPayload(this.currentStreamConfig)

        // Remove temporary UI-only state property before saving
        delete (refinedStream as StreamConfig & { _allTablesWithState?: unknown })
          ._allTablesWithState

        this.currentStreamConfig = refinedStream as StreamConfig
      }
    },
    async refreshStreams() {
      try {
        this.streamConfigs = await api.getStreams()
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
        // Update local store
        const index = this.streamConfigs.findIndex((c) => c.id === configID)
        if (index !== -1) {
          this.streamConfigs[index] = updatedConfig
        }
        if (this.currentStreamConfig?.id === configID) {
          this.currentStreamConfig = updatedConfig
        }
        return updatedConfig
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
    resetCurrentStream() {
      this.currentStreamConfig = {
        ...defaultStreamConfigOptions,
        id: '',
        name: '',
        source: {
          id: '',
          tables: [],
          options: {
            dataBundleSize: 500,
            operations: ['insert', 'update', 'delete']
          }
        },
        target: {
          id: '',
          spec: undefined
        }
      }
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

      // Get connection types (e.g., 'mysql', 'postgresql')
      const sourceType = sourceConnection?.type?.toLowerCase() || 'unknown'
      const targetType = targetConnection?.type?.toLowerCase() || 'unknown'

      // Determine target format/type
      let targetPart: string
      const isFileTarget = targetType.includes('file')

      if (isFileTarget) {
        // For file targets, use the format (e.g., 'parquet', 'csv')
        targetPart = targetFileFormat || 'files'
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
        return streamConfigs.find((config) => config.id === configId) || null
      } catch (error) {
        console.error('Failed to get stream config by ID:', error)
        return null
      }
    }
  }
})
