import { computed, nextTick, ref } from 'vue'
import { shallowMount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import UnifiedConsoleTab from '@/components/console/UnifiedConsoleTab.vue'
import connections from '@/api/connections'
import type { DatabaseMetadata } from '@/types/metadata'

vi.mock('@/stores/paneTabs', () => ({
  usePaneTabsStore: () => ({
    renameConsoleTab: vi.fn()
  }),
  createConsoleSessionId: () => 'test-console-session'
}))

vi.mock('@/composables/useConsoleTab', async () => {
  const { ref, computed } = await import('vue')

  const activeQueryTab = ref<any>(null)

  return {
    useConsoleTab: () => ({
      sqlQuery: ref(''),
      hasExecutedQuery: ref(false),
      queryError: ref<string | null>(null),
      queryResults: ref<Record<string, unknown>[]>([]),
      resultColumns: ref<string[]>([]),
      resultSets: ref<any[]>([]),
      lastQueryStats: ref<{ rowCount: number; duration: number } | null>(null),
      currentPage: ref(1),
      pageSize: ref(100),
      queryHistory: ref<any[]>([]),
      editorWidth: ref(50),
      startResize: vi.fn(),
      splitContainerRef: ref(null),
      leftPaneRef: ref(null),
      queryTabs: computed(() => []),
      activeQueryTabId: computed(() => ''),
      activeQueryTab,
      setActiveQueryTab: vi.fn(),
      addQueryTab: vi.fn(),
      closeQueryTab: vi.fn(),
      closeAllQueryTabs: vi.fn(),
      closeOthersQueryTabs: vi.fn(),
      handleRenameTab: vi.fn(),
      reorderQueryTab: vi.fn(),
      canReopenQueryTab: vi.fn(() => false),
      reopenQueryTab: vi.fn(),
      formatQuery: vi.fn(),
      insertTemplate: vi.fn(),
      insertHistoryQuery: vi.fn(),
      saveToHistory: vi.fn(),
      removeHistoryItem: vi.fn(),
      toggleHistoryPinned: vi.fn(),
      openHistoryQueryInNewTab: vi.fn(),
      setExecutionResult: vi.fn(),
      setExecutionError: vi.fn(),
      initialize: vi.fn(),
      cleanup: vi.fn()
    })
  }
})
vi.mock('@/composables/useQueryExecution', async () => {
  const { ref } = await import('vue')

  return {
    useQueryExecution: () => ({
      isExecuting: ref(false),
      executeQuery: vi.fn()
    })
  }
})

vi.mock('@/stores/connections', async () => {
  const state = {
    connections: [
      {
        id: 'pg-1',
        name: 'Postgres',
        type: 'postgresql',
        spec: { database: { host: 'localhost', port: 5432, username: 'u', database: 'pg_db' } }
      },
      {
        id: 'my-1',
        name: 'MySQL',
        type: 'mysql',
        spec: { database: { host: 'localhost', port: 3306, username: 'u', database: 'my_db' } }
      }
    ]
  }

  const store = {
    get connections() {
      return state.connections
    },
    set connections(value) {
      state.connections = value
    },
    connectionByID: (id: string) => state.connections.find((c) => c.id === id) || null,
    refreshConnections: vi.fn().mockResolvedValue(undefined)
  }

  return {
    useConnectionsStore: () => store,
    __mockConnectionsStore: store
  }
})

vi.mock('@/composables/useConsoleSources', async () => {
  const { computed, ref } = await import('vue')

  const selectedConnections = ref([{ connectionId: 'pg-1', alias: 'pg1', database: 'pg_db' }])
  const runMode = ref<'single' | 'federated'>('single')
  const singleSourceConnectionId = ref('pg-1')

  const databaseSourceMappings = computed(() =>
    selectedConnections.value.filter(
      (mapping) => mapping.connectionId === 'pg-1' || mapping.connectionId === 'my-1'
    )
  )

  const singleSourceMapping = computed(() => {
    const selected = selectedConnections.value.find(
      (mapping) => mapping.connectionId === singleSourceConnectionId.value
    )
    return selected || databaseSourceMappings.value[0] || null
  })

  return {
    useConsoleSources: () => ({
      selectedConnections,
      useFederatedEngine: computed(() => false),
      runMode,
      databaseSourceMappings,
      singleSourceMapping,
      handleUpdateSelectedConnections: (value: typeof selectedConnections.value) => {
        selectedConnections.value = value
      },
      setRunMode: (mode: 'single' | 'federated') => {
        runMode.value = mode
      },
      setSingleSourceConnectionId: (connectionId: string) => {
        singleSourceConnectionId.value = connectionId
      },
      initializeDefaultSources: vi.fn(),
      syncPrimarySource: vi.fn(),
      restoreSelectedConnections: vi.fn(),
      restoreRunMode: vi.fn(),
      restoreSingleSourceConnection: vi.fn(),
      persistSelectedConnections: vi.fn()
    }),
    __mockConsoleSourcesState: {
      selectedConnections,
      runMode,
      singleSourceConnectionId
    }
  }
})

vi.mock('@/api/connections', () => ({
  default: {
    getMetadata: vi.fn()
  }
}))

function buildMetadata(tableName: string, columnName: string) {
  return {
    tables: {
      [tableName]: {
        name: tableName,
        schema: 'public',
        database: 'test_db',
        columns: [
          {
            name: columnName,
            dataType: 'text',
            isNullable: false,
            defaultValue: { String: null, Valid: false },
            isPrimaryKey: false,
            isUnique: false,
            length: { Int64: null, Valid: false },
            precision: { Int64: null, Valid: false },
            scale: { Int64: null, Valid: false },
            comment: { String: null, Valid: false },
            autoIncrement: false
          }
        ],
        primaryKeys: [],
        foreignKeys: [],
        indexes: []
      }
    },
    views: {}
  } satisfies DatabaseMetadata
}

type MockConnectionMapping = { connectionId: string; alias: string; database: string }

interface MockConsoleSourcesState {
  selectedConnections: { value: MockConnectionMapping[] }
  runMode: { value: 'single' | 'federated' }
  singleSourceConnectionId: { value: string }
}

async function getMockConsoleSourcesState(): Promise<MockConsoleSourcesState> {
  const module = (await import('@/composables/useConsoleSources')) as unknown as {
    __mockConsoleSourcesState: MockConsoleSourcesState
  }
  return module.__mockConsoleSourcesState
}

describe('UnifiedConsoleTab schema context isolation in multisource switching', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('keeps PostgreSQL fields after quick pg -> mysql -> pg switch when stale mysql metadata resolves last', async () => {
    const __mockConsoleSourcesState = await getMockConsoleSourcesState()

    __mockConsoleSourcesState.selectedConnections.value = [
      { connectionId: 'pg-1', alias: 'pg1', database: 'pg_db' }
    ]
    __mockConsoleSourcesState.singleSourceConnectionId.value = 'pg-1'

    let callIndex = 0
    vi.mocked(connections.getMetadata).mockImplementation(() => {
      const currentCall = callIndex
      callIndex += 1

      if (currentCall === 0) {
        return new Promise((resolve) =>
          setTimeout(() => resolve(buildMetadata('pg_initial_table', 'pg_initial_col')), 1)
        )
      }

      if (currentCall === 1) {
        return new Promise((resolve) =>
          setTimeout(() => resolve(buildMetadata('mysql_stale_table', 'mysql_col')), 60)
        )
      }

      return new Promise((resolve) =>
        setTimeout(() => resolve(buildMetadata('pg_final_table', 'pg_final_col')), 5)
      )
    })

    const wrapper = shallowMount(UnifiedConsoleTab, {
      props: {
        connectionId: 'pg-1',
        mode: 'database'
      }
    })

    await nextTick()

    __mockConsoleSourcesState.selectedConnections.value = [
      { connectionId: 'my-1', alias: 'my1', database: 'my_db' }
    ]
    __mockConsoleSourcesState.singleSourceConnectionId.value = 'my-1'
    await nextTick()

    __mockConsoleSourcesState.selectedConnections.value = [
      { connectionId: 'pg-1', alias: 'pg1', database: 'pg_db' }
    ]
    __mockConsoleSourcesState.singleSourceConnectionId.value = 'pg-1'
    await nextTick()

    await vi.runAllTimersAsync()
    await nextTick()
    await nextTick()

    const sqlEditorPane = wrapper.findComponent({ name: 'SqlEditorPane' })
    const schemaContext = sqlEditorPane.props('schemaContext') as {
      tables: Array<{ name: string }>
      columns: Record<string, Array<{ name: string }>>
      dialect: string
    }

    const tableNames = schemaContext.tables.map((table) => table.name)

    expect(schemaContext.dialect).toBe('pgsql')
    expect(tableNames).toContain('pg_final_table')
    expect(tableNames).not.toContain('mysql_stale_table')
    expect(schemaContext.columns.pg_final_table?.[0]?.name).toBe('pg_final_col')

    wrapper.unmount()
  })

  it('keeps MySQL fields after quick mysql -> pg -> mysql switch when stale pg metadata resolves last', async () => {
    const __mockConsoleSourcesState = await getMockConsoleSourcesState()

    __mockConsoleSourcesState.selectedConnections.value = [
      { connectionId: 'my-1', alias: 'my1', database: 'my_db' }
    ]
    __mockConsoleSourcesState.singleSourceConnectionId.value = 'my-1'

    let callIndex = 0
    vi.mocked(connections.getMetadata).mockImplementation(() => {
      const currentCall = callIndex
      callIndex += 1

      if (currentCall === 0) {
        return new Promise((resolve) =>
          setTimeout(() => resolve(buildMetadata('mysql_initial_table', 'mysql_initial_col')), 1)
        )
      }

      if (currentCall === 1) {
        return new Promise((resolve) =>
          setTimeout(() => resolve(buildMetadata('pg_stale_table', 'pg_col')), 60)
        )
      }

      return new Promise((resolve) =>
        setTimeout(() => resolve(buildMetadata('mysql_final_table', 'mysql_final_col')), 5)
      )
    })

    const wrapper = shallowMount(UnifiedConsoleTab, {
      props: {
        connectionId: 'my-1',
        mode: 'database'
      }
    })

    await nextTick()

    __mockConsoleSourcesState.selectedConnections.value = [
      { connectionId: 'pg-1', alias: 'pg1', database: 'pg_db' }
    ]
    __mockConsoleSourcesState.singleSourceConnectionId.value = 'pg-1'
    await nextTick()

    __mockConsoleSourcesState.selectedConnections.value = [
      { connectionId: 'my-1', alias: 'my1', database: 'my_db' }
    ]
    __mockConsoleSourcesState.singleSourceConnectionId.value = 'my-1'
    await nextTick()

    await vi.runAllTimersAsync()
    await nextTick()
    await nextTick()

    const sqlEditorPane = wrapper.findComponent({ name: 'SqlEditorPane' })
    const schemaContext = sqlEditorPane.props('schemaContext') as {
      tables: Array<{ name: string }>
      columns: Record<string, Array<{ name: string }>>
      dialect: string
    }

    const tableNames = schemaContext.tables.map((table) => table.name)

    expect(schemaContext.dialect).toBe('mysql')
    expect(tableNames).toContain('mysql_final_table')
    expect(tableNames).not.toContain('pg_stale_table')
    expect(schemaContext.columns.mysql_final_table?.[0]?.name).toBe('mysql_final_col')

    wrapper.unmount()
  })
})
