export interface SchemaContext {
  tables: Array<{ name: string; schema?: string }>
  columns: Record<string, Array<{ name: string; type: string; nullable: boolean }>>
  dialect: 'mysql' | 'pgsql' | 'sql'
}
