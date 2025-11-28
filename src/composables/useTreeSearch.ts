import { computed } from 'vue'
import { useExplorerNavigationStore } from '@/stores/explorerNavigation'
import { useConnectionTreeLogic } from '@/composables/useConnectionTreeLogic'
import type { Connection } from '@/types/connections'
import type { FileSystemEntry } from '@/api/fileSystem'
import { getConnectionHost } from '@/utils/specBuilder'

export interface UseTreeSearchOptions {
  typeFilters?: string[]
}

/**
 * Reusable composable for tree search functionality
 * Provides normalized search, connection filtering, and file filtering
 */
export function useTreeSearch(searchQuery: string, options: UseTreeSearchOptions = {}) {
  const navigationStore = useExplorerNavigationStore()
  const treeLogic = useConnectionTreeLogic()

  /**
   * Normalize text for case-insensitive search
   */
  const normalize = (text: string): string => text.toLowerCase()

  /**
   * Check if a string matches the search query
   */
  const matchesQuery = (text: string, query: string): boolean => {
    if (!query.trim()) return true
    return normalize(text).includes(normalize(query.trim()))
  }

  /**
   * Check if any text in an array matches the search query
   */
  const matchesAnyQuery = (texts: string[], query: string): boolean => {
    if (!query.trim()) return true
    const normalizedQuery = normalize(query.trim())
    return texts.some((text) => normalize(text).includes(normalizedQuery))
  }

  /**
   * Filter connections based on search query and type filter
   * Searches connection names, hosts, types, databases, schemas, tables, and views
   */
  const filterConnections = (connections: Connection[]): Connection[] => {
    const query = searchQuery.trim()

    // Apply type filters first
    let filtered = connections
    if (options.typeFilters && options.typeFilters.length > 0) {
      filtered = connections.filter((conn) =>
        treeLogic.matchesTypeFilters(conn, options.typeFilters!)
      )
    }

    // Sort by creation date (newest first) then by name
    filtered = filtered.sort((a, b) => {
      const ac = Number(a.created || 0)
      const bc = Number(b.created || 0)
      if (bc !== ac) return bc - ac
      return (a.name || '').localeCompare(b.name || '')
    })

    // If no search query, return sorted connections
    if (!query) return filtered

    const normalizedQuery = normalize(query)

    return filtered.filter((connection) => {
      // Search in connection basic info
      const host = getConnectionHost(connection)
      const connectionLabel = `${connection.name || ''} ${host || ''} ${connection.type || ''}`
      if (normalize(connectionLabel).includes(normalizedQuery)) return true

      // Search in database names (use filtered getter to respect showSystemObjects)
      const databases = navigationStore.getDatabases(connection.id) || []
      if (databases.some((db) => normalize(db.name).includes(normalizedQuery))) return true

      // Search in metadata (tables and views)
      const metadataByDatabase = navigationStore.metadataState[connection.id] || {}
      for (const databaseName in metadataByDatabase) {
        const metadata = metadataByDatabase[databaseName]

        // Search in tables
        const hasTableMatch = Object.values(metadata.tables || {}).some(
          (table) =>
            normalize(table.name).includes(normalizedQuery) ||
            (table.schema && normalize(table.schema).includes(normalizedQuery))
        )
        if (hasTableMatch) return true

        // Search in views
        const hasViewMatch = Object.values(metadata.views || {}).some(
          (view) =>
            normalize(view.name).includes(normalizedQuery) ||
            (view.schema && normalize(view.schema).includes(normalizedQuery))
        )
        if (hasViewMatch) return true
      }

      return false
    })
  }

  /**
   * Filter file entries based on search query
   * Includes both files and directories for nested folder browsing
   */
  const filterFileEntries = (entries: FileSystemEntry[]): FileSystemEntry[] => {
    const query = searchQuery.trim()

    // Include both files and directories, filter by name if query exists
    return entries.filter((item) => !query || matchesQuery(item.name, query))
  }

  /**
   * Check if a database matches the search query
   * Searches database name, table names, view names, and schema names
   */
  const matchesDatabaseFilter = (connectionId: string, databaseName: string): boolean => {
    const query = searchQuery.trim()
    if (!query) return true

    const normalizedQuery = normalize(query)

    // Check database name
    if (normalize(databaseName).includes(normalizedQuery)) return true

    // Check metadata
    const metadata = navigationStore.metadataState[connectionId]?.[databaseName]
    if (!metadata) return false

    // Check tables
    const hasTableMatch = Object.values(metadata.tables || {}).some(
      (table) =>
        normalize(table.name).includes(normalizedQuery) ||
        (table.schema && normalize(table.schema).includes(normalizedQuery))
    )
    if (hasTableMatch) return true

    // Check views
    const hasViewMatch = Object.values(metadata.views || {}).some(
      (view) =>
        normalize(view.name).includes(normalizedQuery) ||
        (view.schema && normalize(view.schema).includes(normalizedQuery))
    )

    return hasViewMatch
  }

  /**
   * Generate highlighted parts for text matching
   * This can be used with existing highlight utilities
   */
  const getHighlightParts = (text: string) => {
    // This returns the raw text and query for use with existing highlight functions
    return { text, query: searchQuery }
  }

  return {
    // Core functions
    normalize,
    matchesQuery,
    matchesAnyQuery,

    // Filtering functions
    filterConnections,
    filterFileEntries,
    matchesDatabaseFilter,

    // Utility functions
    getHighlightParts,

    // Computed properties
    hasQuery: computed(() => searchQuery.trim().length > 0),
    normalizedQuery: computed(() => normalize(searchQuery.trim()))
  }
}
