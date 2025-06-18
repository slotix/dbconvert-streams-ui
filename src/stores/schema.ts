import { defineStore } from 'pinia'
import type { Table, Position, Relationship, ForeignKey } from '@/types/schema'
import connections from '@/api/connections'

export const useSchemaStore = defineStore('schema', {
  state: () => ({
    tables: [] as Table[],
    views: [] as Table[],
    relationships: [] as Relationship[],
    tablePositions: {} as Record<string, Position>,
    selectedTable: null as string | null,
    loading: false,
    error: null as string | null,
    connectionId: null as string | null,
    lastFetchTimestamp: null as number | null
  }),

  getters: {
    getTableById: (state) => (id: string) => {
      return state.tables.find((table) => table.name === id)
    },

    getTablePosition: (state) => (id: string) => {
      return state.tablePositions[id] || { x: 0, y: 0 }
    },

    getRelationshipsForTable: (state) => (tableId: string) => {
      return state.relationships.filter(
        (rel) => rel.sourceTable === tableId || rel.targetTable === tableId
      )
    }
  },

  actions: {
    setConnectionId(id: string) {
      if (this.connectionId !== id) {
        this.connectionId = id
        this.tables = []
        this.views = []
        this.relationships = []
        this.tablePositions = {}
        this.selectedTable = null
        this.lastFetchTimestamp = null
      }
    },

    async fetchSchema(forceRefresh = false) {
      if (!this.connectionId) {
        this.error = 'No connection ID provided'
        return
      }

      this.loading = true
      this.error = null

      try {
        const metadata = await connections.getMetadata(this.connectionId, forceRefresh)

        if (!metadata || typeof metadata !== 'object') {
          throw new Error('Invalid metadata response format')
        }

        // Convert metadata tables to tables array
        const tables: Table[] = Object.entries(metadata.tables)
          .filter(([_, value]) => value && typeof value === 'object')
          .map(([tableName, tableMeta]: [string, any]) => {
            // Process columns
            const columns =
              tableMeta.columns?.map((col: any) => {
                const isForeignKey =
                  tableMeta.foreignKeys?.some((fk: any) => fk.sourceColumn === col.name) || false

                // Format type with length/precision
                let formattedType = col.dataType
                if (col.length?.Valid && col.length.Int64 !== null) {
                  formattedType += `(${col.length.Int64})`
                } else if (col.precision?.Valid && col.precision.Int64 !== null) {
                  formattedType += `(${col.precision.Int64}${col.scale?.Valid ? `,${col.scale.Int64}` : ''})`
                }

                return {
                  name: col.name,
                  type: formattedType,
                  nullable: col.isNullable,
                  default: col.defaultValue?.string,
                  extra: col.extra,
                  isPrimaryKey: tableMeta.primaryKeys?.includes(col.name) || false,
                  isForeignKey
                }
              }) || []

            // Map foreign keys to our internal format
            const foreignKeys = (tableMeta.foreignKeys || []).map((fk: any) => ({
              name: fk.name,
              sourceColumn: fk.sourceColumn,
              referencedTable: fk.referencedTable,
              referencedColumn: fk.referencedColumn,
              onUpdate: fk.onUpdate,
              onDelete: fk.onDelete
            }))

            return {
              name: tableMeta.name,
              schema: tableMeta.schema,
              columns,
              primaryKeys: tableMeta.primaryKeys || [],
              foreignKeys
            }
          })

        // Convert metadata views to views array
        const views: Table[] = Object.entries(metadata.views || {})
          .filter(([_, value]) => value && typeof value === 'object')
          .map(([viewName, viewMeta]: [string, any]) => {
            // Process columns
            const columns =
              viewMeta.columns?.map((col: any) => ({
                name: col.name,
                type: col.dataType,
                nullable: col.isNullable,
                default: col.defaultValue?.string,
                extra: col.extra,
                isPrimaryKey: false,
                isForeignKey: false
              })) || []

            return {
              name: viewMeta.name,
              schema: viewMeta.schema,
              columns,
              primaryKeys: [],
              foreignKeys: []
            }
          })

        this.tables = tables
        this.views = views
        this.relationships = this.generateRelationships(tables)

        // Calculate initial positions if they don't exist
        if (Object.keys(this.tablePositions).length === 0) {
          this.calculateInitialPositions()
        }

        this.lastFetchTimestamp = Date.now()
      } catch (err) {
        console.error('Failed to fetch schema:', err)
        this.error = err instanceof Error ? err.message : 'Failed to fetch schema'
      } finally {
        this.loading = false
      }
    },

    generateRelationships(tables: Table[]): Relationship[] {
      const relationships: Relationship[] = []
      const processedRelationships = new Set<string>()

      tables.forEach((table) => {
        if (table.foreignKeys?.length) {
          table.foreignKeys.forEach((fk) => {
            // Skip if we don't have all the required information
            if (!fk.sourceColumn || !fk.referencedTable || !fk.referencedColumn) {
              return
            }

            // Create a unique ID for the relationship
            const id = `${table.name}.${fk.sourceColumn}->${fk.referencedTable}.${fk.referencedColumn}`

            // Skip if we've already processed this relationship
            if (processedRelationships.has(id)) {
              return
            }
            processedRelationships.add(id)

            // Only add if both tables exist
            const targetTable = tables.find((t) => t.name === fk.referencedTable)
            if (targetTable) {
              // Check if this is part of a many-to-many relationship
              const isJunctionTable =
                table.foreignKeys.length === 2 &&
                table.primaryKeys.length === 2 &&
                table.primaryKeys.every((pk) =>
                  table.foreignKeys.some((fk) => fk.sourceColumn === pk)
                )

              if (isJunctionTable) {
                // Find the other foreign key in the junction table
                const otherFk = table.foreignKeys.find((otherFk) => otherFk !== fk)
                if (otherFk) {
                  const otherTable = tables.find((t) => t.name === otherFk.referencedTable)
                  if (otherTable) {
                    // Add a many-to-many relationship between the two end tables
                    const m2mId = `${fk.referencedTable}.${fk.referencedColumn}<->${otherFk.referencedTable}.${otherFk.referencedColumn}`
                    if (!processedRelationships.has(m2mId)) {
                      relationships.push({
                        id: m2mId,
                        sourceTable: fk.referencedTable,
                        sourceColumn: fk.referencedColumn,
                        targetTable: otherFk.referencedTable,
                        targetColumn: otherFk.referencedColumn,
                        type: 'foreignKey',
                        label: `M:N via ${table.name}`
                      })
                      processedRelationships.add(m2mId)
                    }
                  }
                }
              }

              // Always add the direct relationship
              relationships.push({
                id,
                sourceTable: table.name,
                sourceColumn: fk.sourceColumn,
                targetTable: fk.referencedTable,
                targetColumn: fk.referencedColumn,
                type: 'foreignKey',
                label: `${fk.sourceColumn} → ${fk.referencedColumn}`
              })
            }
          })
        }

        // Special handling for film_text table
        if (table.name === 'film_text') {
          const filmTable = tables.find((t) => t.name === 'film')
          if (filmTable) {
            const id = `film_text.film_id->film.film_id`
            if (!processedRelationships.has(id)) {
              relationships.push({
                id,
                sourceTable: 'film_text',
                sourceColumn: 'film_id',
                targetTable: 'film',
                targetColumn: 'film_id',
                type: 'foreignKey',
                label: 'Full Text Search'
              })
              processedRelationships.add(id)
            }
          }
        }
      })

      return relationships
    },

    calculateInitialPositions() {
      const GRID_SIZE = 250
      const ROWS_PER_COLUMN = 5

      // Reset positions
      this.tablePositions = {}

      // Calculate positions for tables
      this.tables.forEach((table, index) => {
        const column = Math.floor(index / ROWS_PER_COLUMN)
        const row = index % ROWS_PER_COLUMN

        this.tablePositions[table.name] = {
          x: column * GRID_SIZE,
          y: row * GRID_SIZE
        }
      })

      // Calculate positions for views
      // Place views in a new column after the tables
      const tablesColumns = Math.ceil(this.tables.length / ROWS_PER_COLUMN)
      this.views.forEach((view, index) => {
        const row = index % ROWS_PER_COLUMN
        const column = tablesColumns + Math.floor(index / ROWS_PER_COLUMN)

        this.tablePositions[view.name] = {
          x: column * GRID_SIZE,
          y: row * GRID_SIZE
        }
      })
    },

    updateTablePosition(tableId: string, position: Position) {
      this.tablePositions[tableId] = position
    },

    setSelectedTable(tableId: string | null) {
      this.selectedTable = tableId
    }
  }
})
