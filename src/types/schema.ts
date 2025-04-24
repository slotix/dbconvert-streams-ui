export interface Column {
    name: string
    type: string
    nullable: boolean
    default?: string
    extra?: string
    isPrimaryKey?: boolean
    isForeignKey?: boolean
}

export interface ForeignKey {
    column: string
    referencedTable: string
    referencedColumn: string
}

export interface Table {
    name: string
    schema: string
    columns: Column[]
    primaryKeys: string[]
    foreignKeys: ForeignKey[]
}

export interface Position {
    x: number
    y: number
}

export interface TablePosition {
    id: string
    position: Position
}

export interface Relationship {
    id: string
    sourceTable: string
    sourceColumn: string
    targetTable: string
    targetColumn: string
    type?: 'foreignKey' | 'reference'
    label?: string
} 