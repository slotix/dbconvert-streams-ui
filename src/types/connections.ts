export interface Connection {
  id: string;
  type: string;
  ssh?: any;
  ssl?: any;
  created?: string;
  [key: string]: any;
}
export interface Schema {
  // Define the properties of a schema object
}

export interface Database {
  // Define the properties of a database object
}

export interface DbType {
  id: number;
  type: string;
  logo: string;
}
