// src/types/streams.ts
import type { TargetSpec } from './specs'

export interface Table {
  name: string
  query?: string
  selected?: boolean
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

export interface TargetOptions {
  stagingDirectory?: string
  compressionType?: 'uncompressed' | 'gzip' | 'zstd' | 'none'
  workerPoolSize?: number
  structureOptions?: {
    tables?: string | boolean
    indexes?: string | boolean
    foreignKeys?: string | boolean
  }
  skipData?: boolean
  useDuckDBWriter?: boolean
  parquetConfig?: ParquetConfig
  csvConfig?: CSVConfig
  snowflakeConfig?: SnowflakeConfig
  s3UploadConfig?: S3UploadConfig
  performanceConfig?: PerformanceConfig
}

export interface ParquetConfig {
  compressionCodec?: string
  rowGroupSize?: number
  pageSize?: number
}

export interface CSVConfig {
  delimiter?: string
  quote?: string
  header?: boolean
}

export interface SnowflakeConfig {
  outputDirectory?: string
  filePrefix?: string
  timestampFormat?: string
}

/**
 * S3 upload configuration for stream targets (UI temporary state).
 * This matches the backend config.S3UploadConfig structure.
 * Credentials come from Connection.spec.s3, NOT stored here.
 */
export interface S3UploadConfig {
  bucket?: string
  prefix?: string
  keepLocalFiles?: boolean
  storageClass?: string
  serverSideEnc?: string
  kmsKeyId?: string
}

export interface PerformanceConfig {
  batchSize?: number
  workerPoolSize?: number
  channelBuffer?: number
  flushIntervalMs?: number
}

export interface SourceConfig {
  id: string
  // Database and schema selection (stream-specific)
  database?: string // Database name - required for database connections
  schema?: string // Schema name - optional, defaults to provider-specific default
  tables?: Table[]
  options?: SourceOptions
}

export interface TargetConfig {
  id: string
  fileFormat?: string
  subDirectory?: string
  // Matryoshka spec pattern (built dynamically before sending to backend)
  spec?: TargetSpec
  options?: TargetOptions
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
  structureOptions?: TargetOptions['structureOptions']
  skipData?: boolean
}

export interface FileEntry {
  name: string
  path: string
  size?: number
  selected: boolean
}
