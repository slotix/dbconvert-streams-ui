interface NullableString {
    String: string
    Valid: boolean
}

interface NullableNumber {
    Int64: number
    Valid: boolean
}

export interface SQLForeignKeyMeta {
    Name: string                    // Name of the foreign key constraint
    SourceColumn: string           // Column in the current table
    ReferencedTable: string        // Referenced table name
    ReferencedColumn: string       // Referenced column name
    OnUpdate?: string             // ON UPDATE behavior (CASCADE, SET NULL, etc.)
    OnDelete?: string             // ON DELETE behavior (CASCADE, SET NULL, etc.)
}

export interface SQLColumnMeta {
    Name: string
    DataType: string
    IsNullable: boolean
    DefaultValue: NullableString
    IsPrimaryKey: boolean
    IsUnique: boolean
    Length: NullableNumber
    Precision: NullableNumber
    Scale: NullableNumber
    Comment: NullableString
    AutoIncrement: boolean
}

export interface SQLIndexMeta {
    Name: string
    Type: string
    Columns: string[]
    IsUnique: boolean
    IsPrimary: boolean
}

export interface TableDDL {
    createTable: string
    createIndexes: string[]
}

export interface SQLTableMeta {
    Name: string
    Schema: string
    Database: string
    Type: string
    Columns: SQLColumnMeta[]
    Indexes: SQLIndexMeta[]
    PrimaryKeys: string[]
    ForeignKeys: SQLForeignKeyMeta[]  // Add foreign keys at the table level
    AutoIncrement: string
    DDL: TableDDL
}

export interface SQLViewMeta {
    name: string
    schema: string
    database: string
    columns: SQLColumnMeta[]
    definition: string
    isMaterialized: boolean
    dependsOn: string[] | null
    ddl: string
}

export function isSQLViewMeta(obj: SQLTableMeta | SQLViewMeta): obj is SQLViewMeta {
    return 'definition' in obj && typeof obj.definition === 'string'
}

export interface DatabaseMetadata {
    tables: Record<string, SQLTableMeta>
    views: Record<string, SQLViewMeta>
} 