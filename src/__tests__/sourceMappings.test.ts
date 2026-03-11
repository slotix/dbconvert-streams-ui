import { describe, expect, it } from 'vitest'
import { mergeWizardConnectionsWithExisting } from '@/components/stream/wizard/sourceMappings'
import type { StreamConnectionMapping } from '@/types/streamConfig'

describe('mergeWizardConnectionsWithExisting', () => {
  it('preserves the current S3 selection state when wizard metadata is stale', () => {
    const wizardConnections: StreamConnectionMapping[] = [
      {
        connectionId: 'conn-s3',
        s3: {
          bucket: 'data-bucket',
          manifestPath: 's3://data-bucket/manifests/orders.json'
        }
      }
    ]

    const existingConnections: StreamConnectionMapping[] = [
      {
        connectionId: 'conn-s3',
        s3: {
          bucket: 'data-bucket',
          objects: ['exports/orders.csv']
        }
      }
    ]

    expect(mergeWizardConnectionsWithExisting(wizardConnections, existingConnections)).toEqual([
      {
        connectionId: 'conn-s3',
        database: undefined,
        schema: undefined,
        tables: undefined,
        queries: undefined,
        files: undefined,
        s3: {
          bucket: 'data-bucket',
          manifestPath: undefined,
          prefixes: undefined,
          objects: ['exports/orders.csv']
        }
      }
    ])
  })

  it('drops stale S3 selection state when the bucket changes in the wizard', () => {
    const wizardConnections: StreamConnectionMapping[] = [
      {
        connectionId: 'conn-s3',
        s3: {
          bucket: 'new-bucket'
        }
      }
    ]

    const existingConnections: StreamConnectionMapping[] = [
      {
        connectionId: 'conn-s3',
        s3: {
          bucket: 'old-bucket',
          manifestPath: 's3://old-bucket/manifests/orders.json'
        }
      }
    ]

    expect(mergeWizardConnectionsWithExisting(wizardConnections, existingConnections)).toEqual([
      {
        connectionId: 'conn-s3',
        database: undefined,
        schema: undefined,
        tables: undefined,
        queries: undefined,
        files: undefined,
        s3: {
          bucket: 'new-bucket',
          manifestPath: undefined,
          prefixes: undefined,
          objects: undefined
        }
      }
    ])
  })
})
