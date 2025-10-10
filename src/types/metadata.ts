interface NullableString {
  String: string | null
  Valid: boolean
}

interface NullableNumber {
  Int64: number | null
  Valid: boolean
}

export interface SQLForeignKeyMeta {
  name: string // Name of the foreign key constraint
  sourceColumn: string // Column in the current table
  referencedTable: string // Referenced table name
  referencedColumn: string // Referenced column name
  onUpdate?: string // ON UPDATE behavior (CASCADE, SET NULL, etc.)
  onDelete?: string // ON DELETE behavior (CASCADE, SET NULL, etc.)
}

export interface SQLColumnMeta {
  name: string
  dataType: string
  isNullable: boolean
  defaultValue: NullableString
  isPrimaryKey: boolean
  isUnique: boolean
  length: NullableNumber
  precision: NullableNumber
  scale: NullableNumber
  comment: NullableString
  autoIncrement: boolean
}

export interface SQLIndexMeta {
  name: string
  columns: string[]
  isUnique: boolean
  isPrimary: boolean
  type: string // BTREE, HASH, GIN, etc.
}

export interface TableDDL {
  createTable: string
  createIndexes: string[]
}

export interface SQLTableMeta {
  name: string
  schema: string
  database: string
  columns: SQLColumnMeta[]
  primaryKeys: string[]
  foreignKeys: SQLForeignKeyMeta[]
  indexes: SQLIndexMeta[]
  ddl?: {
    createTable: string
    createIndexes?: string[]
  }
}

export interface SQLViewMeta {
  name: string
  schema: string
  database: string
  columns: SQLColumnMeta[]
  definition: string
  isMaterialized: boolean
  dependsOn: string[] | null
}

export interface DatabaseMetadata {
  tables: Record<string, SQLTableMeta>
  views: Record<string, SQLViewMeta>
  schemas?: string[]
}

export interface DatabaseSummary {
  database: string
  schemas?: string[]
  tables: string[]
  views: string[]
  stats: {
    tables: number
    views: number
    schemas?: number
  }
}
