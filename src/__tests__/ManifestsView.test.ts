import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { defineComponent } from 'vue'
import ManifestsView from '@/views/ManifestsView.vue'
import { useConnectionsStore } from '@/stores/connections'
import { useCommonStore } from '@/stores/common'

const apiMocks = vi.hoisted(() => ({
  listS3Buckets: vi.fn(),
  listS3Objects: vi.fn(),
  createS3Manifest: vi.fn(),
  filterS3Manifest: vi.fn(),
  mergeS3Manifests: vi.fn(),
  readS3Manifest: vi.fn(),
  writeS3Manifest: vi.fn()
}))

vi.mock('@/api/files', () => ({
  listS3Buckets: apiMocks.listS3Buckets,
  listS3Objects: apiMocks.listS3Objects,
  createS3Manifest: apiMocks.createS3Manifest,
  filterS3Manifest: apiMocks.filterS3Manifest,
  mergeS3Manifests: apiMocks.mergeS3Manifests,
  readS3Manifest: apiMocks.readS3Manifest,
  writeS3Manifest: apiMocks.writeS3Manifest
}))

const PickerStub = defineComponent({
  props: {
    isOpen: { type: Boolean, required: true }
  },
  emits: ['update:isOpen', 'select'],
  template: `
    <div v-if="isOpen">
      <button data-test="picker-select" @click="$emit('select', 's3://bucket/manifests/source.json')">
        pick
      </button>
    </div>
  `
})

describe('ManifestsView', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    apiMocks.listS3Buckets.mockReset()
    apiMocks.listS3Objects.mockReset()
    apiMocks.createS3Manifest.mockReset()
    apiMocks.filterS3Manifest.mockReset()
    apiMocks.mergeS3Manifests.mockReset()
    apiMocks.readS3Manifest.mockReset()
    apiMocks.writeS3Manifest.mockReset()

    apiMocks.listS3Buckets.mockResolvedValue({ buckets: ['bucket'], count: 1 })
    apiMocks.listS3Objects.mockResolvedValue({
      objects: [
        {
          key: 'data/orders-0001.parquet',
          size: 10,
          last_modified: '',
          etag: '',
          storage_class: ''
        }
      ],
      prefixes: [],
      bucket: 'bucket',
      prefix: '',
      count: 1,
      is_truncated: false,
      next_token: '',
      total_size: 10
    })

    const commonStore = useCommonStore()
    commonStore.showNotification = vi.fn()

    const connectionsStore = useConnectionsStore()
    connectionsStore.connections = [
      {
        id: 'conn-s3',
        name: 'Spaces',
        type: 's3',
        databasesInfo: [],
        spec: {
          s3: {
            region: 'nyc3',
            scope: {}
          }
        }
      }
    ]
  })

  it('creates, filters, and saves a manifest from selected S3 objects', async () => {
    apiMocks.createS3Manifest.mockResolvedValue({
      manifest: {
        version: '1.0',
        files: ['s3://bucket/data/orders-0001.parquet'],
        metadata: {}
      },
      stats: {
        file_count: 1,
        s3_files: 1,
        local_files: 0,
        version: '1.0'
      }
    })
    apiMocks.filterS3Manifest.mockResolvedValue({
      manifest: {
        version: '1.0',
        files: ['s3://bucket/data/orders-0001.parquet'],
        metadata: {}
      },
      stats: {
        file_count: 1,
        s3_files: 1,
        local_files: 0,
        version: '1.0'
      }
    })
    apiMocks.writeS3Manifest.mockResolvedValue({
      manifest: {
        version: '1.0',
        files: ['s3://bucket/data/orders-0001.parquet'],
        metadata: {}
      },
      stats: {
        file_count: 1,
        s3_files: 1,
        local_files: 0,
        version: '1.0'
      },
      outputPath: 's3://bucket/manifests/generated.json'
    })

    const wrapper = mount(ManifestsView, {
      global: {
        stubs: {
          S3ManifestPickerModal: PickerStub
        }
      }
    })

    await flushPromises()
    await wrapper.get('[data-test="load-objects"]').trigger('click')
    await flushPromises()
    await wrapper.get('[data-test="object-checkbox"]').setValue(true)
    await wrapper.get('[data-test="create-manifest"]').trigger('click')
    await flushPromises()

    expect(apiMocks.createS3Manifest).toHaveBeenCalledWith({
      files: ['s3://bucket/data/orders-0001.parquet'],
      metadata: undefined
    })

    const inputs = wrapper.findAll('input')
    const saveInput = inputs.find((input) => input.attributes('placeholder')?.includes('generated'))
    const filterInput = inputs.find(
      (input) => input.attributes('placeholder') === 'orders-*.parquet'
    )
    await filterInput?.setValue('orders-*.parquet')
    await wrapper.get('[data-test="filter-manifest"]').trigger('click')
    await flushPromises()

    expect(apiMocks.filterS3Manifest).toHaveBeenCalledWith({
      pattern: 'orders-*.parquet',
      manifest: {
        version: '1.0',
        files: ['s3://bucket/data/orders-0001.parquet'],
        metadata: {}
      }
    })

    await saveInput?.setValue('s3://bucket/manifests/generated.json')
    await wrapper.get('[data-test="save-manifest"]').trigger('click')
    await flushPromises()

    expect(apiMocks.writeS3Manifest).toHaveBeenCalledWith({
      connectionId: 'conn-s3',
      manifest: {
        version: '1.0',
        files: ['s3://bucket/data/orders-0001.parquet'],
        metadata: {}
      },
      outputPath: 's3://bucket/manifests/generated.json'
    })
  })

  it('loads merge sources from the picker and merges them into the current manifest', async () => {
    apiMocks.createS3Manifest.mockResolvedValue({
      manifest: {
        version: '1.0',
        files: ['s3://bucket/data/orders-0001.parquet'],
        metadata: {}
      },
      stats: {
        file_count: 1,
        s3_files: 1,
        local_files: 0,
        version: '1.0'
      }
    })
    apiMocks.readS3Manifest.mockResolvedValue({
      manifest: {
        version: '1.0',
        files: ['s3://bucket/data/orders-0002.parquet'],
        metadata: {}
      },
      stats: {
        file_count: 1,
        s3_files: 1,
        local_files: 0,
        version: '1.0'
      }
    })
    apiMocks.mergeS3Manifests.mockResolvedValue({
      manifest: {
        version: '1.0',
        files: ['s3://bucket/data/orders-0001.parquet', 's3://bucket/data/orders-0002.parquet'],
        metadata: {}
      },
      stats: {
        file_count: 2,
        s3_files: 2,
        local_files: 0,
        version: '1.0'
      }
    })

    const wrapper = mount(ManifestsView, {
      global: {
        stubs: {
          S3ManifestPickerModal: PickerStub
        }
      }
    })

    await flushPromises()
    await wrapper.get('[data-test="load-objects"]').trigger('click')
    await flushPromises()
    await wrapper.get('[data-test="object-checkbox"]').setValue(true)
    await wrapper.get('[data-test="create-manifest"]').trigger('click')
    await flushPromises()

    await wrapper.get('[data-test="open-merge-picker"]').trigger('click')
    await wrapper.get('[data-test="picker-select"]').trigger('click')
    await flushPromises()
    await wrapper.get('[data-test="merge-manifests"]').trigger('click')
    await flushPromises()

    expect(apiMocks.readS3Manifest).toHaveBeenCalledWith(
      's3://bucket/manifests/source.json',
      'conn-s3'
    )
    expect(apiMocks.mergeS3Manifests).toHaveBeenCalledWith({
      manifests: [
        {
          version: '1.0',
          files: ['s3://bucket/data/orders-0001.parquet'],
          metadata: {}
        },
        {
          version: '1.0',
          files: ['s3://bucket/data/orders-0002.parquet'],
          metadata: {}
        }
      ],
      connectionId: 'conn-s3'
    })
  })
})
