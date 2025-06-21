// src/types/streams.ts
export interface Table {
  name: string
  query: string
  selected: boolean
}

export interface StreamID {
  id: string
}

// Structure strategy options matching the backend - updated with clearer naming
export type StructureStrategy =
  | 'create_if_not_exists'
  | 'fail_if_exists'
  | 'disabled'

// New simplified structure options from swagger.yaml
export interface StructureOptions {
  tables?: StructureStrategy
  indexes?: StructureStrategy
  foreignKeys?: StructureStrategy
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

  // Structure options
  structureOptions?: StructureOptions

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
