import { computed } from 'vue'
import { describe, expect, it } from 'vitest'
import type { ConnectionMapping } from '@/api/federated'
import { useConsoleQueryTemplates } from '@/composables/useConsoleQueryTemplates'
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

describe('useConsoleQueryTemplates', () => {
  it('returns federated templates in federated mode', () => {
    const connections = new Map<string, Connection>([
      [
        'pg-1',
        makeConnection('pg-1', 'postgresql', {
          database: { host: 'localhost', port: 5432, username: 'postgres' }
        })
      ]
    ])

    const { queryTemplates } = useConsoleQueryTemplates({
      mode: computed(() => 'database' as const),
      database: computed(() => 'postgres'),
      basePath: computed(() => undefined),
      connectionType: computed(() => undefined),
      currentDialect: computed(() => 'pgsql'),
      useFederatedEngine: computed(() => true),
      selectedConnections: computed<ConnectionMapping[]>(() => [
        { connectionId: 'pg-1', alias: 'pg1', database: 'postgres' }
      ]),
      activeQueryTab: computed(() => null),
      getConnectionById: (connectionId) => connections.get(connectionId) || null
    })

    expect(queryTemplates.value[0]?.name).toBe('List attached sources')
  })

  it('returns file templates with computed file prefix in file mode', () => {
    const connections = new Map<string, Connection>([
      ['file-1', makeConnection('file-1', 'files', { files: { basePath: '/tmp/files' } })]
    ])

    const { queryTemplates } = useConsoleQueryTemplates({
      mode: computed(() => 'file' as const),
      database: computed(() => undefined),
      basePath: computed(() => '/tmp/files'),
      connectionType: computed(() => 'files' as const),
      currentDialect: computed(() => 'sql'),
      useFederatedEngine: computed(() => false),
      selectedConnections: computed<ConnectionMapping[]>(() => [
        { connectionId: 'file-1', alias: 'files1', database: '/tmp/files' }
      ]),
      activeQueryTab: computed(() => ({
        id: 't1',
        name: 'Query 1',
        query: '',
        createdAt: 0,
        updatedAt: 0,
        fileContext: { path: '/tmp/files/orders.parquet' }
      })),
      getConnectionById: (connectionId) => connections.get(connectionId) || null
    })

    expect(queryTemplates.value[0]?.query).toContain("read_parquet('/tmp/files/*.parquet')")
  })

  it('returns database templates by dialect in direct mode', () => {
    const connections = new Map<string, Connection>([
      [
        'my-1',
        makeConnection('my-1', 'mysql', {
          database: { host: 'localhost', port: 3306, username: 'root' }
        })
      ]
    ])

    const { queryTemplates } = useConsoleQueryTemplates({
      mode: computed(() => 'database' as const),
      database: computed(() => 'sakila'),
      basePath: computed(() => undefined),
      connectionType: computed(() => undefined),
      currentDialect: computed(() => 'mysql'),
      useFederatedEngine: computed(() => false),
      selectedConnections: computed<ConnectionMapping[]>(() => [
        { connectionId: 'my-1', alias: 'my1', database: 'sakila' }
      ]),
      activeQueryTab: computed(() => null),
      getConnectionById: (connectionId) => connections.get(connectionId) || null
    })

    expect(queryTemplates.value.find((template) => template.name === 'List tables')?.query).toBe(
      'SHOW TABLES;'
    )
  })
})
