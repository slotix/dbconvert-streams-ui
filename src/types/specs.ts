// Matryoshka Pattern - Nested Spec Types for Connections and Targets
// Matches backend: internal/dbengine/connection_spec.go and internal/stream/target_spec.go

// ===== Connection Specs =====

export interface DatabaseConnectionSpec {
  host: string
  port: number
  username: string
  password?: string
  database?: string // Default database for metadata browsing
}

export interface S3Credentials {
  accessKey?: string
  secretKey?: string
  sessionToken?: string
  credentialsRef?: string // Vault path
}

export interface S3ConnectionScope {
  bucket?: string // Limit Data Explorer to this bucket
  prefix?: string // Limit Data Explorer to this prefix
}

export interface S3ConnectionSpec {
  region: string
  credentials?: S3Credentials
  endpoint?: string // For S3-compatible services (MinIO, etc.)
  scope?: S3ConnectionScope // Optional: for Data Explorer browsing only
}

export interface GCSConnectionScope {
  bucket?: string
  prefix?: string
}

export interface GCSConnectionSpec {
  region?: string
  serviceAccountJSON?: string // Base64-encoded
  serviceAccountKeyRef?: string // Vault path
  endpoint?: string
  scope?: GCSConnectionScope
}

export interface AzureConnectionScope {
  container?: string
  prefix?: string
}

export interface AzureConnectionSpec {
  accountName: string
  accountKey?: string
  sasToken?: string
  // Service Principal
  clientID?: string
  clientSecret?: string
  tenantID?: string
  credentialsRef?: string
  endpoint?: string
  scope?: AzureConnectionScope
}

export interface SnowflakeConnectionSpec {
  account: string // e.g., xy12345.us-east-1
  username: string
  password?: string
  database?: string
  schema?: string
  warehouse?: string
  role?: string
}

// File connection spec - for local files only
// Cloud storage (S3, GCS, Azure) uses their dedicated spec types
export interface FileConnectionSpec {
  basePath: string // Local filesystem path: /data/files, /tmp/exports, etc.
}

// Discriminated union - exactly ONE of these should be present
export interface ConnectionSpec {
  database?: DatabaseConnectionSpec
  s3?: S3ConnectionSpec
  gcs?: GCSConnectionSpec
  azure?: AzureConnectionSpec
  snowflake?: SnowflakeConnectionSpec
  files?: FileConnectionSpec
}

// ===== Target Specs =====

export interface DatabaseTargetSpec {
  database: string
  schema?: string
  structureOptions?: StructureOptions
}

export interface StructureOptions {
  createDatabase?: boolean
  createSchema?: boolean
  createTables?: boolean
  createIndexes?: boolean
  createForeignKeys?: boolean
  createViews?: boolean
}

export interface ParquetConfig {
  compressionCodec?: string
  compressionLevel?: number
  dataPageSize?: number
  maxRowGroupSize?: number
  targetRowGroupSizeMB?: number
  parquetVersion?: string
  dataPageVersion?: string
  enableDictionary?: boolean
  enableStatistics?: boolean
  timestampUnit?: string
  binaryFormat?: string
}

export interface CSVConfig {
  delimiter?: string
  quote?: string
  header?: boolean
}

export interface FileFormatSpec {
  compression?: string
  parquet?: ParquetConfig
  csv?: CSVConfig
}

export interface FileSpec {
  outputDirectory: string
  fileFormat: string // csv, json, jsonl, parquet
  format?: FileFormatSpec
}

export interface S3UploadConfig {
  bucket: string
  prefix?: string
  storageClass?: string
  keepLocalFiles?: boolean
}

export interface S3Spec {
  // Embedded FileSpec fields
  outputDirectory: string
  fileFormat: string
  format?: FileFormatSpec
  // S3-specific
  upload: S3UploadConfig
}

export interface GCSUploadConfig {
  bucket: string
  prefix?: string
  storageClass?: string
  keepLocalFiles?: boolean
}

export interface GCSSpec {
  // Embedded FileSpec fields
  outputDirectory: string
  fileFormat: string
  format?: FileFormatSpec
  // GCS-specific
  upload: GCSUploadConfig
}

export interface AzureUploadConfig {
  container: string
  prefix?: string
  keepLocalFiles?: boolean
}

export interface AzureBlobSpec {
  // Embedded FileSpec fields
  outputDirectory: string
  fileFormat: string
  format?: FileFormatSpec
  // Azure-specific
  upload?: AzureUploadConfig
}

export interface SnowflakeConfig {
  fileFormat?: string
  compressionType?: string
  outputDirectory?: string
  filePrefix?: string
  timestampFormat?: string
}

export interface SnowflakeStagingSpec {
  // Embedded FileSpec fields
  outputDirectory: string
  fileFormat: string
  format?: FileFormatSpec
  // Snowflake-specific
  config?: SnowflakeConfig
}

export interface SnowflakeTargetSpec {
  // Embedded DatabaseTargetSpec fields
  database: string
  schema?: string
  structureOptions?: StructureOptions
  // Snowflake-specific
  staging: SnowflakeStagingSpec
}

// Discriminated union - exactly ONE of these should be present
export interface TargetSpec {
  database?: DatabaseTargetSpec
  files?: FileSpec
  s3?: S3Spec
  gcs?: GCSSpec
  azure?: AzureBlobSpec
  snowflake?: SnowflakeTargetSpec
}

// ===== Helper Functions =====

// Get the active spec type from a ConnectionSpec
export function getConnectionSpecType(spec: ConnectionSpec | undefined): string | null {
  if (!spec) return null
  if (spec.database) return 'database'
  if (spec.s3) return 's3'
  if (spec.gcs) return 'gcs'
  if (spec.azure) return 'azure'
  if (spec.snowflake) return 'snowflake'
  if (spec.files) return 'files'
  return null
}

// Get the active spec type from a TargetSpec
export function getTargetSpecType(spec: TargetSpec | undefined): string | null {
  if (!spec) return null
  if (spec.database) return 'database'
  if (spec.files) return 'files'
  if (spec.s3) return 's3'
  if (spec.gcs) return 'gcs'
  if (spec.azure) return 'azure'
  if (spec.snowflake) return 'snowflake'
  return null
}

// Validate that only one spec type is present
export function validateConnectionSpec(spec: ConnectionSpec): boolean {
  const types = [spec.database, spec.s3, spec.gcs, spec.azure, spec.snowflake, spec.files]
  const nonNullCount = types.filter((t) => t !== undefined).length
  return nonNullCount === 1
}

// Validate that only one spec type is present
export function validateTargetSpec(spec: TargetSpec): boolean {
  const types = [spec.database, spec.files, spec.s3, spec.gcs, spec.azure, spec.snowflake]
  const nonNullCount = types.filter((t) => t !== undefined).length
  return nonNullCount === 1
}
