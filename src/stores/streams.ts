import { defineStore } from 'pinia';
import api from '@/api/streams';
import { debounce } from 'lodash';
import { Stream, Table } from '@/types/streams';

interface ReportingIntervals {
    source: number;
    target: number;
}

interface Limits {
    numberOfEvents: number;
    elapsedTime: number;
}



interface State {
    streams: Stream[];
    currentStream: Stream | null;
    currentStep: any;
    currentFilter: string;
}

export const defaultStreamOptions: Stream = {
    id: '',
    name: '',
    mode: 'convert',
    dataBundleSize: 100,
    reportingIntervals: { source: 3, target: 3 },
    operations: ['insert', 'update', 'delete'],
    createStructure: true,
    limits: { numberOfEvents: 0, elapsedTime: 0 },
    tables: [],
    skipIndexCreation: false
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
        newestFirst(state: State): Stream[] {
            return state.streams ? state.streams.slice().reverse() : [];
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
            const stream = this.currentStream!;
            if (!stream.id) {
                stream.id = '';
            }
            if (stream.mode === 'cdc' && stream.tables) {
                stream.tables.forEach((table: Table) => {
                    table.query = '';
                });
            } else if (stream.mode === 'convert') {
                stream.operations = [];
                if (stream.tables) {
                    stream.tables.forEach((table: Table) => {
                        table.operations = [];
                    });
                }
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
        cloneStream: debounce(async function (this: any, id: string) {
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
        }, 500),
        async startStream(this: State, id: string) {
            try {
                const resp = await api.startStream(id);
                // console.log(resp.data.id);
            } catch (error) {
                console.error('Failed to start stream:', error);
                throw error;
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
