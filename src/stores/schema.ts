import { defineStore } from 'pinia'
import type { Table, Position, Relationship, ForeignKey } from '@/types/schema'
import connections from '@/api/connections'

export const useSchemaStore = defineStore('schema', {
    state: () => ({
        tables: [] as Table[],
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
            return state.tables.find(table => table.name === id)
        },

        getTablePosition: (state) => (id: string) => {
            return state.tablePositions[id] || { x: 0, y: 0 }
        },

        getRelationshipsForTable: (state) => (tableId: string) => {
            return state.relationships.filter(rel =>
                rel.sourceTable === tableId || rel.targetTable === tableId
            )
        }
    },

    actions: {
        setConnectionId(id: string) {
            if (this.connectionId !== id) {
                this.connectionId = id
                this.tables = []
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

            // If we have data and it's less than 30 seconds old, return cached data
            const now = Date.now()
            if (!forceRefresh && this.lastFetchTimestamp && this.tables.length > 0 && now - this.lastFetchTimestamp < 30000) {
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
                        const columns = tableMeta.Columns.map((col: any) => {
                            const isForeignKey = tableMeta.foreignKeys?.some(
                                (fk: any) => fk.sourceColumn === col.Name
                            ) || false

                            // Format type with length/precision
                            let formattedType = col.DataType
                            if (col.Length?.Valid) {
                                formattedType += `(${col.Length.Int64})`
                            } else if (col.Precision?.Valid) {
                                formattedType += `(${col.Precision.Int64}${col.Scale?.Valid ? `,${col.Scale.Int64}` : ''})`
                            }

                            return {
                                name: col.Name,
                                type: formattedType,
                                nullable: col.IsNullable,
                                default: col.DefaultValue?.String,
                                extra: col.Extra,
                                isPrimaryKey: tableMeta.PrimaryKeys?.includes(col.Name) || false,
                                isForeignKey
                            }
                        })

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
                            name: tableMeta.Name,
                            schema: tableMeta.Schema,
                            columns,
                            primaryKeys: tableMeta.PrimaryKeys || [],
                            foreignKeys
                        }
                    })

                this.tables = tables
                this.relationships = this.generateRelationships(tables)

                // Calculate initial positions if they don't exist
                if (Object.keys(this.tablePositions).length === 0) {
                    this.calculateInitialPositions()
                }

                this.lastFetchTimestamp = now
            } catch (err) {
                this.error = err instanceof Error ? err.message : 'Failed to fetch schema'
            } finally {
                this.loading = false
            }
        },

        generateRelationships(tables: Table[]): Relationship[] {
            const relationships: Relationship[] = []
            const processedRelationships = new Set<string>()

            tables.forEach(table => {
                if (table.foreignKeys?.length) {
                    table.foreignKeys.forEach(fk => {
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
                        const targetTable = tables.find(t => t.name === fk.referencedTable)
                        if (targetTable) {
                            // Check if this is part of a many-to-many relationship
                            const isJunctionTable = table.foreignKeys.length === 2 &&
                                table.primaryKeys.length === 2 &&
                                table.primaryKeys.every(pk =>
                                    table.foreignKeys.some(fk => fk.sourceColumn === pk)
                                )

                            if (isJunctionTable) {
                                // Find the other foreign key in the junction table
                                const otherFk = table.foreignKeys.find(otherFk => otherFk !== fk)
                                if (otherFk) {
                                    const otherTable = tables.find(t => t.name === otherFk.referencedTable)
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
                    const filmTable = tables.find(t => t.name === 'film')
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
            const GRID_SIZE = 250 // Reduced spacing between tables
            const COLUMNS = Math.ceil(Math.sqrt(this.tables.length))

            // Create a map of table relationships for better positioning
            const tableConnections = new Map<string, Set<string>>()
            this.relationships.forEach(rel => {
                if (!tableConnections.has(rel.sourceTable)) {
                    tableConnections.set(rel.sourceTable, new Set())
                }
                if (!tableConnections.has(rel.targetTable)) {
                    tableConnections.set(rel.targetTable, new Set())
                }
                tableConnections.get(rel.sourceTable)?.add(rel.targetTable)
                tableConnections.get(rel.targetTable)?.add(rel.sourceTable)
            })

            const sortedTables = [...this.tables].sort((a, b) => {
                const aConnections = tableConnections.get(a.name)?.size || 0
                const bConnections = tableConnections.get(b.name)?.size || 0
                return bConnections - aConnections
            })

            // Position tables in a more organized way
            sortedTables.forEach((table, index) => {
                const row = Math.floor(index / COLUMNS)
                const col = index % COLUMNS

                // Add slight offset based on connections to create visual clusters
                const connectedTables = tableConnections.get(table.name) || new Set()
                const connectedPositions = Array.from(connectedTables)
                    .map(tableName => this.tablePositions[tableName])
                    .filter(pos => pos)

                if (connectedPositions.length > 0) {
                    // Calculate average position of connected tables
                    const avgX = connectedPositions.reduce((sum, pos) => sum + pos.x, 0) / connectedPositions.length
                    const avgY = connectedPositions.reduce((sum, pos) => sum + pos.y, 0) / connectedPositions.length

                    // Move slightly towards connected tables
                    this.tablePositions[table.name] = {
                        x: col * GRID_SIZE + 50 + (avgX ? (avgX - col * GRID_SIZE) * 0.2 : 0),
                        y: row * GRID_SIZE + 50 + (avgY ? (avgY - row * GRID_SIZE) * 0.2 : 0)
                    }
                } else {
                    this.tablePositions[table.name] = {
                        x: col * GRID_SIZE + 50,
                        y: row * GRID_SIZE + 50
                    }
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