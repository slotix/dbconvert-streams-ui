import type { ConnectionSpec } from './specs'

export interface SSLConfig {
  mode: string
  ca?: string
  client_cert?: string
  client_key?: string
}

// File format types
export type FileFormat = 'csv' | 'json' | 'jsonl' | 'parquet'

// Storage provider types
export type StorageProvider = 'local' | 's3' | 'gcs' | 'azure' | 'sftp' | 'ftp'

// Storage credentials for cloud providers
export interface StorageCredentials {
  aws_access_key?: string
  aws_secret_key?: string
  aws_session_token?: string
  gcp_service_account_json?: string
  azure_account_name?: string
  azure_account_key?: string
  azure_sas_token?: string
}

// Storage configuration for file/cloud connections
export interface StorageConfig {
  provider: StorageProvider
  uri: string // e.g., "s3://bucket-name/prefix/"
  region?: string
  endpoint?: string
  credentials_ref?: string
  credentials?: StorageCredentials
  options?: Record<string, string>
}

export interface Connection {
  id: string | ''
  name: string
  type: string
  databasesInfo: DatabaseInfo[]
  created?: number
  ssl?: SSLConfig
  cloud_provider?: string
  status?: string
  storage_config?: StorageConfig
  // Matryoshka spec pattern (REQUIRED)
  spec: ConnectionSpec
}

export interface Schema {
  name: string
}

export interface Database {
  name: string
}

export interface DbType {
  id: number
  type: string
  logo: string
  category?: 'all' | 'database' | 'file'
  description?: string
}

export interface DatabaseInfo {
  name: string
  schemas?: string[]
}

export interface SchemaFilter {
  connectionId: string
  activeSchemas: string[]
  allSchemas: string[]
}

export interface MultiSchemaTable {
  schema: string
  table: string
  fullName: string
}

export interface StreamConfig {
  name: string
  source: string
  target: string
  mode: string
  dataBundleSize?: number
  tables: MultiSchemaTable[]
  sourceSchemaFilter?: string[]
  targetSchemaFilter?: string[]
}
