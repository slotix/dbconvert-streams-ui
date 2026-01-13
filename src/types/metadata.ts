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
  referencedSchema?: string // Referenced schema (PostgreSQL)
  referencedTable: string // Referenced table name
  referencedColumn: string // Referenced column name
  onUpdate?: string // ON UPDATE behavior (CASCADE, SET NULL, etc.)
  onDelete?: string // ON DELETE behavior (CASCADE, SET NULL, etc.)
}

export interface SQLCheckConstraintMeta {
  name: string // Name of the CHECK constraint
  clause: string // The CHECK constraint expression/clause
}

export interface SQLPartitionMeta {
  name: string // Partition name (e.g., stream_sessions_y2025m01)
  schema: string // Schema name
  strategy: string // RANGE, LIST, HASH
  expression: string // Partition key expression
  values: string // Partition bounds/values
  sizeBytes: number // Partition size
  approxRows: number // Approximate row count
  isDefault: boolean // Is this the default partition?
}

export interface SQLColumnMeta {
  name: string
  dataType: string
  // Engine-specific fidelity hints (optional)
  columnType?: string // MySQL raw type string (e.g., "tinyint(1) unsigned", "enum('a','b')")
  characterSet?: string // MySQL character set
  collation?: string // MySQL collation
  udtName?: string // PostgreSQL underlying type name (information_schema.udt_name)
  enumValues?: string[] // PostgreSQL enum labels (when discoverable)
  domainBaseType?: string // PostgreSQL domain base type (when discoverable)
  isUnsigned?: boolean // MySQL unsigned numeric flag (derived from columnType)
  isNullable: boolean
  defaultValue: NullableString
  isPrimaryKey: boolean
  isUnique: boolean
  length: NullableNumber
  precision: NullableNumber
  scale: NullableNumber
  comment: NullableString
  autoIncrement: boolean
  checkConstraints?: SQLCheckConstraintMeta[]
}

export interface SQLIndexMeta {
  name: string
  columns: string[]
  isUnique: boolean
  isPrimary: boolean
  type: string // BTREE, HASH, GIN, etc.
  isFullTextIndex?: boolean
}

export interface SQLTableMeta {
  name: string
  schema: string
  database: string
  columns: SQLColumnMeta[]
  primaryKeys: string[]
  foreignKeys: SQLForeignKeyMeta[]
  indexes: SQLIndexMeta[]

  // Size estimates (when provided by backend discovery)
  estimatedRows?: number
  estimatedSizeBytes?: number

  // Safe-by-default editability hints from backend metadata
  isEditable?: boolean
  editKeyColumns?: string[]
  editKeyType?: string
  editabilityReason?: string
  ddl?: {
    createTable: string
    createIndexes?: string[]
  }
  partitions?: SQLPartitionMeta[] // Child partitions (if table is partitioned)
  isPartitioned?: boolean // Is this a partitioned table?
  partitionStrategy?: string // RANGE, LIST, HASH (if partitioned)
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

export interface SQLTriggerMeta {
  name: string
  schema: string
  database: string
  tableName: string
  event?: string
  timing?: string
  definition?: string
}

export interface SQLRoutineMeta {
  name: string
  schema: string
  database: string
  routineType: 'function' | 'procedure'
  signature?: string
  returnType?: string
  language?: string
  definition?: string
}

export interface SQLSequenceMeta {
  name: string
  schema: string
  database: string
  startValue: number
  increment: number
  minValue: number
  maxValue: number
  cacheSize: number
  isCycled: boolean
  lastValue?: number | null
  ownerTable?: string
  ownerColumn?: string
}

export interface DatabaseMetadata {
  tables: Record<string, SQLTableMeta>
  views: Record<string, SQLViewMeta>
  triggers?: Record<string, SQLTriggerMeta>
  functions?: Record<string, SQLRoutineMeta>
  procedures?: Record<string, SQLRoutineMeta>
  sequences?: Record<string, SQLSequenceMeta>
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
