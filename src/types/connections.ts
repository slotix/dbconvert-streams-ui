export interface SSLConfig {
  mode: string
  ca?: string
  client_cert?: string
  client_key?: string
}

export interface Connection {
  id: string | ''
  name: string
  type: string
  host: string
  port: number
  username: string
  password: string
  databasesInfo: DatabaseInfo[]
  database: string
  created?: number
  ssl?: SSLConfig
  // Cloud provider detection - empty string means not a cloud provider
  cloud_provider?: string
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
  operations: string[]
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
