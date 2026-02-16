import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { buildStreamPayload } from '@/stores/streamConfig'
import { useConnectionsStore } from '@/stores/connections'
import type { Connection } from '@/types/connections'
import type { StreamConfig } from '@/types/streamConfig'

const baseTarget = { id: 'conn-target' }

function seedConnections(connections: Connection[]) {
  const store = useConnectionsStore()
  store.connections = connections
}

function makeConnection(id: string, type: string, spec: Connection['spec']): Connection {
  return {
    id,
    name: id,
    type,
    databasesInfo: [],
    spec
  }
}

describe('buildStreamPayload combinations', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('builds payload for a single database source with schema and tables', () => {
    seedConnections([
      makeConnection('conn-pg', 'postgresql', {
        database: { host: 'localhost', port: 5432, username: 'postgres', database: 'postgres' }
      })
    ])

    const stream: StreamConfig = {
      name: 'postgres_single_source',
      mode: 'convert',
      source: {
        connections: [
          {
            alias: 'pg1',
            connectionId: 'conn-pg',
            database: 'postgres',
            schema: 'public',
            tables: [{ name: 'customers' }]
          }
        ]
      },
      target: baseTarget
    }

    const payload = buildStreamPayload(stream)

    expect(payload.source?.connections).toEqual([
      {
        alias: 'pg1',
        connectionId: 'conn-pg',
        database: 'postgres',
        schema: 'public',
        tables: [{ name: 'customers' }]
      }
    ])
  })

  it('builds payload for a local file source using selected files', () => {
    seedConnections([
      makeConnection('conn-files', 'files', {
        files: { basePath: '/data/files' }
      })
    ])

    const stream: StreamConfig = {
      name: 'local_files_source',
      mode: 'convert',
      source: {
        connections: [{ alias: 'files1', connectionId: 'conn-files' }]
      },
      target: baseTarget,
      files: [
        { name: 'orders.csv', path: '/data/files/orders.csv', type: 'file', selected: true },
        { name: 'events.jsonl', path: '/data/files/events.jsonl', type: 'file', selected: true },
        { name: 'skip.csv', path: '/data/files/skip.csv', type: 'file', selected: false }
      ]
    }

    const payload = buildStreamPayload(stream)

    expect(payload.source?.connections?.[0]).toMatchObject({
      alias: 'files1',
      connectionId: 'conn-files',
      files: {
        basePath: '/data/files',
        paths: ['orders.csv', 'events.jsonl']
      }
    })
  })

  it('builds payload for a single S3 source using prefixes and objects', () => {
    seedConnections([
      makeConnection('conn-s3', 's3', {
        s3: { region: 'us-east-1' }
      })
    ])

    const stream: StreamConfig = {
      name: 's3_single_source',
      mode: 'convert',
      source: {
        connections: [
          {
            alias: 's3a',
            connectionId: 'conn-s3',
            s3: { bucket: 'data-bucket' }
          }
        ]
      },
      target: baseTarget,
      files: [
        { name: 'exports', path: 's3://data-bucket/exports/', type: 'dir', selected: true },
        {
          name: 'exports/part-0001.parquet',
          path: 's3://data-bucket/exports/part-0001.parquet',
          type: 'file',
          selected: true
        },
        {
          name: 'standalone.parquet',
          path: 's3://data-bucket/standalone.parquet',
          type: 'file',
          selected: true
        }
      ]
    }

    const payload = buildStreamPayload(stream)

    expect(payload.source?.connections?.[0].s3).toEqual({
      bucket: 'data-bucket',
      prefixes: ['exports/'],
      objects: ['standalone.parquet']
    })
  })

  it('builds payload for mixed sources with database tables and S3 selections', () => {
    seedConnections([
      makeConnection('conn-pg', 'postgresql', {
        database: { host: 'localhost', port: 5432, username: 'postgres', database: 'postgres' }
      }),
      makeConnection('conn-s3', 's3', {
        s3: { region: 'us-east-1' }
      })
    ])

    const stream: StreamConfig = {
      name: 'mixed_sources',
      mode: 'convert',
      source: {
        connections: [
          {
            alias: 'pg1',
            connectionId: 'conn-pg',
            database: 'postgres',
            schema: 'public',
            tables: [{ name: 'orders' }]
          },
          {
            alias: 's3a',
            connectionId: 'conn-s3',
            s3: { bucket: 'exports-bucket' }
          }
        ]
      },
      target: baseTarget,
      files: [
        { name: 'exports', path: 's3://exports-bucket/exports/', type: 'dir', selected: true },
        {
          name: 'standalone.jsonl',
          path: 's3://exports-bucket/standalone.jsonl',
          type: 'file',
          selected: true
        }
      ]
    }

    const payload = buildStreamPayload(stream)
    const connections = payload.source?.connections || []
    const dbConnection = connections.find((conn) => conn.alias === 'pg1')
    const s3Connection = connections.find((conn) => conn.alias === 's3a')

    expect(dbConnection).toMatchObject({
      alias: 'pg1',
      connectionId: 'conn-pg',
      database: 'postgres',
      schema: 'public',
      tables: [{ name: 'orders' }]
    })
    expect(s3Connection?.s3).toEqual({
      bucket: 'exports-bucket',
      prefixes: ['exports/'],
      objects: ['standalone.jsonl']
    })
  })

  it('builds payload for multi-source queries across connections', () => {
    seedConnections([
      makeConnection('conn-pg', 'postgresql', {
        database: { host: 'localhost', port: 5432, username: 'postgres', database: 'postgres' }
      }),
      makeConnection('conn-my', 'mysql', {
        database: { host: 'localhost', port: 3306, username: 'root', database: 'sakila' }
      })
    ])

    const query = `SELECT
  my1.sakila.film.title,
  my1.sakila.film.release_year,
  pg1.public.category.name AS category
FROM my1.sakila.film
JOIN my1.sakila.film_category fc ON my1.sakila.film.film_id = fc.film_id
JOIN pg1.public.category ON fc.category_id = pg1.public.category.category_id
LIMIT 20`

    const stream: StreamConfig = {
      name: 'multi_source_queries',
      mode: 'convert',
      source: {
        connections: [
          {
            alias: 'pg1',
            connectionId: 'conn-pg',
            database: 'postgres',
            queries: [
              {
                name: 'query_result_1',
                query,
                columns: [{ name: 'title', type: 'text' }],
                validated: true
              }
            ]
          },
          {
            alias: 'my1',
            connectionId: 'conn-my',
            database: 'sakila'
          }
        ]
      },
      target: baseTarget
    }

    const payload = buildStreamPayload(stream)
    const connections = payload.source?.connections || []
    const queryConnection = connections.find((conn) => conn.alias === 'pg1')
    const lookupConnection = connections.find((conn) => conn.alias === 'my1')

    expect(queryConnection?.queries).toEqual([{ name: 'query_result_1', query }])
    expect(lookupConnection).toMatchObject({
      alias: 'my1',
      connectionId: 'conn-my',
      database: 'sakila'
    })
  })
})
