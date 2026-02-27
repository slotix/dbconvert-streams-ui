// Utility functions for building ConnectionSpec and TargetSpec from UI forms
import type {
  ConnectionSpec,
  DatabaseConnectionSpec,
  S3ConnectionSpec,
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
  UIStructureOptions,
  SchemaPolicy,
  WriteMode
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

// ===== Target Spec Builders =====

export function buildDatabaseTargetSpec(
  database: string,
  schema?: string,
  structureOptions?: UIStructureOptions,
  schemaPolicy?: SchemaPolicy,
  writeMode?: WriteMode,
  skipData?: boolean
): TargetSpec {
  const spec: DatabaseTargetSpec = {
    database,
    schema,
    structureOptions, // Already in correct format
    schemaPolicy,
    writeMode,
    skipData
  }
  return { db: spec }
}

export function buildFileFormatSpec(
  fileFormat: string,
  compression?: string,
  parquetConfig?: ParquetConfig,
  csvConfig?: CSVConfig
): FileFormatSpec | undefined {
  const hasFormatSettings = parquetConfig || csvConfig || compression

  if (!hasFormatSettings) {
    return undefined
  }

  return {
    compression,
    parquet: parquetConfig,
    csv: csvConfig
  }
}

export function buildFileTargetSpec(
  fileFormat: string,
  compression?: string,
  parquetConfig?: ParquetConfig,
  csvConfig?: CSVConfig
): TargetSpec {
  const spec: FileSpec = {
    fileFormat,
    format: buildFileFormatSpec(fileFormat, compression, parquetConfig, csvConfig)
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
  kmsKeyId?: string
): TargetSpec {
  const spec: S3Spec = {
    outputDirectory,
    fileFormat,
    format: buildFileFormatSpec(fileFormat, compression, parquetConfig, csvConfig),
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
  csvConfig?: CSVConfig
): TargetSpec {
  const spec: GCSSpec = {
    outputDirectory,
    fileFormat,
    format: buildFileFormatSpec(fileFormat, compression, parquetConfig, csvConfig),
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
  csvConfig?: CSVConfig
): TargetSpec {
  const spec: AzureBlobSpec = {
    outputDirectory,
    fileFormat,
    format: buildFileFormatSpec(fileFormat, compression, parquetConfig, csvConfig),
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
  schemaPolicy?: SchemaPolicy,
  writeMode?: WriteMode,
  compression?: string,
  parquetConfig?: ParquetConfig,
  csvConfig?: CSVConfig,
  filePrefix?: string,
  timestampFormat?: string,
  skipData?: boolean
): TargetSpec {
  const spec: SnowflakeTargetSpec = {
    database,
    schema,
    structureOptions, // Already in correct format
    schemaPolicy,
    writeMode,
    skipData,
    staging: {
      outputDirectory,
      fileFormat,
      format: buildFileFormatSpec(fileFormat, compression, parquetConfig, csvConfig),
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
