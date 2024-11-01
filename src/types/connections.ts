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

export interface Schema {
  name: string;
}

export interface Database {
  name: string;
}

export interface DbType {
  id: number
  type: string
  logo: string
}
