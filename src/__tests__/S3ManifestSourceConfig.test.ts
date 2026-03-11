import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import S3ManifestSourceConfig from '@/components/stream/wizard/S3ManifestSourceConfig.vue'
import { useStreamsStore } from '@/stores/streamConfig'

describe('S3ManifestSourceConfig', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  function seedStreamConfig(options?: {
    manifestPath?: string
    sourceMode?: 'selection' | 'manifest'
    prefixes?: string[]
    objects?: string[]
  }) {
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
              bucket: 'bucket',
              _sourceMode: options?.sourceMode,
              manifestPath: options?.manifestPath,
              prefixes: options?.prefixes,
              objects: options?.objects
            }
          }
        ]
      },
      target: { id: 'target-1' },
      files: []
    }
    return streamsStore
  }

  function mountComponent(options?: {
    manifestPath?: string
    sourceMode?: 'selection' | 'manifest'
    prefixes?: string[]
    objects?: string[]
    variant?: 'header' | 'panel'
  }) {
    const streamsStore = seedStreamConfig(options)
    const wrapper = mount(S3ManifestSourceConfig, {
      props: {
        connectionId: 'conn-s3',
        variant: options?.variant
      },
      global: {
        stubs: {
          S3ManifestBrowser: {
            props: ['connectionId', 'bucket', 'prefix', 'selectedPath'],
            template:
              '<div><p data-test="selected-manifest-path">{{ selectedPath }}</p><button data-test="stub-select-manifest" @click="$emit(\'select\', \'s3://bucket/manifests/orders.json\')">select</button></div>'
          }
        }
      }
    })

    return { wrapper, streamsStore }
  }

  it('defaults to folders/files mode when no manifest path is configured', () => {
    const { wrapper } = mountComponent({ variant: 'header' })

    expect(wrapper.text()).toContain('Files')
    expect(wrapper.text()).toContain('Manifest')
  })

  it('shows manifest details in panel mode when a manifest path is configured', () => {
    const { wrapper } = mountComponent({
      manifestPath: 's3://bucket/manifests/orders.json',
      variant: 'panel'
    })

    expect(wrapper.text()).toContain('Manifest source')
    expect(wrapper.get('[data-test="selected-manifest-path"]').text()).toContain(
      's3://bucket/manifests/orders.json'
    )
  })

  it('switches back to folders/files mode and clears manifestPath', async () => {
    const { wrapper, streamsStore } = mountComponent({
      sourceMode: 'manifest',
      manifestPath: 's3://bucket/manifests/orders.json',
      variant: 'header'
    })

    await wrapper.get('[data-test="s3-source-mode-selection"]').trigger('click')

    expect(streamsStore.currentStreamConfig?.source.connections?.[0].s3?._sourceMode).toBe(
      'selection'
    )
    expect(streamsStore.currentStreamConfig?.source.connections?.[0].s3?.manifestPath).toBe(
      undefined
    )
  })

  it('stores a selected manifest path and clears normal S3 selections', async () => {
    const { wrapper, streamsStore } = mountComponent({
      sourceMode: 'manifest',
      prefixes: ['exports/'],
      objects: ['standalone.parquet'],
      variant: 'panel'
    })

    await wrapper.get('[data-test="stub-select-manifest"]').trigger('click')

    expect(streamsStore.currentStreamConfig?.source.connections?.[0].s3).toMatchObject({
      bucket: 'bucket',
      _sourceMode: 'manifest',
      manifestPath: 's3://bucket/manifests/orders.json'
    })
    expect(streamsStore.currentStreamConfig?.source.connections?.[0].s3?.prefixes).toBeUndefined()
    expect(streamsStore.currentStreamConfig?.source.connections?.[0].s3?.objects).toBeUndefined()
  })

  it('clear manifest switches back to files mode', async () => {
    const { wrapper, streamsStore } = mountComponent({
      sourceMode: 'manifest',
      manifestPath: 's3://bucket/manifests/orders.json',
      variant: 'panel'
    })

    await wrapper.get('[data-test="clear-manifest"]').trigger('click')

    expect(streamsStore.currentStreamConfig?.source.connections?.[0].s3?._sourceMode).toBe(
      'selection'
    )
    expect(streamsStore.currentStreamConfig?.source.connections?.[0].s3?.manifestPath).toBe(
      undefined
    )
  })
})
