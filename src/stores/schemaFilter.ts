import { defineStore } from 'pinia'
import { type SchemaFilter } from '@/types/connections'
import connectionsApi from '@/api/connections'

interface State {
  // Schema filters by connection ID
  schemaFilters: Record<string, SchemaFilter>
  isLoading: boolean
}

export const useSchemaFilterStore = defineStore('schemaFilter', {
  state: (): State => ({
    schemaFilters: {},
    isLoading: false
  }),

  getters: {
    getSchemaFilter: (state) => (connectionId: string): SchemaFilter | null => {
      return state.schemaFilters[connectionId] || null
    },

    getActiveSchemas: (state) => (connectionId: string): string[] => {
      const filter = state.schemaFilters[connectionId]
      return filter?.activeSchemas || []
    },

    getAllSchemas: (state) => (connectionId: string): string[] => {
      const filter = state.schemaFilters[connectionId]
      return filter?.allSchemas || []
    },

    isSchemaFilterActive: (state) => (connectionId: string): boolean => {
      const filter = state.schemaFilters[connectionId]
      if (!filter) return false
      return filter.activeSchemas.length < filter.allSchemas.length
    },

    getSchemaFilterSummary: (state) => (connectionId: string) => {
      const filter = state.schemaFilters[connectionId]
      if (!filter) return null
      
      return {
        active: filter.activeSchemas.length,
        total: filter.allSchemas.length,
        isFiltered: filter.activeSchemas.length < filter.allSchemas.length
      }
    }
  },

  actions: {
    async loadSchemaFilter(connectionId: string): Promise<SchemaFilter> {
      this.isLoading = true
      try {
        const result = await connectionsApi.getActiveSchemas(connectionId)
        
        const schemaFilter: SchemaFilter = {
          connectionId,
          activeSchemas: result.activeSchemas,
          allSchemas: result.allSchemas
        }
        
        this.schemaFilters[connectionId] = schemaFilter
        return schemaFilter
      } catch (error) {
        console.error('[SchemaFilter] Failed to load schema filter:', error)
        throw error
      } finally {
        this.isLoading = false
      }
    },

    async updateSchemaFilter(connectionId: string, activeSchemas: string[]): Promise<void> {
      try {
        await connectionsApi.setActiveSchemas(connectionId, activeSchemas)
        
        // Update local state
        if (this.schemaFilters[connectionId]) {
          this.schemaFilters[connectionId].activeSchemas = activeSchemas
        }
      } catch (error) {
        console.error('[SchemaFilter] Failed to update schema filter:', error)
        throw error
      }
    },

    // Initialize schema filter with all schemas (no filtering)
    initializeSchemaFilter(connectionId: string, allSchemas: string[]): void {
      this.schemaFilters[connectionId] = {
        connectionId,
        activeSchemas: allSchemas,
        allSchemas
      }
    },

    // Reset schema filter to show all schemas
    resetSchemaFilter(connectionId: string): void {
      const filter = this.schemaFilters[connectionId]
      if (filter) {
        filter.activeSchemas = [...filter.allSchemas]
      }
    },

    // Apply default filtering (exclude system schemas)
    applyDefaultFilter(connectionId: string, systemSchemas: string[] = []): void {
      const filter = this.schemaFilters[connectionId]
      if (filter) {
        filter.activeSchemas = filter.allSchemas.filter(
          schema => !systemSchemas.includes(schema)
        )
      }
    },

    // Clear schema filter for a connection
    clearSchemaFilter(connectionId: string): void {
      delete this.schemaFilters[connectionId]
    },

    // Clear all schema filters
    clearAllSchemaFilters(): void {
      this.schemaFilters = {}
    }
  }
}) 