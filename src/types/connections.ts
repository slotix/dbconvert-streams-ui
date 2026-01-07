import type { ConnectionSpec } from './specs'

export interface SSLConfig {
  mode: string
  ca?: string
  client_cert?: string
  client_key?: string
}

// File format types
export type FileFormat = 'csv' | 'json' | 'jsonl' | 'parquet'

// Storage provider types - used internally and can be inferred from spec
export type StorageProvider = 'local' | 's3' | 'gcs' | 'azure' | 'sftp' | 'ftp'

export interface Connection {
  id: string | ''
  name: string
  type: string
  databasesInfo: DatabaseInfo[]
  created?: number
  ssl?: SSLConfig
  cloud_provider?: string
  status?: string
  spec: ConnectionSpec
  // Legacy fields used by connection editing forms
  // These are mapped to/from spec fields during save/load
  host?: string
  port?: number
  username?: string
  password?: string
}

export interface Schema {
  name: string
  isSystem?: boolean
  systemReason?: string
}

export interface Database {
  name: string
  isSystem?: boolean
  systemReason?: string
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
  isSystem?: boolean
  systemReason?: string
  schemas?: SchemaInfo[]
}

export interface SchemaInfo {
  name: string
  isSystem?: boolean
  systemReason?: string
}
