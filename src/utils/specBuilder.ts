// Utility functions for building ConnectionSpec and TargetSpec from UI forms
import type {
  ConnectionSpec,
  DatabaseConnectionSpec,
  S3ConnectionSpec,
  GCSConnectionSpec,
  AzureConnectionSpec,
  FileConnectionSpec,
  SnowflakeConnectionSpec,
  TargetSpec,
  DatabaseTargetSpec,
  FileSpec,
  S3Spec,
  GCSSpec,
  AzureBlobSpec,
  SnowflakeTargetSpec,
  FileFormatSpec,
  ParquetConfig,
  CSVConfig,
  StructureOptions
} from '../types/specs'
import type { Connection } from '../types/connections'

// ===== Connection Spec Builders =====

export function buildDatabaseConnectionSpec(
  host: string,
  port: number,
  username: string,
  password?: string,
  database?: string
): ConnectionSpec {
  const spec: DatabaseConnectionSpec = {
    host,
    port,
    username,
    password,
    database
  }
  return { database: spec }
}

export function buildS3ConnectionSpec(
  region: string,
  endpoint?: string,
  accessKey?: string,
  secretKey?: string,
  sessionToken?: string,
  bucket?: string,
  prefix?: string
): ConnectionSpec {
  const spec: S3ConnectionSpec = {
    region,
    endpoint,
    credentials:
      accessKey || secretKey || sessionToken
        ? {
            accessKey,
            secretKey,
            sessionToken
          }
        : undefined,
    scope:
      bucket || prefix
        ? {
            bucket,
            prefix
          }
        : undefined
  }
  return { s3: spec }
}

export function buildGCSConnectionSpec(
  region?: string,
  serviceAccountJSON?: string,
  endpoint?: string,
  bucket?: string,
  prefix?: string
): ConnectionSpec {
  const spec: GCSConnectionSpec = {
    region,
    serviceAccountJSON,
    endpoint,
    scope:
      bucket || prefix
        ? {
            bucket,
            prefix
          }
        : undefined
  }
  return { gcs: spec }
}

export function buildAzureConnectionSpec(
  accountName: string,
  accountKey?: string,
  sasToken?: string,
  clientID?: string,
  clientSecret?: string,
  tenantID?: string,
  endpoint?: string,
  container?: string,
  prefix?: string
): ConnectionSpec {
  const spec: AzureConnectionSpec = {
    accountName,
    accountKey,
    sasToken,
    clientID,
    clientSecret,
    tenantID,
    endpoint,
    scope:
      container || prefix
        ? {
            container,
            prefix
          }
        : undefined
  }
  return { azure: spec }
}

export function buildFileConnectionSpec(basePath: string): ConnectionSpec {
  const spec: FileConnectionSpec = {
    basePath
  }
  return { files: spec }
}

export function buildSnowflakeConnectionSpec(
  account: string,
  username: string,
  password?: string,
  database?: string,
  schema?: string,
  warehouse?: string,
  role?: string
): ConnectionSpec {
  const spec: SnowflakeConnectionSpec = {
    account,
    username,
    password,
    database,
    schema,
    warehouse,
    role
  }
  return { snowflake: spec }
}

// ===== Target Spec Builders =====

// UI structure options can have string values like 'create' or boolean values
type UIStructureOptions = {
  tables?: string | boolean
  indexes?: string | boolean
  foreignKeys?: string | boolean
}

export function buildDatabaseTargetSpec(
  database: string,
  schema?: string,
  structureOptions?: UIStructureOptions
): TargetSpec {
  const spec: DatabaseTargetSpec = {
    database,
    schema,
    // Backend expects: tables, indexes, foreignKeys (not createTables, etc.)
    structureOptions: structureOptions
      ? {
          tables: structureOptions.tables === 'create' || structureOptions.tables === true,
          indexes: structureOptions.indexes === 'create' || structureOptions.indexes === true,
          foreignKeys:
            structureOptions.foreignKeys === 'create' || structureOptions.foreignKeys === true
        }
      : undefined
  }
  return { database: spec }
}

export function buildFileFormatSpec(
  fileFormat: string,
  compression?: string,
  parquetConfig?: ParquetConfig,
  csvConfig?: CSVConfig,
  useDuckDB: boolean = true
): FileFormatSpec | undefined {
  // Always return format spec to include useDuckDB setting
  // useDuckDB defaults to true, but false is also a valid explicit setting
  const hasFormatSettings = parquetConfig || csvConfig || compression

  if (!hasFormatSettings) {
    // No other settings - just return useDuckDB
    return { useDuckDB }
  }

  return {
    compression,
    parquet: parquetConfig,
    csv: csvConfig,
    useDuckDB
  }
}

export function buildFileTargetSpec(
  outputDirectory: string,
  fileFormat: string,
  compression?: string,
  parquetConfig?: ParquetConfig,
  csvConfig?: CSVConfig,
  useDuckDB: boolean = true
): TargetSpec {
  const spec: FileSpec = {
    outputDirectory,
    fileFormat,
    format: buildFileFormatSpec(fileFormat, compression, parquetConfig, csvConfig, useDuckDB)
  }
  return { files: spec }
}

/**
 * Build S3 target spec for stream configuration.
 * Note: Credentials (accessKey, secretKey, region) are NOT stored here -
 * they come from the Connection referenced by stream.target.id
 */
export function buildS3TargetSpec(
  outputDirectory: string,
  fileFormat: string,
  bucket: string,
  prefix?: string,
  storageClass?: string,
  keepLocalFiles?: boolean,
  compression?: string,
  parquetConfig?: ParquetConfig,
  csvConfig?: CSVConfig,
  serverSideEnc?: string,
  kmsKeyId?: string,
  useDuckDB: boolean = true
): TargetSpec {
  const spec: S3Spec = {
    outputDirectory,
    fileFormat,
    format: buildFileFormatSpec(fileFormat, compression, parquetConfig, csvConfig, useDuckDB),
    upload: {
      bucket,
      prefix,
      storageClass,
      keepLocalFiles,
      serverSideEnc,
      kmsKeyId
    }
  }
  return { s3: spec }
}

export function buildGCSTargetSpec(
  outputDirectory: string,
  fileFormat: string,
  bucket: string,
  prefix?: string,
  storageClass?: string,
  keepLocalFiles?: boolean,
  compression?: string,
  parquetConfig?: ParquetConfig,
  csvConfig?: CSVConfig,
  useDuckDB: boolean = true
): TargetSpec {
  const spec: GCSSpec = {
    outputDirectory,
    fileFormat,
    format: buildFileFormatSpec(fileFormat, compression, parquetConfig, csvConfig, useDuckDB),
    upload: {
      bucket,
      prefix,
      storageClass,
      keepLocalFiles
    }
  }
  return { gcs: spec }
}

export function buildAzureTargetSpec(
  outputDirectory: string,
  fileFormat: string,
  container: string,
  prefix?: string,
  keepLocalFiles?: boolean,
  compression?: string,
  parquetConfig?: ParquetConfig,
  csvConfig?: CSVConfig,
  useDuckDB: boolean = true
): TargetSpec {
  const spec: AzureBlobSpec = {
    outputDirectory,
    fileFormat,
    format: buildFileFormatSpec(fileFormat, compression, parquetConfig, csvConfig, useDuckDB),
    upload: {
      container,
      prefix,
      keepLocalFiles
    }
  }
  return { azure: spec }
}

export function buildSnowflakeTargetSpec(
  database: string,
  outputDirectory: string,
  fileFormat: string,
  schema?: string,
  structureOptions?: UIStructureOptions,
  compression?: string,
  parquetConfig?: ParquetConfig,
  csvConfig?: CSVConfig,
  filePrefix?: string,
  timestampFormat?: string,
  useDuckDB: boolean = true
): TargetSpec {
  const spec: SnowflakeTargetSpec = {
    database,
    schema,
    // Backend expects: tables, indexes, foreignKeys (not createTables, etc.)
    structureOptions: structureOptions
      ? {
          tables: structureOptions.tables === 'create' || structureOptions.tables === true,
          indexes: structureOptions.indexes === 'create' || structureOptions.indexes === true,
          foreignKeys:
            structureOptions.foreignKeys === 'create' || structureOptions.foreignKeys === true
        }
      : undefined,
    staging: {
      outputDirectory,
      fileFormat,
      format: buildFileFormatSpec(fileFormat, compression, parquetConfig, csvConfig, useDuckDB),
      config: {
        fileFormat,
        compressionType: compression,
        outputDirectory,
        filePrefix,
        timestampFormat
      }
    }
  }
  return { snowflake: spec }
}

// ===== Connection Spec Getters =====

/**
 * Safely get the host from a connection spec
 * For local file connections, uses spec.files.basePath
 */
export function getConnectionHost(connection: Connection | undefined): string {
  if (!connection?.spec) return ''

  if (connection.spec.database) {
    return connection.spec.database.host || ''
  }

  if (connection.spec.snowflake) {
    return connection.spec.snowflake.account || ''
  }

  if (connection.spec.s3) {
    return connection.spec.s3.endpoint || connection.spec.s3.region || ''
  }

  if (connection.spec.gcs) {
    return connection.spec.gcs.endpoint || connection.spec.gcs.region || ''
  }

  if (connection.spec.azure) {
    return connection.spec.azure.accountName || ''
  }

  // For local file connections, use spec.files.basePath
  if (connection.spec.files?.basePath) {
    return connection.spec.files.basePath
  }

  return ''
}

/**
 * Safely get the port from a connection spec
 */
export function getConnectionPort(connection: Connection | undefined): number {
  if (!connection?.spec) return 0

  if (connection.spec.database) {
    return connection.spec.database.port || 0
  }

  return 0
}

/**
 * Safely get the username from a connection spec
 */
export function getConnectionUsername(connection: Connection | undefined): string {
  if (!connection?.spec) return ''

  if (connection.spec.database) {
    return connection.spec.database.username || ''
  }

  if (connection.spec.snowflake) {
    return connection.spec.snowflake.username || ''
  }

  return ''
}

/**
 * Safely get the default database from a connection spec
 */
export function getConnectionDatabase(connection: Connection | undefined): string {
  if (!connection?.spec) return ''

  if (connection.spec.database) {
    return connection.spec.database.database || ''
  }

  if (connection.spec.snowflake) {
    return connection.spec.snowflake.database || ''
  }

  return ''
}

/**
 * Safely get the password from a connection spec
 */
export function getConnectionPassword(connection: Connection | undefined): string {
  if (!connection?.spec) return ''

  if (connection.spec.database) {
    return connection.spec.database.password || ''
  }

  if (connection.spec.snowflake) {
    return connection.spec.snowflake.password || ''
  }

  return ''
}
