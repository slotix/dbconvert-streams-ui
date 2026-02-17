/**
 * Composable for managing data sources in the SQL console.
 * Handles connection selection, persistence, and federated query detection.
 */
import { ref, computed, watch, type Ref, type ComputedRef } from 'vue'
import { useConnectionsStore } from '@/stores/connections'
import type { ConnectionMapping } from '@/api/federated'
import type { Connection } from '@/types/connections'
import { getConnectionDatabase } from '@/utils/specBuilder'
import { getConnectionKindFromSpec, getConnectionTypeLabel, isDatabaseKind } from '@/types/specs'

export type ConsoleMode = 'database' | 'file'
export type SqlRunMode = 'single' | 'federated'

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
  runMode: Ref<SqlRunMode>
  databaseSourceMappings: ComputedRef<ConnectionMapping[]>
  singleSourceConnectionId: Ref<string>
  singleSourceMapping: ComputedRef<ConnectionMapping | null>

  // Methods
  handleUpdateSelectedConnections: (value: ConnectionMapping[]) => void
  setRunMode: (mode: SqlRunMode) => void
  setSingleSourceConnectionId: (connectionId: string) => void
  initializeDefaultSources: () => void
  syncPrimarySource: () => void
  restoreSelectedConnections: () => void
  restoreRunMode: () => void
  restoreSingleSourceConnection: () => void
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
const RUN_MODE_STORAGE_KEY = 'explorer.sqlRunMode'
const SINGLE_SOURCE_STORAGE_KEY = 'explorer.sqlSingleSourceConnection'

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

interface PersistedRunModeEntry {
  mode: SqlRunMode
  explicit: boolean
}

type PersistedRunModeState = Record<string, PersistedRunModeEntry>

function loadPersistedRunModes(): PersistedRunModeState {
  if (!hasBrowserStorage()) return {}
  try {
    const raw = window.localStorage.getItem(RUN_MODE_STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as PersistedRunModeState
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function persistRunModes(state: PersistedRunModeState) {
  if (!hasBrowserStorage()) return
  try {
    window.localStorage.setItem(RUN_MODE_STORAGE_KEY, JSON.stringify(state))
  } catch {
    // ignore
  }
}

type PersistedSingleSourceState = Record<string, string>

function loadPersistedSingleSources(): PersistedSingleSourceState {
  if (!hasBrowserStorage()) return {}
  try {
    const raw = window.localStorage.getItem(SINGLE_SOURCE_STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as PersistedSingleSourceState
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function persistSingleSources(state: PersistedSingleSourceState) {
  if (!hasBrowserStorage()) return
  try {
    window.localStorage.setItem(SINGLE_SOURCE_STORAGE_KEY, JSON.stringify(state))
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
  const runMode = ref<SqlRunMode>('single')
  const hasExplicitRunMode = ref(false)
  const singleSourceConnectionId = ref('')

  // ========== Computed ==========
  const connection = computed(() => connectionsStore.connectionByID(connectionIdValue.value))

  const sourcesKey = computed(() => `${modeValue.value}:${consoleKeyValue.value}`)

  const primaryDefaultDatabase = computed(() => {
    if (modeValue.value !== 'database') return ''
    return databaseValue.value || getConnectionDefaultDatabase(connectionIdValue.value)
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

  const useFederatedEngine = computed(() => runMode.value === 'federated')

  const databaseSourceMappings = computed(() =>
    selectedConnections.value
      .filter((mapping) => {
        const conn = connectionsStore.connectionByID(mapping.connectionId)
        const kind = getConnectionKindFromSpec(conn?.spec)
        return isDatabaseKind(kind)
      })
      .map((mapping) => {
        if (modeValue.value !== 'database') return mapping

        const currentDatabase = mapping.database?.trim() || ''
        if (currentDatabase) return mapping

        const explicitDatabase =
          mapping.connectionId === connectionIdValue.value
            ? primaryDefaultDatabase.value.trim() ||
              getConnectionDefaultDatabase(mapping.connectionId)
            : getConnectionDefaultDatabase(mapping.connectionId)

        if (!explicitDatabase) return mapping

        return {
          ...mapping,
          database: explicitDatabase
        }
      })
  )

  const singleSourceMapping = computed<ConnectionMapping | null>(() => {
    const dbMappings = databaseSourceMappings.value
    if (dbMappings.length === 0) return null

    const selected = dbMappings.find((m) => m.connectionId === singleSourceConnectionId.value)
    if (selected) return selected

    return dbMappings[0]
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
    selectedConnections.value = sanitizeMappings(value)
  }

  function getConnectionDefaultDatabase(connectionId: string): string {
    const conn = connectionsStore.connectionByID(connectionId)
    return getConnectionDatabase(conn || undefined)
  }

  function ensureExplicitDatabaseMappings() {
    if (modeValue.value !== 'database') return

    const primaryDatabase = primaryDefaultDatabase.value.trim()
    let changed = false

    const next = selectedConnections.value.map((mapping) => {
      const currentDatabase = mapping.database?.trim() || ''
      if (currentDatabase) return mapping

      const explicitDatabase =
        mapping.connectionId === connectionIdValue.value
          ? primaryDatabase || getConnectionDefaultDatabase(mapping.connectionId)
          : getConnectionDefaultDatabase(mapping.connectionId)

      if (!explicitDatabase) return mapping

      changed = true
      return {
        ...mapping,
        database: explicitDatabase
      }
    })

    if (changed) {
      selectedConnections.value = next
    }
  }

  function deriveRunModeFromSources(): SqlRunMode {
    // Empty selection intentionally maps to federated to allow file read_* queries.
    if (selectedConnections.value.length === 0) return 'federated'

    // With exactly one selected source, single mode is the only meaningful mode.
    if (selectedConnections.value.length === 1) return 'single'

    return 'federated'
  }

  function setRunMode(mode: SqlRunMode) {
    runMode.value = selectedConnections.value.length === 1 ? 'single' : mode
    hasExplicitRunMode.value = true
  }

  function setSingleSourceConnectionId(connectionId: string) {
    singleSourceConnectionId.value = connectionId
  }

  function restoreRunMode() {
    const saved = loadPersistedRunModes()
    const entry = saved[sourcesKey.value]
    if (!entry || !entry.explicit) {
      runMode.value = deriveRunModeFromSources()
      return
    }

    if (entry.mode === 'single' || entry.mode === 'federated') {
      runMode.value = selectedConnections.value.length === 1 ? 'single' : entry.mode
      hasExplicitRunMode.value = true
      return
    }

    runMode.value = deriveRunModeFromSources()
  }

  function persistRunMode() {
    if (!hasExplicitRunMode.value) return

    const saved = loadPersistedRunModes()
    saved[sourcesKey.value] = {
      mode: runMode.value,
      explicit: true
    }
    persistRunModes(saved)
  }

  function syncSingleSourceConnection() {
    const dbMappings = databaseSourceMappings.value
    if (dbMappings.length === 0) {
      singleSourceConnectionId.value = ''
      return
    }

    if (dbMappings.some((m) => m.connectionId === singleSourceConnectionId.value)) {
      return
    }

    singleSourceConnectionId.value = dbMappings[0].connectionId
  }

  function restoreSingleSourceConnection() {
    const saved = loadPersistedSingleSources()
    const connectionId = saved[sourcesKey.value]
    if (connectionId) {
      singleSourceConnectionId.value = connectionId
    }
    syncSingleSourceConnection()
  }

  function persistSingleSourceConnection() {
    if (!singleSourceConnectionId.value) return

    const saved = loadPersistedSingleSources()
    saved[sourcesKey.value] = singleSourceConnectionId.value
    persistSingleSources(saved)
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

  function normalizePrimaryDatabaseMapping() {
    if (modeValue.value !== 'database') return

    const primaryDatabase = primaryDefaultDatabase.value.trim()
    if (!primaryDatabase) return

    const primaryIndex = selectedConnections.value.findIndex(
      (mapping) => mapping.connectionId === connectionIdValue.value
    )
    if (primaryIndex < 0) return

    const mapping = selectedConnections.value[primaryIndex]
    if (mapping.database?.trim()) return

    selectedConnections.value.splice(primaryIndex, 1, {
      ...mapping,
      database: primaryDatabase
    })
  }

  // ========== Watchers ==========
  watch([primaryMapping, connectionIdValue], syncPrimarySource, { immediate: true })
  watch(
    [selectedConnections, modeValue, connectionIdValue, primaryDefaultDatabase],
    normalizePrimaryDatabaseMapping,
    { deep: true, immediate: true }
  )
  watch(
    [selectedConnections, modeValue, connectionIdValue, primaryDefaultDatabase],
    ensureExplicitDatabaseMappings,
    { deep: true, immediate: true }
  )
  watch([selectedConnections, connectionIdValue], syncSingleSourceConnection, { deep: true })
  watch(selectedConnections, persistSelectedConnections, { deep: true })
  watch([selectedConnections, connectionIdValue], () => {
    if (!hasExplicitRunMode.value) {
      runMode.value = deriveRunModeFromSources()
    }
  })
  watch(sourcesKey, () => {
    hasExplicitRunMode.value = false
    runMode.value = deriveRunModeFromSources()
    restoreRunMode()
    restoreSingleSourceConnection()
  })
  watch(runMode, persistRunMode)
  watch(singleSourceConnectionId, persistSingleSourceConnection)

  return {
    // State
    selectedConnections,
    userModifiedSources,

    // Computed
    useFederatedEngine,
    primaryMapping,
    runMode,
    databaseSourceMappings,
    singleSourceConnectionId,
    singleSourceMapping,

    // Methods
    handleUpdateSelectedConnections,
    setRunMode,
    setSingleSourceConnectionId,
    initializeDefaultSources,
    syncPrimarySource,
    restoreSelectedConnections,
    restoreRunMode,
    restoreSingleSourceConnection,
    persistSelectedConnections,

    // Helpers
    isDuckDbFileQuery,
    escapeRegExp
  }
}

export type ConsoleSourcesReturn = ReturnType<typeof useConsoleSources>
