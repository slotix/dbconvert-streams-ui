import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import ManifestFileView from '@/components/files/ManifestFileView.vue'

const apiMocks = vi.hoisted(() => ({
  readS3Manifest: vi.fn()
}))

vi.mock('@/api/files', () => ({
  readS3Manifest: apiMocks.readS3Manifest
}))

describe('ManifestFileView', () => {
  beforeEach(() => {
    apiMocks.readS3Manifest.mockReset()
  })

  it('renders referenced files and stats for a manifest file', async () => {
    apiMocks.readS3Manifest.mockResolvedValue({
      manifest: {
        version: '1.0',
        files: [
          's3://bucket/exports/orders/part-0.parquet',
          's3://bucket/exports/orders/part-1.parquet'
        ],
        metadata: {
          total_size: 2048,
          created_at: '2026-03-11T10:00:00Z',
          stream_id: 'stream_123'
        }
      },
      stats: {
        file_count: 2,
        s3_files: 2,
        local_files: 0,
        version: '1.0',
        total_size_bytes: 2048,
        created_at: '2026-03-11T10:00:00Z'
      }
    })

    const wrapper = mount(ManifestFileView, {
      props: {
        entry: {
          name: 'manifest.json',
          path: 's3://bucket/exports/orders/manifest.json',
          type: 'file',
          size: 256
        },
        connectionId: 'conn-s3',
        mode: 'data'
      }
    })

    await flushPromises()

    expect(apiMocks.readS3Manifest).toHaveBeenCalledWith(
      's3://bucket/exports/orders/manifest.json',
      'conn-s3',
      undefined
    )
    expect(wrapper.text()).toContain('Manifest preview')
    expect(wrapper.text()).toContain('Referenced files')
    expect(wrapper.text()).toContain('s3://bucket/exports/orders/part-0.parquet')
    expect(wrapper.text()).toContain('2')
  })

  it('renders raw metadata in structure mode', async () => {
    apiMocks.readS3Manifest.mockResolvedValue({
      manifest: {
        version: '1.0',
        files: ['s3://bucket/exports/orders/part-0.parquet'],
        metadata: {
          total_size: 2048,
          labels: {
            env: 'qa'
          }
        }
      },
      stats: {
        file_count: 1,
        s3_files: 1,
        local_files: 0,
        version: '1.0'
      }
    })

    const wrapper = mount(ManifestFileView, {
      props: {
        entry: {
          name: 'manifest-20260311.json',
          path: 's3://bucket/manifests/manifest-20260311.json',
          type: 'file',
          size: 128
        },
        connectionId: 'conn-s3',
        mode: 'structure'
      }
    })

    await flushPromises()

    expect(wrapper.text()).toContain('Raw manifest')
    expect(wrapper.text()).toContain('total_size')
    expect(wrapper.text()).toContain('labels')
  })
})
