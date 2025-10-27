// src/types/streams.ts
export interface Table {
  name: string
  query: string
  selected: boolean
}

export interface StreamID {
  id: string
}

export interface StreamRunHistory {
  timestamp: number
  duration: string
  status: string
  dataSize: string
  streamID?: string
}

export interface StreamConfig {
  id: string
  name: string
  source?: string
  target?: string
  sourceDatabase?: string
  targetDatabase?: string
  created?: number
  mode: 'cdc' | 'convert'
  dataBundleSize: number
  reportingIntervals: {
    source: number
    target: number
  }
  operations?: string[]
  targetFileFormat?: 'csv' | 'json' | 'jsonl' | 'parquet'

  // Granular structure creation options
  structureOptions?: {
    tables?: boolean
    indexes?: boolean
    foreignKeys?: boolean
  }

  // Skip data transfer - only create structure
  skipData?: boolean

  limits: {
    numberOfEvents: number
    elapsedTime: number
  }
  tables?: Table[]
  files?: FileEntry[]
  history?: StreamRunHistory[]
  [key: string]: any
}

export interface FileEntry {
  name: string
  path: string
  size?: number
  selected: boolean
}

export interface ReportingIntervals {
  source: number
  target: number
}

export interface Limits {
  numberOfEvents: number
  elapsedTime: number
}
