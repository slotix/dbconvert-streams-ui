// src/types/streams.ts
import type { TargetSpec, UIStructureOptions } from './specs'
import type { ConnectionMapping } from '@/api/federated'

/**
 * Filter condition for structured query building
 */
export interface TableFilter {
  id: string
  column: string
  operator: string
  value: string
}

/**
 * Sort condition for structured query building
 */
export interface TableSort {
  column: string
  direction: 'ASC' | 'DESC'
}

/**
 * Structured filter state for table configuration
 * Backend generates SQL from this structure
 */
export interface TableFilterState {
  selectedColumns?: string[] // Empty or undefined means all columns (*)
  filters?: TableFilter[]
  sorts?: TableSort[]
  limit?: number | null
}

export interface Table {
  name: string
  filter?: TableFilterState // Structured filter state - backend generates SQL from this
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

export interface S3SourceConfig {
  bucket: string
  prefixes?: string[]
  objects?: string[]
}

// StreamConnectionMapping extends the federated ConnectionMapping with
// per-connection database/tables/queries/S3 config for stream sources.
// Each connection owns its own selection of what to stream.
export interface StreamConnectionMapping extends ConnectionMapping {
  /** Schema name - optional, defaults to provider-specific default */
  schema?: string
  /** Tables to stream from this connection (database sources) */
  tables?: Table[]
  /** Virtual query sources - complex SQL for derived data (convert mode only) */
  queries?: QuerySource[]
  /** S3 selection config for S3-backed file connections only */
  s3?: S3SourceConfig
}

export interface SourceConfig {
  // Unified connections list (required by backend)
  // Each connection contains its own database, schema, tables, queries, or S3 config
  connections?: StreamConnectionMapping[]
  // Source-level options (CDC settings, data bundle size, etc.)
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

  // File fields for file browser component compatibility
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
  /**
   * Source connection this file entry belongs to.
   * Needed to disambiguate selections when multiple file/S3 sources share the same path/bucket.
   */
  connectionId?: string
  path: string
  size?: number
  type?: 'file' | 'dir'
  selected: boolean
}
