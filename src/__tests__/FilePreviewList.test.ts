import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import FilePreviewList from '@/components/stream/wizard/FilePreviewList.vue'
import { useConnectionsStore } from '@/stores/connections'
import { useFileExplorerStore } from '@/stores/fileExplorer'
import { useStreamsStore } from '@/stores/streamConfig'

describe('FilePreviewList', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('hides manifest metadata files from normal S3 source selection', () => {
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
              bucket: 'bucket'
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
    expect(wrapper.text()).not.toContain('manifest.json')
    expect(wrapper.text()).toContain('part-0001.parquet')
    expect(checkboxes).toHaveLength(1)
    expect(checkboxes[0].attributes('disabled')).toBeUndefined()
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
              bucket: 'bucket'
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

  it('keeps the tree in loading state during initial edit-mode hydration without duplicate folder loads', async () => {
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
              bucket: 'bucket'
            }
          }
        ]
      },
      target: { id: 'target-1' },
      files: [
        {
          name: 'actor.parquet',
          connectionId: 'conn-s3',
          path: 's3://bucket/e2e/actor.parquet',
          type: 'file',
          selected: true
        }
      ]
    }

    fileExplorerStore.$patch({
      entriesByConnection: {
        'conn-s3': [
          {
            name: 'e2e',
            path: 's3://bucket/e2e/',
            type: 'dir',
            children: [],
            isLoaded: false
          }
        ]
      },
      directoryPathsByConnection: {
        'conn-s3': 's3://bucket/'
      }
    } as never)

    let resolveLoad: () => void = () => undefined
    const loadEntriesSpy = vi.spyOn(fileExplorerStore, 'loadEntries').mockResolvedValue(undefined)
    const loadFolderSpy = vi.spyOn(fileExplorerStore, 'loadFolderContents').mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveLoad = resolve
        })
    )

    const wrapper = mount(FilePreviewList, {
      props: {
        connectionId: 'conn-s3',
        showToolbar: false
      }
    })

    await nextTick()

    expect(loadEntriesSpy).toHaveBeenCalled()
    expect(loadFolderSpy).toHaveBeenCalledTimes(1)
    expect(loadFolderSpy).toHaveBeenCalledWith('conn-s3', 's3://bucket/e2e/')
    expect(wrapper.text()).toContain('Loading files')

    fileExplorerStore.entriesByConnection['conn-s3'] = [
      {
        name: 'e2e',
        path: 's3://bucket/e2e/',
        type: 'dir',
        children: [],
        isLoaded: false
      }
    ]

    await nextTick()

    expect(loadFolderSpy).toHaveBeenCalledTimes(1)

    resolveLoad()
    await Promise.resolve()
    await nextTick()
  })
})
