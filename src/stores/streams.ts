import { defineStore } from 'pinia';
import api from '@/api/streams';
import { debounce } from 'lodash';
import { Stream, Table } from '@/types/streams';
import { Step } from '@/stores/common'

interface State {
    streams: Stream[];
    currentStream: Stream | null;
    currentStep: Step | null;
    currentFilter: string;
}

export const defaultStreamOptions: Stream = {
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

const omitDefaults = (stream: Stream): Partial<Stream> => {
    const filteredStream: Partial<Stream> = {};

    for (const key in stream) {
        if (Object.prototype.hasOwnProperty.call(stream, key)) {
            if (Array.isArray(stream[key]) && stream[key].length === 0) {
                continue;
            }
            if (typeof stream[key] === 'object' && stream[key] !== null) {
                if (JSON.stringify(stream[key]) === JSON.stringify(defaultStreamOptions[key])) {
                    continue;
                }
            }
            if (stream[key] !== defaultStreamOptions[key]) {
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
        streams: [],
        currentStream: null,
        currentStep: null,
        currentFilter: '',
    }),
    getters: {
        countStreams(state: State): number {
            return state.streams ? state.streams.length : 0;
        },
        // newestFirst(state: State): Stream[] {
        //     return state.streams ? state.streams.slice().reverse() : [];
        // },
        newestFirst(state: State): Stream[] {
            return state.streams
                ? state.streams.slice().sort((a, b) => (b.created as number) - (a.created as number))
                : [];
        },

        streamsByType(state: State): Stream[] {
            return state.streams
                .filter(el => {
                    return (
                        el.type &&
                        el.type.toLowerCase().indexOf(state.currentFilter.toLowerCase()) > -1
                    );
                })
                .reverse();
        },
        currentStreamIndexInArray(state: State): number {
            return state.streams.indexOf(state.currentStream!);
        },
    },
    actions: {
        setCurrentStream(id: string) {
            const curStream = this.streams.find(c => c.id === id);
            this.currentStream = curStream ? curStream : { ...defaultStreamOptions };
        },
        setFilter(filter: string) {
            this.currentFilter = filter;
        },

        saveStream: debounce(async function (this: any) {
            try {
                this.prepareStreamData();
                const stream = await api.createStream(this.currentStream!);
                this.resetCurrentStream();
                await this.refreshStreams();
                this.currentStream!.id = stream.id;
                this.currentStream!.created = stream.created;
            } catch (err) {
                console.error('Failed to save stream:', err);
                throw err;
            }
        }, 500),
        prepareStreamData(this: State) {
            if (this.currentStream) {
                const refinedStream = omitDefaults(this.currentStream);
                // Create a new object excluding default values
                const newStream: Stream = {
                    ...this.currentStream,
                    ...refinedStream,
                    operations: this.currentStream.mode === 'convert' ? [] : this.currentStream.operations
                };

                // Exclude default operations if mode is convert
                if (newStream.mode === 'convert' && (newStream.operations?.length ?? 0) === 0) {
                    delete newStream.operations;
                }

                this.currentStream = newStream;
            }
        },
        refreshStreams: debounce(async function (this: State) {
            try {
                this.streams = await api.getStreams() as unknown as Stream[];
            } catch (error) {
                console.error('Failed to refresh streams:', error);
                throw error;
            }
        }, 500),
        deleteStream: debounce(async function (this: State, id: string) {
            try {
                const index = this.streams.findIndex((stream: Stream) => stream.id === id);
                if (index !== -1) {
                    this.streams.splice(index, 1);
                }
                await api.deleteStream(id);
            } catch (error) {
                console.error('Failed to delete stream:', error);
                throw error;
            }
        }, 500),
        async cloneStream(id: string) {
            try {
                const resp = await api.cloneStream(id) as unknown as Stream;
                this.currentStream = {
                    ...this.currentStream!,
                    id: resp.id,
                    created: resp.created,
                };
                this.saveStream();
            } catch (error) {
                console.error('Failed to clone stream:', error);
                throw error;
            }
        },
        async startStream(id: string) {
            try {
                const resp = await api.startStream(id);
                this.updateStreamStatus(id, 'running');
            } catch (error) {
                console.error('Failed to start stream:', error);
                throw error;
            }
        },
        async pauseStream(id: string) {
            try {
                const resp = await api.pauseStream(id);
                this.updateStreamStatus(id, 'paused');
            } catch (error) {
                console.error('Failed to pause stream:', error);
                throw error;
            }
        },

        async resumeStream(id: string) {
            try {
                const resp = await api.resumeStream(id);
                this.updateStreamStatus(id, 'running');
            } catch (error) {
                console.error('Failed to resume stream:', error);
                throw error;
            }
        },

        async stopStream(id: string) {
            try {
                const resp = await api.stopStream(id);
                this.updateStreamStatus(id, 'stopped');
            } catch (error) {
                console.error('Failed to stop stream:', error);
                throw error;
            }
        },
        updateStreamStatus(id: string, status: Stream['status']) {
            const streamIndex = this.streams.findIndex(stream => stream.id === id);
            if (streamIndex !== -1) {
                this.streams[streamIndex] = { ...this.streams[streamIndex], status };
            }
        },
        resetCurrentStream(this: State) {
            this.currentStream = {
                ...defaultStreamOptions,
                id: '',
                source: '',
                target: '',
            };
        },
        async clearStreams(this: State) {
            this.streams.length = 0;
        },
    },
});
