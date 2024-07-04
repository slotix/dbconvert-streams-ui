// src/types/streams.ts

export interface Table {
    query?: string;
    operations?: string[];
}
export interface Stream {
    id: string;
    name: string;
    created?: string;
    mode?: string;
    dataBundleSize?: number;
    reportingIntervals?: {
        source: number;
        target: number;
    };
    operations?: string[];
    createStructure?: boolean;
    limits?: {
        numberOfEvents: number;
        elapsedTime: number;
    };
    tables?: Table[];
    [key: string]: any;
}