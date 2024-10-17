import { defineStore } from 'pinia';
import api from '@/api/streams';
import { debounce } from 'lodash';
import { StreamConfig, Table } from '@/types/streamConfig';
import { Step } from '@/stores/common'
import { useConnectionsStore } from '@/stores/connections';

interface State {
    generateDefaultStreamConfigName(source: string, target: string, arg2: Table[], arg3: number): string;
    streamConfigs: StreamConfig[];
    currentStreamConfig: StreamConfig | null;
    currentStep: Step | null;
    currentFilter: string;
}

export const defaultStreamConfigOptions: StreamConfig = {
    id: '',
    name: '',
    mode: 'convert',
    status: 'idle',
    dataBundleSize: 100,
    reportingIntervals: { source: 3, target: 3 },
    operations: ['insert', 'update', 'delete'],
    createStructure: true,
    limits: { numberOfEvents: 0, elapsedTime: 0 },
    tables: [],
    skipIndexCreation: false
};

const defaultTableOptions: Partial<Table> = {
    query: '',
    operations: ['insert', 'update', 'delete'],
    skipIndexCreation: false,
    selected: false
};

const omitDefaults = (stream: StreamConfig): Partial<StreamConfig> => {
    const filteredStream: Partial<StreamConfig> = {};

    for (const key in stream) {
        if (Object.prototype.hasOwnProperty.call(stream, key)) {
            if (Array.isArray(stream[key]) && stream[key].length === 0) {
                continue;
            }
            if (typeof stream[key] === 'object' && stream[key] !== null) {
                if (JSON.stringify(stream[key]) === JSON.stringify(defaultStreamConfigOptions[key])) {
                    continue;
                }
            }
            if (stream[key] !== defaultStreamConfigOptions[key]) {
                filteredStream[key] = stream[key];
            }
        }
    }

    if (stream.mode === 'convert') {
        delete filteredStream.operations;
    }

    if (stream.tables) {
        filteredStream.tables = stream.tables.map(table => {
            const filteredTable: Partial<Table> = {};
            for (const key in table) {
                if (Object.prototype.hasOwnProperty.call(table, key)) {
                    const tableKey = key as keyof Table;
                    const defaultValue = defaultTableOptions[tableKey];

                    if (table[tableKey] !== defaultValue) {
                        filteredTable[tableKey] = table[tableKey] as any;
                    }
                }
            }

            if (stream.mode === 'convert') {
                delete filteredTable.operations;
            } else if (stream.mode === 'cdc') {
                delete filteredTable.query;
            }

            // Omit default operations if they match the default value
            if (JSON.stringify(filteredTable.operations) === JSON.stringify(defaultTableOptions.operations)) {
                delete filteredTable.operations;
            }

            return filteredTable as Table;
        });
    }

    return filteredStream;
};

export const useStreamsStore = defineStore('streams', {
    state: (): State => ({
        streamConfigs: [],
        currentStreamConfig: null,
        currentStep: null,
        currentFilter: '',
        generateDefaultStreamConfigName: function (source: string, target: string, arg2: Table[], arg3: number): string {
            throw new Error('Function not implemented.');
        }
    }),
    getters: {
        countStreams(state: State): number {
            return state.streamConfigs ? state.streamConfigs.length : 0;
        },
        // newestFirst(state: State): Stream[] {
        //     return state.streams ? state.streams.slice().reverse() : [];
        // },
        newestFirst(state: State): StreamConfig[] {
            return state.streamConfigs
                ? state.streamConfigs.slice().sort((a, b) => (b.created as number) - (a.created as number))
                : [];
        },

        streamsByType(state: State): StreamConfig[] {
            return state.streamConfigs
                .filter(el => {
                    return (
                        el.type &&
                        el.type.toLowerCase().indexOf(state.currentFilter.toLowerCase()) > -1
                    );
                })
                .reverse();
        },
        currentStreamIndexInArray(state: State): number {
            return state.streamConfigs.indexOf(state.currentStreamConfig!);
        },
    },
    actions: {
        setCurrentStream(id: string) {
            const curStream = this.streamConfigs.find(c => c.id === id);
            this.currentStreamConfig = curStream ? curStream : { ...defaultStreamConfigOptions };
            if (this.currentStreamConfig && !this.currentStreamConfig.name) {
                this.currentStreamConfig.name = this.generateDefaultStreamConfigName(
                    this.currentStreamConfig.source || '',
                    this.currentStreamConfig.target || '',
                    this.currentStreamConfig.tables || [],
                    this.currentStreamConfig.created || 0
                );
            }
        },
        setFilter(filter: string) {
            this.currentFilter = filter;
        },

        saveStream: debounce(async function (this: any) {
            try {
                this.prepareStreamData();
                if (!this.currentStreamConfig.name) {
                    this.currentStreamConfig.name = this.generateDefaultStreamConfigName(
                        this.currentStreamConfig.source,
                        this.currentStreamConfig.target,
                        this.currentStreamConfig.tables || [],
                        this.currentStreamConfig.created || 0
                    );
                }
                const stream = await api.createStream(this.currentStreamConfig as StreamConfig);
                this.resetCurrentStream();
                await this.refreshStreams();
                this.currentStreamConfig!.id = stream.id;
                this.currentStreamConfig!.created = stream.created;
            } catch (err) {
                console.error('Failed to save stream:', err);
                throw err;
            }
        }, 500),
        prepareStreamData(this: State) {
            if (this.currentStreamConfig) {
                const refinedStream = omitDefaults(this.currentStreamConfig);
                // Create a new object excluding default values
                const newStream: StreamConfig = {
                    ...this.currentStreamConfig,
                    ...refinedStream,
                    operations: this.currentStreamConfig.mode === 'convert' ? [] : this.currentStreamConfig.operations
                };

                // Exclude default operations if mode is convert
                if (newStream.mode === 'convert' && (newStream.operations?.length ?? 0) === 0) {
                    delete newStream.operations;
                }

                this.currentStreamConfig = newStream;
            }
        },
        refreshStreams: debounce(async function (this: State) {
            try {
                this.streamConfigs = await api.getStreams() as unknown as StreamConfig[];
            } catch (error) {
                console.error('Failed to refresh streams:', error);
                throw error;
            }
        }, 500),
        deleteStream: debounce(async function (this: State, configID: string) {
            try {
                const index = this.streamConfigs.findIndex((stream: StreamConfig) => stream.id === configID);
                if (index !== -1) {
                    this.streamConfigs.splice(index, 1);
                }
                await api.deleteStream(configID);
            } catch (error) {
                console.error('Failed to delete stream:', error);
                throw error;
            }
        }, 500),
        async cloneStream(configID: string) {
            try {
                const resp = await api.cloneStreamConfig(configID) as unknown as StreamConfig;
                this.currentStreamConfig = {
                    ...this.currentStreamConfig!,
                    id: resp.id,
                    created: resp.created,
                };
                this.saveStream();
            } catch (error) {
                console.error('Failed to clone stream:', error);
                throw error;
            }
        },
        async startStream(configID: string) {
            try {
                const resp = await api.startStream(configID);
                this.updateStreamStatus(configID, 'running');
            } catch (error) {
                console.error('Failed to start stream:', error);
                throw error;
            }
        },
        async pauseStream(configID: string) {
            try {
                const resp = await api.pauseStream(configID);
                this.updateStreamStatus(configID, 'paused');
            } catch (error) {
                console.error('Failed to pause stream:', error);
                throw error;
            }
        },

        async resumeStream(configID: string) {
            try {
                const resp = await api.resumeStream(configID);
                this.updateStreamStatus(configID, 'running');
            } catch (error) {
                console.error('Failed to resume stream:', error);
                throw error;
            }
        },

        async stopStream(configID: string) {
            try {
                const resp = await api.stopStream(configID);
                this.updateStreamStatus(configID, 'stopped');
            } catch (error) {
                console.error('Failed to stop stream:', error);
                throw error;
            }
        },
        updateStreamStatus(id: string, status: StreamConfig['status']) {
            const streamIndex = this.streamConfigs.findIndex(stream => stream.id === id);
            if (streamIndex !== -1) {
                this.streamConfigs[streamIndex] = { ...this.streamConfigs[streamIndex], status };
            }
        },
        resetCurrentStream(this: State) {
            const defaultConfig = {
                ...defaultStreamConfigOptions,
                id: '',
                source: '',
                target: '',
            };
            this.currentStreamConfig = {
                ...defaultConfig,
            };
        },
        async clearStreams(this: State) {
            this.streamConfigs.length = 0;
        },
        generateDefaultStreamConfigName(source: string, target: string, tables: Table[], created: number): string {
            const sourceType = useConnectionsStore().connectionByID(source)?.type || 'Unknown';
            const targetType = useConnectionsStore().connectionByID(target)?.type || 'Unknown';
            const tableCount = tables.length;
            const firstTableName = tables[0]?.name || 'unknown';
            const milliseconds = created === 0 ? Date.now() : created * 1000;
            const date = new Date(milliseconds).toISOString().split('T')[0];

            let name = `${sourceType}_to_${targetType}_${firstTableName}`;
            if (tableCount > 1) {
                name += `_and_${tableCount - 1}_more`;
            }
            name += `_${date}`;

            return name;
        },
    },
});
