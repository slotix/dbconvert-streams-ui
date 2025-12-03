// src/types/streams.ts
import type { TargetSpec, UIStructureOptions } from './specs'

export interface Table {
  name: string
  query?: string
  selected?: boolean
}

/**
 * Column definition for query results - auto-detected or user-provided
 */
export interface QueryColumn {
  name: string
  type: string
  nullable?: boolean
}

/**
 * Virtual query source - complex SQL that creates derived data
 * Only available in 'convert' mode (not CDC)
 */
export interface QuerySource {
  name: string // Virtual table name for target
  query: string // Full SQL query (CTE, JOINs, aggregations, etc.)
  columns?: QueryColumn[] // Auto-detected from EXPLAIN or user-provided
  validated?: boolean // Whether query has been validated
}

export interface StreamID {
  id: string
}

export interface StreamRunHistory {
  id: string // Stream execution ID
  timestamp: number
  duration: string
  status: string
  dataSize: string
}

export interface SourceOptions {
  dataBundleSize?: number
  replicationSlot?: string
  publicationName?: string
  binlogPosition?: string
  operations?: string[] // CDC operation filter: 'insert', 'update', 'delete'
}

export interface SourceConfig {
  id: string
  // Database and schema selection (stream-specific)
  database?: string // Database name - required for database connections
  schema?: string // Schema name - optional, defaults to provider-specific default
  tables?: Table[]
  queries?: QuerySource[] // Virtual query sources - complex SQL for derived data (convert mode only)
  options?: SourceOptions
}

/**
 * Target configuration matching backend TargetConfig.
 * The backend only has: id and spec (no options field).
 * @see internal/stream/target_spec.go
 */
export interface TargetConfig {
  id: string
  spec?: TargetSpec
}

export interface Limits {
  numberOfEvents?: number
  elapsedTime?: number
}

export interface StreamConfig {
  id?: string
  name: string
  mode: 'cdc' | 'convert'
  description?: string
  created?: number
  reportingInterval?: number // Reporting interval in seconds for both source and target
  source: SourceConfig
  target: TargetConfig
  limits?: Limits

  // Legacy file fields - for file browser component compatibility
  files?: FileEntry[]

  // Temporary UI-only fields (not sent to backend)
  _allTablesWithState?: Table[]
  sourceDatabase?: string
  targetDatabase?: string
  sourceSchema?: string
  targetSchema?: string
  targetPath?: string
  structureOptions?: UIStructureOptions
  skipData?: boolean // Skip data transfer - only create structure (set by wizard)
}

export interface FileEntry {
  name: string
  path: string
  size?: number
  selected: boolean
}
