import { computed } from 'vue'
import { describe, expect, it } from 'vitest'
import type { ConnectionMapping } from '@/api/federated'
import { useConsoleLspContext } from '@/composables/useConsoleLspContext'
import type { Connection } from '@/types/connections'

function makeConnection(
  id: string,
  type: string,
  spec: Connection['spec'],
  databasesInfo: Connection['databasesInfo'] = []
): Connection {
  return {
    id,
    name: id,
    type,
    spec,
    databasesInfo
  }
}

describe('useConsoleLspContext', () => {
  it('builds duckdb file LSP context for single-source file mode', () => {
    const connections = new Map<string, Connection>([
      ['file-1', makeConnection('file-1', 'files', { files: { basePath: '/tmp' } })]
    ])

    const { sqlLspContext } = useConsoleLspContext({
      mode: computed(() => 'file' as const),
      connectionId: computed(() => 'file-1'),
      runMode: computed(() => 'single' as const),
      selectedConnections: computed<ConnectionMapping[]>(() => [
        { connectionId: 'file-1', alias: 'files1', database: '/tmp' }
      ]),
      singleSourceMapping: computed<ConnectionMapping | null>(() => ({
        connectionId: 'file-1',
        alias: 'files1',
        database: '/tmp'
      })),
      activeQueryTab: computed(() => ({
        id: 't1',
        name: 'Query 1',
        query: 'select 1',
        createdAt: 0,
        updatedAt: 0,
        fileContext: { path: '/tmp/a.csv', format: 'csv' }
      })),
      getConnectionById: (connectionId) => connections.get(connectionId) || null,
      getDirectSourceReadiness: () => ({ ready: true })
    })

    expect(sqlLspContext.value).toEqual({
      provider: 'duckdb',
      connectionId: 'file-1',
      filePath: '/tmp/a.csv',
      fileFormat: 'csv'
    })
  })

  it('excludes file connections from federated LSP mappings', () => {
    const connections = new Map<string, Connection>([
      [
        'db-1',
        makeConnection('db-1', 'postgresql', {
          database: { host: 'localhost', port: 5432, username: 'postgres' }
        })
      ],
      ['file-1', makeConnection('file-1', 'files', { files: { basePath: '/tmp' } })]
    ])

    const { sqlLspContext } = useConsoleLspContext({
      mode: computed(() => 'database' as const),
      connectionId: computed(() => 'db-1'),
      runMode: computed(() => 'federated' as const),
      selectedConnections: computed<ConnectionMapping[]>(() => [
        { connectionId: 'db-1', alias: 'pg1', database: 'postgres' },
        { connectionId: 'file-1', alias: 'files1', database: '/tmp' }
      ]),
      singleSourceMapping: computed(() => null),
      activeQueryTab: computed(() => null),
      getConnectionById: (connectionId) => connections.get(connectionId) || null,
      getDirectSourceReadiness: () => ({ ready: true })
    })

    expect(sqlLspContext.value).toEqual({
      provider: 'duckdb',
      federatedConnections: [{ connectionId: 'db-1', alias: 'pg1', database: 'postgres' }]
    })
  })

  it('returns undefined for direct sqls mode when source is not ready', () => {
    const connections = new Map<string, Connection>([
      [
        'db-1',
        makeConnection('db-1', 'postgresql', {
          database: { host: 'localhost', port: 5432, username: 'postgres' }
        })
      ]
    ])

    const { sqlLspContext } = useConsoleLspContext({
      mode: computed(() => 'database' as const),
      connectionId: computed(() => 'db-1'),
      runMode: computed(() => 'single' as const),
      selectedConnections: computed<ConnectionMapping[]>(() => [
        { connectionId: 'db-1', alias: 'pg1', database: '' }
      ]),
      singleSourceMapping: computed<ConnectionMapping | null>(() => ({
        connectionId: 'db-1',
        alias: 'pg1',
        database: ''
      })),
      activeQueryTab: computed(() => null),
      getConnectionById: (connectionId) => connections.get(connectionId) || null,
      getDirectSourceReadiness: () => ({ ready: false, reason: 'missing-database' })
    })

    expect(sqlLspContext.value).toBeUndefined()
  })

  it('allows direct duckdb LSP context without database selection', () => {
    const connections = new Map<string, Connection>([
      [
        'duck-1',
        makeConnection('duck-1', 'duckdb', {
          database: { host: 'localhost', port: 5432, username: 'duck' }
        })
      ]
    ])

    const { sqlLspContext } = useConsoleLspContext({
      mode: computed(() => 'database' as const),
      connectionId: computed(() => 'duck-1'),
      runMode: computed(() => 'single' as const),
      selectedConnections: computed<ConnectionMapping[]>(() => [
        { connectionId: 'duck-1', alias: 'db1' }
      ]),
      singleSourceMapping: computed<ConnectionMapping | null>(() => ({
        connectionId: 'duck-1',
        alias: 'db1'
      })),
      activeQueryTab: computed(() => null),
      getConnectionById: (connectionId) => connections.get(connectionId) || null,
      getDirectSourceReadiness: () => ({ ready: false, reason: 'missing-database' })
    })

    expect(sqlLspContext.value).toEqual({
      provider: 'duckdb',
      connectionId: 'duck-1',
      database: undefined
    })
  })
})
