import { computed, ref } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { executeFederatedQuery, type ConnectionMapping } from '@/api/federated'
import { useQueryExecution } from '@/composables/useQueryExecution'

vi.mock('@/stores/explorerNavigation', () => ({
  useExplorerNavigationStore: () => ({
    selection: null,
    metadataState: {},
    expandedDatabases: new Set<string>(),
    invalidateDatabases: vi.fn(),
    ensureDatabases: vi.fn().mockResolvedValue(undefined),
    invalidateMetadata: vi.fn(),
    ensureMetadata: vi.fn().mockResolvedValue(undefined)
  })
}))

vi.mock('@/stores/databaseOverview', () => ({
  useDatabaseOverviewStore: () => ({
    invalidateMetadata: vi.fn(),
    ensureMetadata: vi.fn().mockResolvedValue(undefined)
  })
}))

vi.mock('@/stores/logs', () => ({
  useLogsStore: () => ({
    addSQLLog: vi.fn()
  })
}))

vi.mock('@/api/sseLogsServiceStructured', () => ({
  sseLogsService: {
    isActive: vi.fn(() => false)
  }
}))

vi.mock('@/api/connections', () => ({
  default: {
    executeQuery: vi.fn()
  }
}))

vi.mock('@/api/files', () => ({
  executeFileQuery: vi.fn()
}))

vi.mock('@/api/federated', () => ({
  executeFederatedQuery: vi.fn()
}))

vi.mock('@/composables/useConsoleTab', () => ({
  detectQueryPurpose: vi.fn(() => 'read')
}))

vi.mock('@/composables/useConsoleSources', () => ({
  isDuckDbFileQuery: vi.fn(() => false)
}))

type Harness = {
  executeQuery: () => Promise<void>
  setExecutionResult: ReturnType<typeof vi.fn>
  setExecutionError: ReturnType<typeof vi.fn>
  saveToHistory: ReturnType<typeof vi.fn>
}

function createHarness(params: {
  selectedConnections: ConnectionMapping[]
  query: string
}): Harness {
  const setExecutionResult = vi.fn()
  const setExecutionError = vi.fn()
  const saveToHistory = vi.fn()

  const selectedConnections = ref(params.selectedConnections)
  const sqlQuery = ref(params.query)

  const { executeQuery } = useQueryExecution({
    mode: computed(() => 'database'),
    connectionId: computed(() => 'conn-my'),
    database: computed(() => 'sakila'),
    selectedConnections,
    singleSourceMapping: computed(() => selectedConnections.value[0] || null),
    useFederatedEngine: computed(() => selectedConnections.value.length > 1),
    sqlQuery,
    activeQueryTabId: ref(null),
    setExecutionResult,
    setExecutionError,
    saveToHistory
  })

  return {
    executeQuery,
    setExecutionResult,
    setExecutionError,
    saveToHistory
  }
}

describe('useQueryExecution alias routing', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('routes alias-qualified SQL to federated execution when multiple sources are selected', async () => {
    vi.mocked(executeFederatedQuery).mockResolvedValueOnce({
      columns: ['actor_id'],
      rows: [[1]],
      count: 1,
      status: 'success',
      duration: 12
    })

    const query = 'select * from my1.sakila.actor'
    const selectedConnections: ConnectionMapping[] = [
      { connectionId: 'conn-my', alias: 'my1', database: 'sakila' },
      { connectionId: 'conn-pg', alias: 'pg1', database: 'postgres' }
    ]

    const harness = createHarness({ selectedConnections, query })
    await harness.executeQuery()

    expect(executeFederatedQuery).toHaveBeenCalledWith({
      query,
      connections: selectedConnections
    })
    expect(harness.setExecutionError).not.toHaveBeenCalled()
    expect(harness.setExecutionResult).toHaveBeenCalledWith({
      columns: ['actor_id'],
      rows: [{ actor_id: 1 }],
      stats: { rowCount: 1, duration: 12 }
    })
    expect(harness.saveToHistory).toHaveBeenCalledWith(
      query,
      expect.objectContaining({
        mode: 'federated'
      })
    )
  })

  it('keeps existing validation error for alias-qualified SQL with a single selected source', async () => {
    const query = 'select * from my1.sakila.actor'
    const selectedConnections: ConnectionMapping[] = [
      { connectionId: 'conn-my', alias: 'my1', database: 'sakila' }
    ]

    const harness = createHarness({ selectedConnections, query })
    await harness.executeQuery()

    expect(executeFederatedQuery).not.toHaveBeenCalled()
    expect(harness.setExecutionError).toHaveBeenCalledWith(
      expect.stringContaining('Switch to Multi-source mode')
    )
  })
})
