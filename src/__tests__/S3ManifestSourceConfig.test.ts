import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { defineComponent } from 'vue'
import S3ManifestSourceConfig from '@/components/stream/wizard/S3ManifestSourceConfig.vue'
import { useStreamsStore } from '@/stores/streamConfig'

const apiMocks = vi.hoisted(() => ({
  readS3Manifest: vi.fn(),
  validateS3Path: vi.fn()
}))

vi.mock('@/api/files', () => ({
  readS3Manifest: apiMocks.readS3Manifest,
  validateS3Path: apiMocks.validateS3Path
}))

const PickerStub = defineComponent({
  props: {
    isOpen: { type: Boolean, required: true }
  },
  emits: ['update:isOpen', 'select'],
  template: `
    <div v-if="isOpen">
      <button data-test="pick-manifest" @click="$emit('select', 's3://bucket/manifests/orders.json')">
        pick
      </button>
    </div>
  `
})

describe('S3ManifestSourceConfig', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    apiMocks.readS3Manifest.mockReset()
    apiMocks.validateS3Path.mockReset()
    apiMocks.validateS3Path.mockResolvedValue({
      valid: true,
      recommendedMode: 'manifest',
      reason: 'manifest',
      isHivePartitioned: false,
      warnings: []
    })
  })

  function mountComponent() {
    const streamsStore = useStreamsStore()
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

    const wrapper = mount(S3ManifestSourceConfig, {
      props: {
        connectionId: 'conn-s3'
      },
      global: {
        stubs: {
          S3ManifestPickerModal: PickerStub
        }
      }
    })

    return { wrapper, streamsStore }
  }

  it('autofills manifest path from picker and clears validation errors for S3-only manifests', async () => {
    apiMocks.readS3Manifest.mockResolvedValue({
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

    const { wrapper, streamsStore } = mountComponent()

    await wrapper.get('button').trigger('click')
    await wrapper.get('[data-test="pick-manifest"]').trigger('click')
    await flushPromises()

    expect(streamsStore.currentStreamConfig?.source?.connections?.[0]?.s3?.manifestPath).toBe(
      's3://bucket/manifests/orders.json'
    )
    expect(streamsStore.getManifestValidationError('conn-s3')).toBeNull()
    expect(apiMocks.readS3Manifest).toHaveBeenCalledWith(
      's3://bucket/manifests/orders.json',
      'conn-s3'
    )
  })

  it('blocks manifests with local entries for S3 sources', async () => {
    apiMocks.readS3Manifest.mockResolvedValue({
      manifest: {
        version: '1.0',
        files: ['/tmp/orders.parquet'],
        metadata: {}
      },
      stats: {
        file_count: 1,
        s3_files: 0,
        local_files: 1,
        version: '1.0'
      }
    })

    const { wrapper, streamsStore } = mountComponent()

    await wrapper.get('button').trigger('click')
    await wrapper.get('[data-test="pick-manifest"]').trigger('click')
    await flushPromises()

    expect(streamsStore.getManifestValidationError('conn-s3')).toContain('all s3:// URIs')
    expect(wrapper.text()).toContain('all s3:// URIs')
  })
})
