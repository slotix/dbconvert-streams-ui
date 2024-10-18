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
  // Define the properties of a schema object
}

export interface Database {
  // Define the properties of a database object
}

export interface DbType {
  id: number
  type: string
  logo: string
}
