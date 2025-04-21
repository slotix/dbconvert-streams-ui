interface NullableString {
    String: string
    Valid: boolean
}

interface NullableNumber {
    Int64: number
    Valid: boolean
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
    AutoIncrement: string
    DDL: TableDDL
}

export type DatabaseMetadata = Record<string, SQLTableMeta> 