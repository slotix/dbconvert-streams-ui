// src/types/streams.ts
export interface Table {
    name: string;
    query: string;
    operations: string[];
    selected: boolean;
    skipIndexCreation?: boolean;
}

export interface Stream {
    id: string;
    name: string;
    created?: string;
    mode: 'cdc' | 'convert';
    dataBundleSize: number;
    reportingIntervals: {
        source: number;
        target: number;
    };
    operations?: string[];
    createStructure: boolean;
    skipIndexCreation: boolean;
    limits: {
        numberOfEvents: number;
        elapsedTime: number;
    };
    tables?: Table[];
    [key: string]: any;
}
