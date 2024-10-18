export interface Connection {
  id: string | ''
  name: string
  type: string
  host: string
  port: number
  username: string
  password: string
  databases: string[]
  database: string
  created?: number
}

export interface Schema {}

export interface Database {}

export interface DbType {
  id: number
  type: string
  logo: string
}
