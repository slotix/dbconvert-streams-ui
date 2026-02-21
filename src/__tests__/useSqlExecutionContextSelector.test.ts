import { computed, ref } from 'vue'
import { describe, expect, it } from 'vitest'
import type { ConnectionMapping } from '@/api/federated'
import { useSqlExecutionContextSelector } from '@/composables/useSqlExecutionContextSelector'

function createSelectorHarness(options?: {
  mode?: 'database' | 'file'
  runMode?: 'single' | 'federated'
  selectedConnections?: ConnectionMapping[]
  databaseSourceMappings?: ConnectionMapping[]
}) {
  const mode = ref<'database' | 'file'>(options?.mode || 'database')
  const runMode = ref<'single' | 'federated'>(options?.runMode || 'federated')

  const selectedConnections = ref<ConnectionMapping[]>(
    options?.selectedConnections || [
      { connectionId: 'conn_pg', alias: 'pg1', database: 'postgres' },
      { connectionId: 'conn_files', alias: 'files1' }
    ]
  )

  const databaseSourceMappings = computed(
    () =>
      options?.databaseSourceMappings ||
      selectedConnections.value.filter((mapping) => Boolean(mapping.database))
  )

  const selector = useSqlExecutionContextSelector({
    mode,
    runMode,
    selectedConnections,
    databaseSourceMappings,
    isDatabaseMapping: (mapping) => mapping.connectionId !== 'conn_files',
    getDatabaseTypeDisplay: () => 'PostgreSQL',
    getConnectionName: () => 'test-conn'
  })

  return {
    selector
  }
}

describe('useSqlExecutionContextSelector', () => {
  it('shows multi-source execution label in federated mode', () => {
    const { selector } = createSelectorHarness({ runMode: 'federated' })

    expect(selector.singleExecutionLabel.value).toBe('Executing: Multi-source')
  })

  it('shows database execution label in single mode', () => {
    const { selector } = createSelectorHarness({
      runMode: 'single',
      selectedConnections: [{ connectionId: 'conn_pg', alias: 'pg1', database: 'postgres' }]
    })

    expect(selector.singleExecutionLabel.value).toBe('Executing: Database: test-conn (PostgreSQL)')
  })

  it('shows file execution label in single file mode', () => {
    const { selector } = createSelectorHarness({
      mode: 'file',
      runMode: 'single',
      selectedConnections: [{ connectionId: 'conn_files', alias: 'files1' }],
      databaseSourceMappings: []
    })

    expect(selector.singleExecutionLabel.value).toBe('Executing: Files: test-conn')
  })
})
