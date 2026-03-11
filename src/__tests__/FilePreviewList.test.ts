import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import FilePreviewList from '@/components/stream/wizard/FilePreviewList.vue'
import { useConnectionsStore } from '@/stores/connections'
import { useFileExplorerStore } from '@/stores/fileExplorer'
import { useStreamsStore } from '@/stores/streamConfig'

describe('FilePreviewList', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('keeps manifest metadata files out of normal S3 source selection', () => {
    const connectionsStore = useConnectionsStore()
    const fileExplorerStore = useFileExplorerStore()
    const streamsStore = useStreamsStore()

    connectionsStore.connections = [
      {
        id: 'conn-s3',
        name: 'S3',
        type: 's3',
        databasesInfo: [],
        spec: {
          s3: {
            region: 'us-east-1'
          }
        }
      }
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
              bucket: 'bucket',
              _sourceMode: 'selection'
            }
          }
        ]
      },
      target: { id: 'target-1' },
      files: []
    }

    fileExplorerStore.$patch({
      entriesByConnection: {
        'conn-s3': [
          {
            name: 'manifest.json',
            path: 's3://bucket/exports/manifest.json',
            type: 'file'
          },
          {
            name: 'part-0001.parquet',
            path: 's3://bucket/exports/part-0001.parquet',
            type: 'file'
          }
        ]
      }
    } as never)

    vi.spyOn(fileExplorerStore, 'loadEntries').mockResolvedValue(undefined)

    const wrapper = mount(FilePreviewList, {
      props: {
        connectionId: 'conn-s3',
        showToolbar: false
      }
    })

    const checkboxes = wrapper.findAll('input[type="checkbox"]')
    expect(checkboxes).toHaveLength(2)
    expect(checkboxes[0].attributes('disabled')).toBeDefined()
    expect(checkboxes[1].attributes('disabled')).toBeUndefined()
  })

  it('renders a load more action when the current S3 level is truncated', async () => {
    const connectionsStore = useConnectionsStore()
    const fileExplorerStore = useFileExplorerStore()
    const streamsStore = useStreamsStore()

    connectionsStore.connections = [
      {
        id: 'conn-s3',
        name: 'S3',
        type: 's3',
        databasesInfo: [],
        spec: {
          s3: {
            region: 'us-east-1'
          }
        }
      }
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
              bucket: 'bucket',
              _sourceMode: 'selection'
            }
          }
        ]
      },
      target: { id: 'target-1' },
      files: []
    }

    fileExplorerStore.$patch({
      entriesByConnection: {
        'conn-s3': [
          {
            name: 'alpha',
            path: 's3://bucket/data/alpha/',
            type: 'dir',
            children: [],
            isLoaded: false
          }
        ]
      },
      directoryPathsByConnection: {
        'conn-s3': 's3://bucket/data/'
      },
      folderPagesByConnection: {
        'conn-s3': {
          's3://bucket/data/': {
            nextToken: 'page-2',
            isTruncated: true
          }
        }
      }
    } as never)

    vi.spyOn(fileExplorerStore, 'loadEntries').mockResolvedValue(undefined)

    const wrapper = mount(FilePreviewList, {
      props: {
        connectionId: 'conn-s3',
        showToolbar: false,
        embedded: true
      }
    })

    expect(wrapper.text()).toContain('Load more')
  })
})
