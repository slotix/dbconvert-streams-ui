import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import S3ManifestManagerPanel from '@/components/database/S3ManifestManagerPanel.vue'
import { useCommonStore } from '@/stores/common'

const apiMocks = vi.hoisted(() => ({
  createS3Manifest: vi.fn(),
  filterS3Manifest: vi.fn(),
  mergeS3Manifests: vi.fn(),
  readS3Manifest: vi.fn(),
  writeS3Manifest: vi.fn()
}))

vi.mock('@/api/files', () => ({
  createS3Manifest: apiMocks.createS3Manifest,
  filterS3Manifest: apiMocks.filterS3Manifest,
  mergeS3Manifests: apiMocks.mergeS3Manifests,
  readS3Manifest: apiMocks.readS3Manifest,
  writeS3Manifest: apiMocks.writeS3Manifest
}))

describe('S3ManifestManagerPanel', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    apiMocks.createS3Manifest.mockReset()
    apiMocks.filterS3Manifest.mockReset()
    apiMocks.mergeS3Manifests.mockReset()
    apiMocks.readS3Manifest.mockReset()
    apiMocks.writeS3Manifest.mockReset()

    const commonStore = useCommonStore()
    commonStore.showNotification = vi.fn()
  })

  function mountComponent(overrides: Record<string, unknown> = {}) {
    return mount(S3ManifestManagerPanel, {
      props: {
        connectionId: 'conn-s3',
        directoryPath: 's3://bucket/data/orders',
        fileEntries: [
          {
            name: 'orders-0001.parquet',
            path: 's3://bucket/data/orders/orders-0001.parquet',
            type: 'file'
          },
          {
            name: 'orders-0002.parquet',
            path: 's3://bucket/data/orders/orders-0002.parquet',
            type: 'file'
          },
          {
            name: 'orders-manifest.json',
            path: 's3://bucket/data/orders/orders-manifest.json',
            type: 'file'
          },
          {
            name: 'orders-extra.json',
            path: 's3://bucket/data/orders/orders-extra.json',
            type: 'file'
          }
        ],
        ...overrides
      }
    })
  }

  it('creates, filters, and saves a manifest from the current S3 context', async () => {
    apiMocks.createS3Manifest.mockResolvedValue({
      manifest: {
        version: '1.0',
        files: ['s3://bucket/data/orders/orders-0001.parquet'],
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
        files: ['s3://bucket/data/orders/orders-0001.parquet'],
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
        files: ['s3://bucket/data/orders/orders-0001.parquet'],
        metadata: {}
      },
      stats: {
        file_count: 1,
        s3_files: 1,
        local_files: 0,
        version: '1.0'
      },
      outputPath: 's3://bucket/data/orders/manifests/generated.json'
    })

    const wrapper = mountComponent()

    await wrapper.get('[data-test="context-object-checkbox"]').setValue(true)
    await wrapper.get('[data-test="context-create-manifest"]').trigger('click')
    await flushPromises()

    expect(apiMocks.createS3Manifest).toHaveBeenCalledWith({
      files: ['s3://bucket/data/orders/orders-0001.parquet'],
      metadata: undefined
    })

    const inputs = wrapper.findAll('input')
    const saveInput = inputs.find((input) => input.attributes('placeholder')?.includes('generated'))
    const filterInput = inputs.find(
      (input) => input.attributes('placeholder') === 'orders-*.parquet'
    )

    await filterInput?.setValue('orders-*.parquet')
    await wrapper.get('[data-test="context-filter-manifest"]').trigger('click')
    await flushPromises()

    expect(apiMocks.filterS3Manifest).toHaveBeenCalledWith({
      pattern: 'orders-*.parquet',
      manifest: {
        version: '1.0',
        files: ['s3://bucket/data/orders/orders-0001.parquet'],
        metadata: {}
      }
    })

    await saveInput?.setValue('s3://bucket/data/orders/manifests/generated.json')
    await wrapper.get('[data-test="context-save-manifest"]').trigger('click')
    await flushPromises()

    expect(apiMocks.writeS3Manifest).toHaveBeenCalledWith({
      connectionId: 'conn-s3',
      manifest: {
        version: '1.0',
        files: ['s3://bucket/data/orders/orders-0001.parquet'],
        metadata: {}
      },
      outputPath: 's3://bucket/data/orders/manifests/generated.json'
    })
  })

  it('loads a manifest from the current location and merges another manifest from the same context', async () => {
    apiMocks.readS3Manifest
      .mockResolvedValueOnce({
        manifest: {
          version: '1.0',
          files: ['s3://bucket/data/orders/orders-0001.parquet'],
          metadata: {}
        },
        stats: {
          file_count: 1,
          s3_files: 1,
          local_files: 0,
          version: '1.0'
        }
      })
      .mockResolvedValueOnce({
        manifest: {
          version: '1.0',
          files: ['s3://bucket/data/orders/orders-0002.parquet'],
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
        files: [
          's3://bucket/data/orders/orders-0001.parquet',
          's3://bucket/data/orders/orders-0002.parquet'
        ],
        metadata: {}
      },
      stats: {
        file_count: 2,
        s3_files: 2,
        local_files: 0,
        version: '1.0'
      }
    })

    const wrapper = mountComponent()

    await wrapper.get('[data-test="context-manifest-entry"]').trigger('click')
    await flushPromises()

    await wrapper.get('[data-test="context-merge-checkbox"]').setValue(true)
    await wrapper.get('[data-test="context-merge-manifests"]').trigger('click')
    await flushPromises()

    expect(apiMocks.readS3Manifest).toHaveBeenNthCalledWith(
      1,
      's3://bucket/data/orders/orders-manifest.json',
      'conn-s3'
    )
    expect(apiMocks.mergeS3Manifests).toHaveBeenCalledWith({
      manifests: [
        {
          version: '1.0',
          files: ['s3://bucket/data/orders/orders-0001.parquet'],
          metadata: {}
        },
        {
          version: '1.0',
          files: ['s3://bucket/data/orders/orders-0002.parquet'],
          metadata: {}
        }
      ],
      connectionId: 'conn-s3'
    })
  })

  it('derives context from the selected bucket path and uses that folder children', async () => {
    const wrapper = mountComponent({
      directoryPath: 's3://',
      selectedPath: 's3://bucket',
      fileEntries: [
        {
          name: 'bucket',
          path: 's3://bucket',
          type: 'dir',
          children: [
            {
              name: 'orders-manifest.json',
              path: 's3://bucket/orders-manifest.json',
              type: 'file'
            },
            {
              name: 'orders-0001.parquet',
              path: 's3://bucket/orders-0001.parquet',
              type: 'file'
            }
          ]
        }
      ]
    })

    expect(wrapper.text()).toContain('s3://bucket')
    expect(wrapper.text()).toContain('orders-manifest.json')
    expect(wrapper.text()).toContain('orders-0001.parquet')
  })
})
