/**
 * Composable for managing data sources in the SQL console.
 * Handles connection selection, persistence, and federated query detection.
 */
import { ref, computed, watch, type Ref, type ComputedRef } from 'vue'
import { useConnectionsStore } from '@/stores/connections'
import type { ConnectionMapping } from '@/api/federated'
import type { Connection } from '@/types/connections'
import { getConnectionTypeLabel } from '@/types/specs'

export type ConsoleMode = 'database' | 'file'

export interface UseConsoleSourcesOptions {
  /** Current connection ID */
  connectionId: ComputedRef<string> | Ref<string>
  /** Console mode: 'database' or 'file' */
  mode: ComputedRef<ConsoleMode> | Ref<ConsoleMode>
  /** Database name (for database mode) */
  database?: ComputedRef<string | undefined> | Ref<string | undefined>
  /** Console key for persistence (e.g., 'file:connId' or 'connId:dbName') */
  consoleKey: ComputedRef<string> | Ref<string>
}

export interface UseConsoleSourcesReturn {
  // State
  selectedConnections: Ref<ConnectionMapping[]>
  userModifiedSources: Ref<boolean>

  // Computed
  useFederatedEngine: ComputedRef<boolean>
  primaryMapping: ComputedRef<ConnectionMapping>

  // Methods
  handleUpdateSelectedConnections: (value: ConnectionMapping[]) => void
  initializeDefaultSources: () => void
  syncPrimarySource: () => void
  restoreSelectedConnections: () => void
  persistSelectedConnections: () => void

  // Helpers
  isDuckDbFileQuery: (query: string) => boolean
  escapeRegExp: (value: string) => string
}

// ========== Persistence ==========
interface PersistedConsoleSourcesEntry {
  touched: boolean
  connections: ConnectionMapping[]
}

type PersistedConsoleSourcesState = Record<string, PersistedConsoleSourcesEntry>

const SOURCES_STORAGE_KEY = 'explorer.sqlConsoleSources'

function hasBrowserStorage(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

function loadPersistedSources(): PersistedConsoleSourcesState {
  if (!hasBrowserStorage()) return {}
  try {
    const raw = window.localStorage.getItem(SOURCES_STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as PersistedConsoleSourcesState
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function persistSources(state: PersistedConsoleSourcesState) {
  if (!hasBrowserStorage()) return
  try {
    window.localStorage.setItem(SOURCES_STORAGE_KEY, JSON.stringify(state))
  } catch {
    // ignore
  }
}

// ========== Helpers ==========
function defaultAliasForConnection(connection?: Connection | null): string {
  const normalized = getConnectionTypeLabel(connection?.spec, connection?.type) || ''
  if (normalized === 'postgresql' || normalized === 'postgres') return 'pg1'
  if (normalized === 'mysql' || normalized === 'mariadb') return 'my1'
  if (normalized === 's3') return 's31'
  if (normalized === 'gcs') return 'gcs1'
  if (normalized === 'azure') return 'azure1'
  if (normalized === 'files') return 'files1'
  return 'db1'
}

export function isDuckDbFileQuery(query: string): boolean {
  const lowered = query.toLowerCase()
  return (
    lowered.includes('read_parquet') ||
    lowered.includes('read_csv') ||
    lowered.includes('read_csv_auto') ||
    lowered.includes('read_json') ||
    lowered.includes('read_json_auto')
  )
}

export function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// ========== Composable ==========
export function useConsoleSources(options: UseConsoleSourcesOptions): UseConsoleSourcesReturn {
  const { connectionId, mode, database, consoleKey } = options

  const connectionsStore = useConnectionsStore()

  // Unwrap refs to computed values
  const connectionIdValue = computed(() => connectionId.value)
  const modeValue = computed(() => mode.value)
  const databaseValue = computed(() => database?.value)
  const consoleKeyValue = computed(() => consoleKey.value)

  // ========== State ==========
  const selectedConnections = ref<ConnectionMapping[]>([])
  const userModifiedSources = ref(false)

  // ========== Computed ==========
  const connection = computed(() => connectionsStore.connectionByID(connectionIdValue.value))

  const sourcesKey = computed(() => `${modeValue.value}:${consoleKeyValue.value}`)

  const primaryDefaultDatabase = computed(() => {
    if (modeValue.value !== 'database') return ''
    return databaseValue.value || ''
  })

  const primaryMapping = computed<ConnectionMapping>(() => {
    const conn = connection.value
    const mapping: ConnectionMapping = {
      connectionId: connectionIdValue.value,
      alias: defaultAliasForConnection(conn)
    }
    if (modeValue.value === 'database') {
      const db = primaryDefaultDatabase.value
      if (db) mapping.database = db
    }
    return mapping
  })

  const useFederatedEngine = computed(() => {
    // If user cleared all sources, allow running DuckDB file queries via federated endpoint
    if (selectedConnections.value.length === 0) return true

    // Single source: keep the current behavior when it matches the console's root connection
    if (selectedConnections.value.length === 1) {
      return selectedConnections.value[0].connectionId !== connectionIdValue.value
    }

    // Multiple sources => federated
    return true
  })

  // ========== Methods ==========
  function sanitizeMappings(mappings: ConnectionMapping[]): ConnectionMapping[] {
    const existingIds =
      connectionsStore.connections.length > 0
        ? new Set(connectionsStore.connections.map((c) => c.id))
        : null

    const seen = new Set<string>()
    const cleaned: ConnectionMapping[] = []

    for (const m of mappings) {
      if (!m || typeof m !== 'object') continue
      if (typeof m.connectionId !== 'string' || typeof m.alias !== 'string') continue
      if (existingIds && !existingIds.has(m.connectionId)) continue
      if (seen.has(m.connectionId)) continue
      seen.add(m.connectionId)
      cleaned.push({
        connectionId: m.connectionId,
        alias: m.alias,
        database: typeof m.database === 'string' ? m.database : undefined
      })
    }

    return cleaned
  }

  function handleUpdateSelectedConnections(value: ConnectionMapping[]) {
    userModifiedSources.value = true
    selectedConnections.value = value
  }

  function restoreSelectedConnections() {
    const saved = loadPersistedSources()
    const entry = saved[sourcesKey.value]
    if (!entry || !entry.touched) return

    selectedConnections.value = sanitizeMappings(entry.connections || [])
    userModifiedSources.value = true
  }

  function persistSelectedConnections() {
    if (!userModifiedSources.value) return

    const saved = loadPersistedSources()
    saved[sourcesKey.value] = {
      touched: true,
      connections: selectedConnections.value
    }
    persistSources(saved)
  }

  function initializeDefaultSources() {
    if (userModifiedSources.value) return
    if (selectedConnections.value.length > 0) return
    selectedConnections.value = [primaryMapping.value]
  }

  function syncPrimarySource() {
    if (userModifiedSources.value) return

    const primary = primaryMapping.value
    const existingIndex = selectedConnections.value.findIndex(
      (m) => m.connectionId === primary.connectionId
    )

    if (existingIndex === -1) {
      selectedConnections.value = [primary]
      return
    }

    const existing = selectedConnections.value[existingIndex]
    const shouldReplaceAlias = existing.alias === 'db1' && primary.alias !== 'db1'
    selectedConnections.value.splice(existingIndex, 1, {
      ...existing,
      alias: shouldReplaceAlias ? primary.alias : existing.alias || primary.alias,
      database: existing.database || primary.database
    })
  }

  // ========== Watchers ==========
  watch([primaryMapping, connectionIdValue], syncPrimarySource, { immediate: true })
  watch(selectedConnections, persistSelectedConnections, { deep: true })

  return {
    // State
    selectedConnections,
    userModifiedSources,

    // Computed
    useFederatedEngine,
    primaryMapping,

    // Methods
    handleUpdateSelectedConnections,
    initializeDefaultSources,
    syncPrimarySource,
    restoreSelectedConnections,
    persistSelectedConnections,

    // Helpers
    isDuckDbFileQuery,
    escapeRegExp
  }
}

export type ConsoleSourcesReturn = ReturnType<typeof useConsoleSources>
