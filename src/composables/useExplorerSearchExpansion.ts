import { ref, watch, type ComputedRef, type Ref } from 'vue'
import { useDebounceFn } from '@vueuse/core'

type RefLike<T> = Ref<T> | ComputedRef<T>

interface ExplorerSearchConnection {
  id: string
}

interface ExplorerSearchMetadataEntry {
  name?: string
  schema?: string
  signature?: string
}

interface ExplorerSearchMetadata {
  tables?: Record<string, ExplorerSearchMetadataEntry>
  views?: Record<string, ExplorerSearchMetadataEntry>
  functions?: Record<string, ExplorerSearchMetadataEntry>
  procedures?: Record<string, ExplorerSearchMetadataEntry>
  schemas?: unknown
}

interface ExplorerSearchDatabaseStateEntry {
  name: string
}

interface ExplorerSearchNavigationStore {
  databasesState: Record<string, ExplorerSearchDatabaseStateEntry[] | undefined>
  collapseAllExpansions: () => void
  isConnectionExpanded: (connectionId: string) => boolean
  expandConnection: (connectionId: string) => void
  ensureDatabases: (connectionId: string) => Promise<unknown>
  isMetadataLoading: (connectionId: string, database: string) => boolean
  getMetadata: (connectionId: string, database: string) => ExplorerSearchMetadata | null
  ensureMetadata: (connectionId: string, database: string) => Promise<unknown>
  expandDatabase: (databaseKey: string) => void
  expandSchema: (schemaKey: string) => void
}

interface ExplorerSearchFileStore {
  collapseAllFolders: () => void
}

interface UseExplorerSearchExpansionOptions<TConnection extends ExplorerSearchConnection> {
  searchQuery: RefLike<string>
  effectiveSearchQuery: RefLike<string>
  typeFilters: RefLike<string[] | undefined>
  minSearchLength: number
  connections: RefLike<TConnection[]>
  matchesTypeFilters: (connection: TConnection, filters: string[]) => boolean
  isFileConnection: (connectionId: string) => boolean
  hasSchemas: (connectionId: string) => boolean
  requestFileEntries: (connectionId: string) => void
  matchesDatabaseFilter: (connectionId: string, database: string) => boolean
  navigationStore: ExplorerSearchNavigationStore
  fileExplorerStore: ExplorerSearchFileStore
}

function collectMatchingSchemas(meta: ExplorerSearchMetadata, query: string): Set<string> {
  const schemasToExpand = new Set<string>()

  for (const table of Object.values(meta.tables || {})) {
    if (
      (table.name || '').toLowerCase().includes(query) ||
      (table.schema || '').toLowerCase().includes(query)
    ) {
      if (table.schema) schemasToExpand.add(table.schema)
    }
  }

  for (const view of Object.values(meta.views || {})) {
    if (
      (view.name || '').toLowerCase().includes(query) ||
      (view.schema || '').toLowerCase().includes(query)
    ) {
      if (view.schema) schemasToExpand.add(view.schema)
    }
  }

  for (const fn of Object.values(meta.functions || {})) {
    const signature = fn.signature ? `(${fn.signature})` : ''
    const label = `${fn.name || ''}${signature}`.toLowerCase()
    if (label.includes(query) || (fn.schema || '').toLowerCase().includes(query)) {
      if (fn.schema) schemasToExpand.add(fn.schema)
    }
  }

  for (const proc of Object.values(meta.procedures || {})) {
    const signature = proc.signature ? `(${proc.signature})` : ''
    const label = `${proc.name || ''}${signature}`.toLowerCase()
    if (label.includes(query) || (proc.schema || '').toLowerCase().includes(query)) {
      if (proc.schema) schemasToExpand.add(proc.schema)
    }
  }

  const schemasUnknown = meta.schemas
  if (Array.isArray(schemasUnknown)) {
    for (const schema of schemasUnknown) {
      if (typeof schema === 'string' && schema.toLowerCase().includes(query)) {
        schemasToExpand.add(schema)
      }
    }
  }

  return schemasToExpand
}

export function useExplorerSearchExpansion<TConnection extends ExplorerSearchConnection>(
  options: UseExplorerSearchExpansionOptions<TConnection>
) {
  const isSearchExpanding = ref(false)
  const searchRunId = ref(0)
  let previousTypeFilters: string[] = []

  function shouldExpandSearch(query: string): boolean {
    return query.trim().length >= options.minSearchLength
  }

  async function expandForSearch(query: string, runId: number) {
    const trimmed = query.trim()
    if (!trimmed) {
      if (runId === searchRunId.value) {
        isSearchExpanding.value = false
      }
      return
    }

    // Yield to avoid blocking ongoing UI interactions.
    await Promise.resolve()
    if (runId !== searchRunId.value) return

    options.navigationStore.collapseAllExpansions()
    options.fileExplorerStore.collapseAllFolders()

    const filters = options.typeFilters.value
    const candidates =
      filters && filters.length > 0
        ? options.connections.value.filter((connection) =>
            options.matchesTypeFilters(connection, filters)
          )
        : options.connections.value

    for (const connection of candidates) {
      if (runId !== searchRunId.value) return

      if (!options.navigationStore.isConnectionExpanded(connection.id)) {
        options.navigationStore.expandConnection(connection.id)
      }

      if (options.isFileConnection(connection.id)) {
        options.requestFileEntries(connection.id)
        continue
      }

      await options.navigationStore.ensureDatabases(connection.id)
      if (runId !== searchRunId.value) return

      const databases = options.navigationStore.databasesState[connection.id] || []
      for (const database of databases) {
        if (runId !== searchRunId.value) return

        if (
          !options.navigationStore.isMetadataLoading(connection.id, database.name) &&
          !options.navigationStore.getMetadata(connection.id, database.name)
        ) {
          try {
            await options.navigationStore.ensureMetadata(connection.id, database.name)
          } catch {
            // Best-effort metadata warmup for search.
          }
        }

        if (runId !== searchRunId.value) return
        if (!options.matchesDatabaseFilter(connection.id, database.name)) continue

        options.navigationStore.expandDatabase(`${connection.id}:${database.name}`)

        if (runId !== searchRunId.value) return
        if (!options.hasSchemas(connection.id)) continue

        const meta = options.navigationStore.getMetadata(connection.id, database.name)
        const q = options.effectiveSearchQuery.value.trim().toLowerCase()
        if (!meta || !q) continue

        const schemasToExpand = collectMatchingSchemas(meta, q)
        for (const schema of schemasToExpand) {
          if (runId !== searchRunId.value) return
          options.navigationStore.expandSchema(`${connection.id}:${database.name}:${schema}`)
        }
      }
    }

    if (runId === searchRunId.value) {
      isSearchExpanding.value = false
    }
  }

  const debouncedExpandForSearch = useDebounceFn((query: string) => {
    const runId = ++searchRunId.value
    if (!shouldExpandSearch(query)) {
      isSearchExpanding.value = false
      return
    }

    isSearchExpanding.value = true
    void expandForSearch(query, runId)
  }, 250)

  watch(
    () => options.searchQuery.value,
    (query) => {
      if (shouldExpandSearch(query)) {
        debouncedExpandForSearch(query)
      } else {
        searchRunId.value += 1
        isSearchExpanding.value = false
      }
    }
  )

  watch(
    () => options.typeFilters.value,
    (filters) => {
      const normalized = filters ? [...filters].sort() : []
      if (JSON.stringify(normalized) === JSON.stringify([...previousTypeFilters].sort())) {
        return
      }

      previousTypeFilters = filters ? [...filters] : []

      if (shouldExpandSearch(options.searchQuery.value)) {
        debouncedExpandForSearch(options.searchQuery.value)
      } else {
        searchRunId.value += 1
        isSearchExpanding.value = false
      }
    }
  )

  return {
    isSearchExpanding
  }
}
