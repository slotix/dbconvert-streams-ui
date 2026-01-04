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
  skipData?: boolean // Skip data transfer - only create structure
}

export interface StructureOptions {
  // Backend fields - these are what gets sent to the API
  tables?: boolean
  indexes?: boolean
  foreignKeys?: boolean
  checkConstraints?: boolean
}

// UI structure options - same as backend, just used in wizard before saving
export type UIStructureOptions = StructureOptions

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
  useDuckDB?: boolean
}

export interface FileSpec {
  // Note: outputDirectory is NOT used for local file targets.
  // The connection's spec.files.basePath determines the output location.
  // outputDirectory is only meaningful for cloud targets (S3/GCS/Azure) where
  // it specifies the local staging directory before upload.
  fileFormat: string // csv, json, jsonl, parquet
  format?: FileFormatSpec
}

/**
 * S3 upload configuration for stream targets.
 * Credentials and region are inherited from the referenced Connection.
 */
export interface S3UploadConfig {
  bucket: string
  prefix?: string
  storageClass?: string
  keepLocalFiles?: boolean
  // Encryption options
  serverSideEnc?: string // AES256, aws:kms, etc.
  kmsKeyId?: string // KMS key ARN when using aws:kms
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
  skipData?: boolean // Skip data transfer - only create structure
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

// Connection kind type - all possible connection types
export type ConnectionKind = 'database' | 's3' | 'gcs' | 'azure' | 'snowflake' | 'files'

// Target kind type - all possible target types
export type TargetKind = 'database' | 's3' | 'gcs' | 'azure' | 'snowflake' | 'files'

/**
 * Get the kind from a ConnectionSpec - spec is the ONLY source of truth.
 * This is the canonical way to determine connection type.
 * DO NOT use connection.type for routing decisions.
 */
export function getConnectionKindFromSpec(spec: ConnectionSpec | undefined): ConnectionKind | null {
  if (!spec) return null
  if (spec.database) return 'database'
  if (spec.s3) return 's3'
  if (spec.gcs) return 'gcs'
  if (spec.azure) return 'azure'
  if (spec.snowflake) return 'snowflake'
  if (spec.files) return 'files'
  return null
}

/**
 * Check if a connection kind represents a file-based source/target.
 * File-based kinds include local files and all cloud storage types.
 */
export function isFileBasedKind(kind: ConnectionKind | TargetKind | null): boolean {
  return kind === 's3' || kind === 'gcs' || kind === 'azure' || kind === 'files'
}

/**
 * Check if a connection kind represents cloud storage (not local files).
 */
export function isCloudStorageKind(kind: ConnectionKind | TargetKind | null): boolean {
  return kind === 's3' || kind === 'gcs' || kind === 'azure'
}

/**
 * Check if a connection kind is a database type.
 */
export function isDatabaseKind(kind: ConnectionKind | TargetKind | null): boolean {
  return kind === 'database' || kind === 'snowflake'
}

/**
 * Get a normalized type label for UI usage based on spec kind.
 * - Database kind uses connection.type (engine)
 * - Snowflake kind returns "snowflake"
 * - File kinds return their explicit kind (files/s3/gcs/azure)
 */
export function getConnectionTypeLabel(
  spec: ConnectionSpec | undefined,
  connectionType?: string
): string | null {
  const kind = getConnectionKindFromSpec(spec)
  if (!kind) return null
  if (kind === 'database') {
    return connectionType ? connectionType.toLowerCase() : null
  }
  if (kind === 'snowflake') {
    return 'snowflake'
  }
  return kind
}

// SQL dialect type (used for editors, formatters, and query builders).
export type SqlDialect = 'mysql' | 'pgsql' | 'sql'

/**
 * Get SQL dialect from a connection engine label (not spec kind).
 */
export function getSqlDialectFromType(connectionType?: string): SqlDialect {
  const normalized = connectionType?.toLowerCase() || ''
  if (!normalized) return 'sql'
  if (normalized === 'postgresql' || normalized === 'postgres' || normalized === 'pgsql') {
    return 'pgsql'
  }
  if (normalized === 'mysql' || normalized === 'mariadb') {
    return 'mysql'
  }
  return 'sql'
}

/**
 * Get SQL dialect from a ConnectionSpec + engine label.
 * Non-database kinds always return 'sql'.
 */
export function getSqlDialectFromConnection(
  spec: ConnectionSpec | undefined,
  connectionType?: string
): SqlDialect {
  const kind = getConnectionKindFromSpec(spec)
  if (!isDatabaseKind(kind)) return 'sql'
  return getSqlDialectFromType(connectionType)
}

/**
 * Match a single connection against a type filter string.
 * Uses spec kind as the source of truth for file vs database.
 */
export function matchesConnectionTypeFilter(
  spec: ConnectionSpec | undefined,
  connectionType: string | undefined,
  filter: string | null | undefined
): boolean {
  const normalizedFilter = (filter || '').toLowerCase().trim()
  if (!normalizedFilter || normalizedFilter === 'all') return true

  const kind = getConnectionKindFromSpec(spec)
  if (!kind) return false

  if (normalizedFilter === 'files') {
    return isFileBasedKind(kind)
  }
  if (normalizedFilter === 's3') {
    return kind === 's3'
  }

  const typeLabel = getConnectionTypeLabel(spec, connectionType)
  if (!typeLabel) return false

  if (normalizedFilter === 'postgresql') {
    return typeLabel.includes('postgres')
  }
  return typeLabel.includes(normalizedFilter) || normalizedFilter.includes(typeLabel)
}
