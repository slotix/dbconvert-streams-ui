import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useStreamWizard } from '@/composables/useStreamWizard'
import { useConnectionsStore } from '@/stores/connections'
import { useStreamsStore } from '@/stores/streamConfig'

function makeConnection(id: string, type: string, spec: Record<string, unknown>) {
  return {
    id,
    name: id,
    type,
    databasesInfo: [],
    spec
  }
}

describe('useStreamWizard manifest mode', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('allows proceeding on step 2 for an S3 source with manifestPath and no file selections', () => {
    const connectionsStore = useConnectionsStore()
    const streamsStore = useStreamsStore()

    connectionsStore.connections = [
      makeConnection('conn-s3', 's3', { s3: { region: 'us-east-1' } }),
      makeConnection('conn-target', 'files', { files: { basePath: '/tmp/out' } })
    ]

    streamsStore.currentStreamConfig = {
      id: 'stream-1',
      name: 'test',
      mode: 'convert',
      source: {
        connections: [
          {
            connectionId: 'conn-s3',
            s3: {
              bucket: 'data-bucket',
              manifestPath: 's3://data-bucket/manifests/orders.json'
            }
          }
        ]
      },
      target: { id: 'conn-target' },
      files: []
    }

    const wizard = useStreamWizard()
    wizard.setSourceConnections([
      {
        connectionId: 'conn-s3',
        s3: {
          bucket: 'data-bucket',
          manifestPath: 's3://data-bucket/manifests/orders.json'
        }
      }
    ])
    wizard.setTargetConnection('conn-target', '/tmp/out')
    wizard.goToStep(1)

    expect(wizard.canProceed.value).toBe(true)
  })
})
