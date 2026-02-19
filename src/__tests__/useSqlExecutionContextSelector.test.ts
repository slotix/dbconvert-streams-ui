import { computed, ref } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ConnectionMapping } from '@/api/federated'
import { useSqlExecutionContextSelector } from '@/composables/useSqlExecutionContextSelector'

const EXECUTION_CONTEXT_STORAGE_KEY = 'explorer.sqlExecutionContext'

function createSelectorHarness(options?: {
  savedExecutionContext?: string
  directSourceReady?: boolean
}) {
  const mode = ref<'database' | 'file'>('database')
  const contextKey = ref('ctx-1')
  const runMode = ref<'single' | 'federated'>('federated')
  const federatedScopeConnectionId = ref('')

  const selectedConnections = ref<ConnectionMapping[]>([
    { connectionId: 'conn_pg', alias: 'pg1', database: 'postgres' },
    { connectionId: 'conn_files', alias: 'files1' }
  ])

  const databaseSourceMappings = computed(() =>
    selectedConnections.value.filter(
      (mapping) => mapping.connectionId.startsWith('conn_') && !!mapping.database
    )
  )
  const singleSourceMapping = computed(() => databaseSourceMappings.value[0] || null)

  const setRunMode = vi.fn((nextMode: 'single' | 'federated') => {
    runMode.value = nextMode
  })
  const setSingleSourceConnectionId = vi.fn()

  if (options?.savedExecutionContext) {
    window.localStorage.setItem(
      EXECUTION_CONTEXT_STORAGE_KEY,
      JSON.stringify({
        [contextKey.value]: options.savedExecutionContext
      })
    )
  }

  const selector = useSqlExecutionContextSelector({
    mode,
    contextKey,
    runMode,
    selectedConnections,
    databaseSourceMappings,
    singleSourceMapping,
    federatedScopeConnectionId,
    setRunMode,
    setSingleSourceConnectionId,
    isDatabaseMapping: (mapping) =>
      mapping.connectionId.startsWith('conn_') && !mapping.connectionId.includes('files'),
    getDatabaseTypeDisplay: () => 'PostgreSQL',
    getConnectionName: () => 'test-conn',
    getDirectSourceReadiness: () => ({
      ready: options?.directSourceReady ?? true
    }),
    getScopedSourceReadiness: () => ({ ready: true })
  })

  return {
    selector,
    setRunMode,
    setSingleSourceConnectionId,
    runMode,
    federatedScopeConnectionId
  }
}

describe('useSqlExecutionContextSelector', () => {
  beforeEach(() => {
    window.localStorage.clear()
    vi.clearAllMocks()
  })

  it('handles direct selection token and switches to single mode', () => {
    const { selector, setRunMode, setSingleSourceConnectionId } = createSelectorHarness()

    setRunMode.mockClear()
    setSingleSourceConnectionId.mockClear()

    selector.executionContextValue.value = 'direct:conn_pg::postgres::pg1'

    expect(setSingleSourceConnectionId).toHaveBeenCalledWith('conn_pg::postgres::pg1')
    expect(setRunMode).toHaveBeenCalledWith('single')
  })

  it('handles scoped selection token and keeps federated mode', () => {
    const { selector, setRunMode, federatedScopeConnectionId } = createSelectorHarness()

    setRunMode.mockClear()

    selector.executionContextValue.value = 'scoped:conn_files'

    expect(federatedScopeConnectionId.value).toBe('conn_files')
    expect(setRunMode).toHaveBeenCalledWith('federated')
  })

  it('restores persisted direct selection only when option is enabled', () => {
    const readyHarness = createSelectorHarness({
      savedExecutionContext: 'direct:conn_pg::postgres::pg1',
      directSourceReady: true
    })
    expect(readyHarness.selector.executionContextValue.value).toBe('direct:conn_pg::postgres::pg1')

    const disabledHarness = createSelectorHarness({
      savedExecutionContext: 'direct:conn_pg::postgres::pg1',
      directSourceReady: false
    })
    expect(disabledHarness.selector.executionContextValue.value).not.toBe(
      'direct:conn_pg::postgres::pg1'
    )
  })
})
