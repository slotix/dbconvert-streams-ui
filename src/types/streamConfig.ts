// src/types/streams.ts
export interface Table {
  name: string
  query: string
  operations: string[]
  selected: boolean
  skipIndexCreation?: boolean
}

export interface StreamConfig {
  id: string
  name: string
  created?: number
  mode: 'cdc' | 'convert'
  dataBundleSize: number
  reportingIntervals: {
    source: number
    target: number
  }
  operations?: string[]
  createStructure: boolean
  skipIndexCreation: boolean
  limits: {
    numberOfEvents: number
    elapsedTime: number
  }
  tables?: Table[]
  [key: string]: any
}
export interface ReportingIntervals {
  source: number
  target: number
}

export interface Limits {
  numberOfEvents: number
  elapsedTime: number
}
