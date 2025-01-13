export interface SSLConfig {
  mode: 'disabled' | 'require' | 'verify-ca' | 'verify-full'
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
  schema: string
  created?: number
  ssl?: SSLConfig
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
