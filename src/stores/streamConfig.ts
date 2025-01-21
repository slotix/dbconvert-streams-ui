import { defineStore } from 'pinia'
import api from '@/api/streams'
import { debounce } from 'lodash'
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
  createStructure: true,
  limits: { numberOfEvents: 0, elapsedTime: 0 },
  tables: [],
  skipIndexCreation: false
}

const defaultTableOptions: Partial<Table> = {
  query: '',
  operations: ['insert', 'update', 'delete'],
  skipIndexCreation: false,
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
        delete filteredTable.operations
      } else if (stream.mode === 'cdc') {
        delete filteredTable.query
      }

      // Omit default operations if they match the default value
      if (
        JSON.stringify(filteredTable.operations) === JSON.stringify(defaultTableOptions.operations)
      ) {
        delete filteredTable.operations
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
      return state.streamConfigs.indexOf(state.currentStreamConfig!)
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
      }
    },
    setFilter(filter: string) {
      this.currentFilter = filter
    },
    addStream() {
      this.resetCurrentStream()
      useConnectionsStore().resetCurrentConnection()
    },
    saveStream: debounce(async function (this: any) {
      try {
        this.prepareStreamData()
        if (!this.currentStreamConfig.name) {
          this.currentStreamConfig.name = this.generateDefaultStreamConfigName(
            this.currentStreamConfig.source,
            this.currentStreamConfig.target,
            this.currentStreamConfig.tables || []
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
    }, 500),
    prepareStreamData(this: State) {
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
    refreshStreams: debounce(async function (this: State) {
      try {
        this.streamConfigs = (await api.getStreams()) as unknown as StreamConfig[]
      } catch (error) {
        console.error('Failed to refresh streams:', error)
        throw error
      }
    }, 500),
    deleteStream: debounce(async function (this: State, configID: string) {
      try {
        const index = this.streamConfigs.findIndex((stream: StreamConfig) => stream.id === configID)
        if (index !== -1) {
          this.streamConfigs.splice(index, 1)
        }
        await api.deleteStream(configID)
      } catch (error) {
        console.error('Failed to delete stream:', error)
        throw error
      }
    }, 500),
    async cloneStream(configID: string) {
      try {
        const resp = (await api.cloneStreamConfig(configID)) as unknown as StreamConfig
        this.currentStreamConfig = {
          ...this.currentStreamConfig!,
          id: resp.id,
          created: resp.created
        }
        this.saveStream()
      } catch (error) {
        console.error('Failed to clone stream:', error)
        throw error
      }
    },
    async startStream(configID: string): Promise<string> {
      try {
        const resp = await api.startStream(configID)
        this.updateStreamStatus(statusEnum.RUNNING as unknown as typeof statusEnum)
        return resp
      } catch (error) {
        console.error('Failed to start stream:', error)
        throw error
      }
    },
    async pauseStream(configID: string) {
      try {
        await api.pauseStream(configID)
        this.updateStreamStatus(statusEnum.PAUSED as unknown as typeof statusEnum)
      } catch (error) {
        console.error('Failed to pause stream:', error)
        throw error
      }
    },

    async resumeStream(configID: string) {
      try {
        await api.resumeStream(configID)
        this.updateStreamStatus(statusEnum.RUNNING as unknown as typeof statusEnum)
      } catch (error) {
        console.error('Failed to resume stream:', error)
        throw error
      }
    },

    async stopStream(configID: string) {
      try {
        await api.stopStream(configID)
        this.updateStreamStatus(statusEnum.STOPPED as unknown as typeof statusEnum)
      } catch (error) {
        console.error('Failed to stop stream:', error)
        throw error
      }
    },

    updateStreamStatus(status: typeof statusEnum) {
      useMonitoringStore().updateStreamStatus(status)
    },
    resetCurrentStream(this: State) {
      const defaultConfig = {
        ...defaultStreamConfigOptions,
        id: '',
        source: '',
        target: ''
      }
      this.currentStreamConfig = {
        ...defaultConfig
      }
    },
    async clearStreams(this: State) {
      this.streamConfigs.length = 0
    },
    generateDefaultStreamConfigName(source: string, target: string, tables: Table[]): string {
      const sourceType = useConnectionsStore().connectionByID(source)?.type || 'Unknown'
      const targetType = useConnectionsStore().connectionByID(target)?.type || 'Unknown'
      const tableCount = tables.length
      const firstTableName = tables[0]?.name || 'unknown'

      let name = `${sourceType}_to_${targetType}_${firstTableName}`
      if (tableCount > 1) {
        name += `_and_${tableCount - 1}_more`
      }

      return name
    }
  }
})
