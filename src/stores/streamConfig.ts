import { defineStore } from 'pinia'
import api from '@/api/streams'
import type { StreamConfig } from '@/types/streamConfig'
import type { Table } from '@/types/streamConfig'
import type { Step } from '@/stores/common'
import { useConnectionsStore } from '@/stores/connections'
import { statusEnum, useMonitoringStore } from '@/stores/monitoring'

interface State {
  generateDefaultStreamConfigName(source: string, target: string, tables: Table[]): string
  streamConfigs: StreamConfig[]
  currentStreamConfig: StreamConfig | null
  currentStep: Step | null
  currentFilter: string
}

export const defaultStreamConfigOptions: StreamConfig = {
  id: '',
  name: '',
  mode: 'convert',
  dataBundleSize: 500,
  reportingIntervals: { source: 3, target: 3 },
  operations: ['insert', 'update', 'delete'],
  targetFileFormat: undefined,
  structureOptions: {
    tables: true,
    indexes: true,
    foreignKeys: true
  },
  limits: { numberOfEvents: 0, elapsedTime: 0 },
  tables: [],
  files: []
}

const defaultTableOptions: Partial<Table> = {
  query: '',
  selected: false
}

const omitDefaults = (stream: StreamConfig): Partial<StreamConfig> => {
  const filteredStream: Partial<StreamConfig> = {}

  for (const key in stream) {
    if (Object.prototype.hasOwnProperty.call(stream, key)) {
      if (Array.isArray(stream[key]) && stream[key].length === 0) {
        continue
      }
      if (typeof stream[key] === 'object' && stream[key] !== null) {
        // Special handling for structureOptions
        if (key === 'structureOptions') {
          const currentOptions = stream[key] as any
          const defaultOptions = defaultStreamConfigOptions[key] as any
          if (JSON.stringify(currentOptions) !== JSON.stringify(defaultOptions)) {
            filteredStream[key] = stream[key]
          }
          continue
        }
        if (JSON.stringify(stream[key]) === JSON.stringify(defaultStreamConfigOptions[key])) {
          continue
        }
      }
      if (stream[key] !== defaultStreamConfigOptions[key]) {
        filteredStream[key] = stream[key]
      }
    }
  }

  if (stream.mode === 'convert') {
    delete filteredStream.operations
  }

  if (stream.tables) {
    filteredStream.tables = stream.tables.map((table) => {
      const filteredTable: Partial<Table> = {}
      for (const key in table) {
        if (Object.prototype.hasOwnProperty.call(table, key)) {
          const tableKey = key as keyof Table
          const defaultValue = defaultTableOptions[tableKey]

          if (table[tableKey] !== defaultValue) {
            filteredTable[tableKey] = table[tableKey] as any
          }
        }
      }

      if (stream.mode === 'convert') {
        delete filteredTable.query
      } else if (stream.mode === 'cdc') {
        delete filteredTable.query
      }

      return filteredTable as Table
    })
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
      source: string,
      target: string,
      tables: Table[]
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
          return el.type && el.type.toLowerCase().indexOf(state.currentFilter.toLowerCase()) > -1
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
          this.currentStreamConfig.source || '',
          this.currentStreamConfig.target || '',
          this.currentStreamConfig.tables || []
        )
      }
    },
    updateSource(sourceId: string) {
      if (this.currentStreamConfig) {
        this.currentStreamConfig.source = sourceId
      }
    },
    updateTarget(targetId: string) {
      if (this.currentStreamConfig) {
        this.currentStreamConfig.target = targetId
        const connectionsStore = useConnectionsStore()
        const connection = connectionsStore.connectionByID(targetId)
        if (connection && connection.type?.toLowerCase().includes('file')) {
          if (!this.currentStreamConfig.targetFileFormat) {
            this.currentStreamConfig.targetFileFormat = 'csv'
          }
        } else {
          delete this.currentStreamConfig.targetFileFormat
        }
      }
    },
    setFilter(filter: string) {
      this.currentFilter = filter
    },
    addStream() {
      this.resetCurrentStream()
      useConnectionsStore().resetCurrentConnection()
    },
    async saveStream() {
      try {
        this.prepareStreamData()
        if (!this.currentStreamConfig?.name) {
          this.currentStreamConfig!.name = this.generateDefaultStreamConfigName(
            this.currentStreamConfig?.source || '',
            this.currentStreamConfig?.target || '',
            this.currentStreamConfig?.tables || []
          )
        }

        const stream = await api.createStream(this.currentStreamConfig as StreamConfig)

        this.resetCurrentStream()
        await this.refreshStreams()
        this.currentStreamConfig!.id = stream.id
        this.currentStreamConfig!.created = stream.created
        this.currentStreamConfig!.name = stream.name // The backend will return the updated name with uppended 5 last characters of the id
      } catch (err) {
        console.error('Failed to save stream:', err)
        throw err
      }
    },
    prepareStreamData() {
      if (this.currentStreamConfig) {
        const refinedStream = omitDefaults(this.currentStreamConfig)
        // Create a new object excluding default values
        const newStream: StreamConfig = {
          ...this.currentStreamConfig,
          ...refinedStream,
          operations:
            this.currentStreamConfig.mode === 'convert' ? [] : this.currentStreamConfig.operations
        }

        // Exclude default operations if mode is convert
        if (newStream.mode === 'convert' && (newStream.operations?.length ?? 0) === 0) {
          delete newStream.operations
        }

        this.currentStreamConfig = newStream
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
        // Stream status will be updated via monitoring events
      } catch (err) {
        console.error('Failed to stop stream:', err)
        throw err
      }
    },
    updateStreamStatus(status: typeof statusEnum) {
      // This can be used to update the stream status based on monitoring events
    },
    resetCurrentStream() {
      this.currentStreamConfig = {
        ...defaultStreamConfigOptions,
        id: '',
        name: '',
        source: '',
        target: '',
        tables: []
      }
    },
    async clearStreams() {
      this.streamConfigs = []
    },
    generateDefaultStreamConfigName(source: string, target: string, tables: Table[]): string {
      const connectionsStore = useConnectionsStore()
      const sourceConnection = connectionsStore.connectionByID(source)
      const targetConnection = connectionsStore.connectionByID(target)

      const sourceType = sourceConnection?.type || 'unknown'
      const targetType = targetConnection?.type || 'unknown'
      const tableCount = tables.length || 'all'

      return `${sourceType}_to_${targetType}_${tableCount}_tables`
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
