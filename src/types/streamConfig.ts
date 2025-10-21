// src/types/streams.ts
export interface Table {
  name: string
  query: string
  selected: boolean
}

export interface StreamID {
  id: string
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
