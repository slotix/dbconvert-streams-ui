// src/types/streams.ts
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
  timestampFormat?: string
}

export interface S3UploadConfig {
  bucket?: string
  prefix?: string
  region?: string
  credentialSource?: string
  accessKeyId?: string
  secretAccessKey?: string
  keepLocalFiles?: boolean
  storageClass?: string
  serverSideEnc?: string
  kmsKeyId?: string
  useSSL?: boolean
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
  // Database and schema selection (stream-specific)
  database?: string // Database name - required for database connections
  schema?: string // Schema name - optional, defaults to provider-specific default
  fileFormat?: 'csv' | 'json' | 'jsonl' | 'parquet'
  subDirectory?: string
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
