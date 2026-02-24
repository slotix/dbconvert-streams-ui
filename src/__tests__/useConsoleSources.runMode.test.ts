import { computed, nextTick } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useConsoleSources } from '@/composables/useConsoleSources'
vi.mock('@/stores/connections', () => {
  const connections = [
    {
      id: 'conn-my',
      name: 'MySQL',
      type: 'mysql',
      databasesInfo: [{ name: 'sakila', isSystem: false }],
      spec: {
        database: {
          host: 'localhost',
          port: 3306,
          username: 'root',
          database: 'sakila'
        }
      }
    },
    {
      id: 'conn-pg',
      name: 'PostgreSQL',
      type: 'postgresql',
      databasesInfo: [{ name: 'postgres', isSystem: false }],
      spec: {
        database: {
          host: 'localhost',
          port: 5432,
          username: 'postgres',
          database: 'postgres'
        }
      }
    }
  ]

  const store = {
    connections,
    connectionByID: (id: string) => connections.find((connection) => connection.id === id) || null
  }
  return {
    useConnectionsStore: () => store
  }
})

describe('useConsoleSources run mode transitions', () => {
  beforeEach(() => {
    window.localStorage.clear()
    vi.clearAllMocks()
  })

  it('auto-demotes federated mode to single when only one source remains', async () => {
    const harness = useConsoleSources({
      connectionId: computed(() => 'conn-my'),
      mode: computed(() => 'database' as const),
      database: computed(() => 'sakila'),
      consoleKey: computed(() => 'console-key')
    })

    harness.handleUpdateSelectedConnections([
      { connectionId: 'conn-my', alias: 'my1', database: 'sakila' },
      { connectionId: 'conn-pg', alias: 'pg1', database: 'postgres' }
    ])
    await nextTick()
    expect(harness.runMode.value).toBe('federated')

    harness.handleUpdateSelectedConnections([
      { connectionId: 'conn-my', alias: 'my1', database: 'sakila' }
    ])
    await nextTick()

    expect(harness.runMode.value).toBe('single')
  })

  it('auto-promotes to federated mode when sources grow from one to multiple', async () => {
    const harness = useConsoleSources({
      connectionId: computed(() => 'conn-my'),
      mode: computed(() => 'database' as const),
      database: computed(() => 'sakila'),
      consoleKey: computed(() => 'console-key-promote')
    })

    harness.handleUpdateSelectedConnections([
      { connectionId: 'conn-my', alias: 'my1', database: 'sakila' }
    ])
    await nextTick()
    expect(harness.runMode.value).toBe('single')

    harness.handleUpdateSelectedConnections([
      { connectionId: 'conn-my', alias: 'my1', database: 'sakila' },
      { connectionId: 'conn-pg', alias: 'pg1', database: 'postgres' }
    ])
    await nextTick()

    expect(harness.runMode.value).toBe('federated')
  })
})
