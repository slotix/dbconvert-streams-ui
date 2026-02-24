import { nextTick } from 'vue'
import { shallowMount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import UnifiedConsoleTab from '@/components/console/UnifiedConsoleTab.vue'
import connections from '@/api/connections'
import type { DatabaseMetadata } from '@/types/metadata'
import type { ExecuteQueryResult, QueryHistoryItem } from '@/composables/useConsoleTab'
import type { SqlQueryTab } from '@/stores/sqlConsole'

vi.mock('@/stores/paneTabs', () => ({
  usePaneTabsStore: () => ({
    renameConsoleTab: vi.fn()
  }),
  createConsoleSessionId: () => 'test-console-session'
}))

vi.mock('@/stores/confirmDialog', () => ({
  useConfirmDialogStore: () => ({
    confirm: vi.fn().mockResolvedValue(true)
  })
}))

vi.mock('@/composables/useConsoleTab', async () => {
  const { ref, computed } = await import('vue')

  const activeQueryTab = ref<SqlQueryTab | null>(null)

  return {
    useConsoleTab: () => ({
      sqlQuery: ref(''),
      hasExecutedQuery: ref(false),
      queryError: ref<string | null>(null),
      queryResults: ref<Record<string, unknown>[]>([]),
      resultColumns: ref<string[]>([]),
      resultSets: ref<NonNullable<ExecuteQueryResult['resultSets']>>([]),
      lastQueryStats: ref<{ rowCount: number; duration: number } | null>(null),
      currentPage: ref(1),
      pageSize: ref(100),
      queryHistory: ref<QueryHistoryItem[]>([]),
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
    }),
    __mockConsoleTabState: {
      activeQueryTab
    }
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
        spec: { database: { host: 'localhost', port: 5432, username: 'u', database: 'pg_db' } },
        databasesInfo: [{ name: 'pg_db', isSystem: false }]
      },
      {
        id: 'my-1',
        name: 'MySQL',
        type: 'mysql',
        spec: { database: { host: 'localhost', port: 3306, username: 'u', database: 'my_db' } },
        databasesInfo: [{ name: 'my_db', isSystem: false }]
      },
      {
        id: 'files-1',
        name: 'Local Files',
        type: 'files',
        spec: { files: { basePath: '/tmp' } }
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
  const { useConnectionsStore } = await import('@/stores/connections')

  const connectionsStore = useConnectionsStore()

  const selectedConnections = ref([{ connectionId: 'pg-1', alias: 'pg1', database: 'pg_db' }])
  const runMode = ref<'single' | 'federated'>('single')

  const databaseSourceMappings = computed(() =>
    selectedConnections.value
      .filter((mapping) => mapping.connectionId === 'pg-1' || mapping.connectionId === 'my-1')
      .map((mapping) => {
        const currentDatabase = mapping.database?.trim() || ''
        if (currentDatabase) return mapping

        const connection = connectionsStore.connectionByID(mapping.connectionId)
        const fallbackDatabase = connection?.spec?.database?.database
        if (typeof fallbackDatabase !== 'string' || !fallbackDatabase.trim()) return mapping

        return {
          ...mapping,
          database: fallbackDatabase
        }
      })
  )

  const singleSourceMapping = computed(() => databaseSourceMappings.value[0] || null)

  return {
    useConsoleSources: () => ({
      selectedConnections,
      useFederatedEngine: computed(() => runMode.value === 'federated'),
      runMode,
      databaseSourceMappings,
      singleSourceMapping,
      handleUpdateSelectedConnections: (value: typeof selectedConnections.value) => {
        selectedConnections.value = value
      },
      initializeDefaultSources: vi.fn(),
      syncPrimarySource: vi.fn(),
      restoreSelectedConnections: vi.fn(),
      persistSelectedConnections: vi.fn()
    }),
    __mockConsoleSourcesState: {
      selectedConnections,
      runMode
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
}

interface MockConsoleTabState {
  activeQueryTab: { value: SqlQueryTab | null }
}

async function getMockConsoleSourcesState(): Promise<MockConsoleSourcesState> {
  const module = (await import('@/composables/useConsoleSources')) as unknown as {
    __mockConsoleSourcesState: MockConsoleSourcesState
  }
  return module.__mockConsoleSourcesState
}

async function getMockConsoleTabState(): Promise<MockConsoleTabState> {
  const module = (await import('@/composables/useConsoleTab')) as unknown as {
    __mockConsoleTabState: MockConsoleTabState
  }
  return module.__mockConsoleTabState
}

describe('UnifiedConsoleTab SQL LSP context isolation in multisource switching', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.clear()
    }
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('keeps PostgreSQL LSP context after quick pg -> mysql -> pg switch', async () => {
    const __mockConsoleSourcesState = await getMockConsoleSourcesState()

    __mockConsoleSourcesState.selectedConnections.value = [
      { connectionId: 'pg-1', alias: 'pg1', database: 'pg_db' }
    ]

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
    await nextTick()

    __mockConsoleSourcesState.selectedConnections.value = [
      { connectionId: 'pg-1', alias: 'pg1', database: 'pg_db' }
    ]
    await nextTick()

    await vi.runAllTimersAsync()
    await nextTick()
    await nextTick()

    const sqlEditorPane = wrapper.findComponent({ name: 'SqlEditorPane' })
    const lspContext = sqlEditorPane.props('lspContext') as {
      provider: string
      connectionId: string
      database: string
    }

    expect(lspContext).toEqual({
      provider: 'sqls',
      connectionId: 'pg-1',
      database: 'pg_db'
    })
    expect(connections.getMetadata).not.toHaveBeenCalled()

    wrapper.unmount()
  })
  it('keeps MySQL LSP context after quick mysql -> pg -> mysql switch', async () => {
    const __mockConsoleSourcesState = await getMockConsoleSourcesState()

    __mockConsoleSourcesState.selectedConnections.value = [
      { connectionId: 'my-1', alias: 'my1', database: 'my_db' }
    ]

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
    await nextTick()

    __mockConsoleSourcesState.selectedConnections.value = [
      { connectionId: 'my-1', alias: 'my1', database: 'my_db' }
    ]
    await nextTick()

    await vi.runAllTimersAsync()
    await nextTick()
    await nextTick()

    const sqlEditorPane = wrapper.findComponent({ name: 'SqlEditorPane' })
    const lspContext = sqlEditorPane.props('lspContext') as {
      provider: string
      connectionId: string
      database: string
    }

    expect(lspContext).toEqual({
      provider: 'sqls',
      connectionId: 'my-1',
      database: 'my_db'
    })
    expect(connections.getMetadata).not.toHaveBeenCalled()

    wrapper.unmount()
  })

  it('provides DuckDB LSP context in federated mode', async () => {
    const __mockConsoleSourcesState = await getMockConsoleSourcesState()

    __mockConsoleSourcesState.runMode.value = 'federated'
    __mockConsoleSourcesState.selectedConnections.value = [
      { connectionId: 'my-1', alias: 'my1', database: '' },
      { connectionId: 'pg-1', alias: 'pg1', database: '' }
    ]

    vi.mocked(connections.getMetadata).mockImplementation((connectionId: string) => {
      if (connectionId === 'my-1') {
        return new Promise((resolve) =>
          setTimeout(() => resolve(buildMetadata('actor', 'first_name')), 1)
        )
      }
      return new Promise((resolve) => setTimeout(() => resolve(buildMetadata('film', 'title')), 1))
    })

    const wrapper = shallowMount(UnifiedConsoleTab, {
      props: {
        connectionId: 'my-1',
        mode: 'database'
      }
    })

    await nextTick()
    await nextTick()
    await vi.runAllTimersAsync()
    await nextTick()

    const sqlEditorPane = wrapper.findComponent({ name: 'SqlEditorPane' })
    const lspContext = sqlEditorPane.props('lspContext')
    expect(lspContext).toEqual({
      provider: 'duckdb',
      federatedConnections: [
        { connectionId: 'my-1', alias: 'my1', database: '' },
        { connectionId: 'pg-1', alias: 'pg1', database: '' }
      ]
    })
    expect(connections.getMetadata).not.toHaveBeenCalled()

    wrapper.unmount()
  })

  it('keeps DuckDB federated LSP context with mixed file and database sources', async () => {
    const __mockConsoleSourcesState = await getMockConsoleSourcesState()

    __mockConsoleSourcesState.runMode.value = 'federated'
    __mockConsoleSourcesState.selectedConnections.value = [
      { connectionId: 'files-1', alias: 'files1', database: '' },
      { connectionId: 'my-1', alias: 'my1', database: 'my_db' },
      { connectionId: 'pg-1', alias: 'pg1', database: 'pg_db' }
    ]

    const wrapper = shallowMount(UnifiedConsoleTab, {
      props: {
        connectionId: 'pg-1',
        mode: 'database'
      }
    })

    await nextTick()

    const sqlEditorPane = wrapper.findComponent({ name: 'SqlEditorPane' })
    const lspContext = sqlEditorPane.props('lspContext') as {
      provider: string
      federatedConnections: Array<{ connectionId: string; alias?: string; database?: string }>
    }

    expect(lspContext).toEqual({
      provider: 'duckdb',
      federatedConnections: [
        { connectionId: 'my-1', alias: 'my1', database: 'my_db' },
        { connectionId: 'pg-1', alias: 'pg1', database: 'pg_db' }
      ]
    })

    wrapper.unmount()
  })

  it('uses DuckDB LSP context when multiple sources are selected even in single run mode', async () => {
    const __mockConsoleSourcesState = await getMockConsoleSourcesState()

    __mockConsoleSourcesState.runMode.value = 'single'
    __mockConsoleSourcesState.selectedConnections.value = [
      { connectionId: 'files-1', alias: 'files1', database: '' },
      { connectionId: 'my-1', alias: 'my1', database: 'my_db' },
      { connectionId: 'pg-1', alias: 'pg1', database: 'pg_db' }
    ]

    const wrapper = shallowMount(UnifiedConsoleTab, {
      props: {
        connectionId: 'my-1',
        mode: 'database'
      }
    })

    await nextTick()

    const sqlEditorPane = wrapper.findComponent({ name: 'SqlEditorPane' })
    const lspContext = sqlEditorPane.props('lspContext') as {
      provider: string
      federatedConnections: Array<{ connectionId: string; alias?: string; database?: string }>
    }

    expect(lspContext).toEqual({
      provider: 'duckdb',
      federatedConnections: [
        { connectionId: 'my-1', alias: 'my1', database: 'my_db' },
        { connectionId: 'pg-1', alias: 'pg1', database: 'pg_db' }
      ]
    })

    wrapper.unmount()
  })

  it('shows file execution context for a single file source', async () => {
    const __mockConsoleSourcesState = await getMockConsoleSourcesState()

    __mockConsoleSourcesState.runMode.value = 'single'
    __mockConsoleSourcesState.selectedConnections.value = [
      { connectionId: 'files-1', alias: 'files1', database: '' }
    ]

    const wrapper = shallowMount(UnifiedConsoleTab, {
      props: {
        connectionId: 'files-1',
        mode: 'file'
      }
    })

    await nextTick()

    expect(wrapper.text()).toContain('Local Files')

    wrapper.unmount()
  })

  it('passes file tab path to DuckDB LSP context for file completions', async () => {
    const __mockConsoleSourcesState = await getMockConsoleSourcesState()
    const __mockConsoleTabState = await getMockConsoleTabState()

    __mockConsoleSourcesState.runMode.value = 'single'
    __mockConsoleSourcesState.selectedConnections.value = [
      { connectionId: 'files-1', alias: 'files1', database: '' }
    ]

    __mockConsoleTabState.activeQueryTab.value = {
      id: 'file-tab-1',
      name: 'Query 1',
      query: '',
      createdAt: 0,
      updatedAt: 0,
      fileContext: {
        path: '/tmp/sales/orders.csv',
        format: 'csv'
      }
    }

    const wrapper = shallowMount(UnifiedConsoleTab, {
      props: {
        connectionId: 'files-1',
        mode: 'file'
      }
    })

    await nextTick()

    const sqlEditorPane = wrapper.findComponent({ name: 'SqlEditorPane' })
    const lspContext = sqlEditorPane.props('lspContext') as {
      provider: string
      connectionId: string
      filePath?: string
      fileFormat?: string
    }

    expect(lspContext).toEqual({
      provider: 'duckdb',
      connectionId: 'files-1',
      filePath: '/tmp/sales/orders.csv',
      fileFormat: 'csv'
    })

    wrapper.unmount()
    __mockConsoleTabState.activeQueryTab.value = null
  })

  it('uses DuckDB multisource LSP context in file mode when multiple sources are selected', async () => {
    const __mockConsoleSourcesState = await getMockConsoleSourcesState()
    const __mockConsoleTabState = await getMockConsoleTabState()

    __mockConsoleSourcesState.runMode.value = 'single'
    __mockConsoleSourcesState.selectedConnections.value = [
      { connectionId: 'files-1', alias: 'files1', database: '' },
      { connectionId: 'my-1', alias: 'my1', database: 'my_db' },
      { connectionId: 'pg-1', alias: 'pg1', database: 'pg_db' }
    ]

    __mockConsoleTabState.activeQueryTab.value = {
      id: 'file-tab-2',
      name: 'Query 1',
      query: '',
      createdAt: 0,
      updatedAt: 0,
      fileContext: {
        path: '/tmp/sales/orders.csv',
        format: 'csv'
      }
    }

    const wrapper = shallowMount(UnifiedConsoleTab, {
      props: {
        connectionId: 'files-1',
        mode: 'file'
      }
    })

    await nextTick()

    const sqlEditorPane = wrapper.findComponent({ name: 'SqlEditorPane' })
    const lspContext = sqlEditorPane.props('lspContext') as {
      provider: string
      connectionId?: string
      filePath?: string
      fileFormat?: string
      federatedConnections?: Array<{ connectionId: string; alias?: string; database?: string }>
    }

    expect(lspContext).toEqual({
      provider: 'duckdb',
      filePath: '/tmp/sales/orders.csv',
      fileFormat: 'csv',
      federatedConnections: [
        { connectionId: 'my-1', alias: 'my1', database: 'my_db' },
        { connectionId: 'pg-1', alias: 'pg1', database: 'pg_db' }
      ]
    })
    expect(lspContext.connectionId).toBeUndefined()

    wrapper.unmount()
    __mockConsoleTabState.activeQueryTab.value = null
  })

  it('shows multi-source execution label for mixed targets in file mode', async () => {
    const __mockConsoleSourcesState = await getMockConsoleSourcesState()

    __mockConsoleSourcesState.runMode.value = 'federated'
    __mockConsoleSourcesState.selectedConnections.value = [
      { connectionId: 'files-1', alias: 'files1', database: '' },
      { connectionId: 'my-1', alias: 'my1', database: 'my_db' }
    ]

    const wrapper = shallowMount(UnifiedConsoleTab, {
      props: {
        connectionId: 'files-1',
        mode: 'file'
      }
    })

    await nextTick()

    expect(wrapper.text()).not.toContain('Run on:')
    expect(wrapper.text()).toContain('Multi-source • 2 sources')
    expect(wrapper.text()).toContain('files1')
    expect(wrapper.text()).toContain('my1')

    wrapper.unmount()
  })

  it('does not render execution selector options when multiple sources are selected', async () => {
    const __mockConsoleSourcesState = await getMockConsoleSourcesState()

    __mockConsoleSourcesState.runMode.value = 'federated'
    __mockConsoleSourcesState.selectedConnections.value = [
      { connectionId: 'pg-1', alias: 'pg1', database: 'pg_db' },
      { connectionId: 'my-1', alias: 'my1', database: 'removed_db' }
    ]

    const wrapper = shallowMount(UnifiedConsoleTab, {
      props: {
        connectionId: 'pg-1',
        mode: 'database'
      }
    })

    await nextTick()

    const executionSelect = wrapper.findComponent({ name: 'FormSelect' })
    expect(executionSelect.exists()).toBe(false)
    expect(wrapper.text()).toContain('Multi-source • 2 sources')
    expect(wrapper.text()).toContain('pg1')
    expect(wrapper.text()).toContain('my1')

    wrapper.unmount()
  })
})
