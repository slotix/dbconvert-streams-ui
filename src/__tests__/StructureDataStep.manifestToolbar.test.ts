import { describe, it, expect, beforeEach } from 'vitest'
import { shallowMount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import StructureDataStep from '@/components/stream/wizard/steps/StructureDataStep.vue'
import { useStreamsStore } from '@/stores/streamConfig'
import { useConnectionsStore } from '@/stores/connections'

type TestSourceVariant =
  | 'single-s3-selection'
  | 'single-s3-manifest'
  | 'single-local-files'
  | 'mixed-s3-and-local-files'

function seedStores(variant: TestSourceVariant) {
  const streamsStore = useStreamsStore()
  const connectionsStore = useConnectionsStore()

  connectionsStore.connections =
    variant === 'single-local-files'
      ? [
          {
            id: 'conn-files',
            name: 'Local Files',
            type: 'files',
            databasesInfo: [],
            spec: {
              files: {
                basePath: '/tmp/imports'
              }
            }
          }
        ]
      : variant === 'mixed-s3-and-local-files'
        ? [
            {
              id: 'conn-s3',
              name: 'S3 Source',
              type: 's3',
              databasesInfo: [],
              spec: {
                s3: {
                  region: 'us-east-1',
                  scope: {}
                }
              }
            },
            {
              id: 'conn-files',
              name: 'Local Files',
              type: 'files',
              databasesInfo: [],
              spec: {
                files: {
                  basePath: '/tmp/imports'
                }
              }
            }
          ]
        : [
            {
              id: 'conn-s3',
              name: 'S3 Source',
              type: 's3',
              databasesInfo: [],
              spec: {
                s3: {
                  region: 'us-east-1',
                  scope: {}
                }
              }
            }
          ]
  streamsStore.currentStreamConfig = {
    id: 'stream-1',
    name: 'test',
    mode: 'convert',
    source: {
      connections:
        variant === 'single-local-files'
          ? [
              {
                connectionId: 'conn-files',
                alias: 'Files',
                files: {
                  basePath: '/tmp/imports'
                }
              }
            ]
          : variant === 'mixed-s3-and-local-files'
            ? [
                {
                  connectionId: 'conn-s3',
                  alias: 'S3',
                  s3: {
                    bucket: 'bucket'
                  }
                },
                {
                  connectionId: 'conn-files',
                  alias: 'Files',
                  files: {
                    basePath: '/tmp/imports'
                  }
                }
              ]
            : [
                {
                  connectionId: 'conn-s3',
                  alias: 'S3',
                  s3: {
                    bucket: 'bucket',
                    manifestPath:
                      variant === 'single-s3-manifest'
                        ? 's3://bucket/manifests/orders.json'
                        : undefined
                  }
                }
              ]
    },
    target: {
      id: 'target-1'
    },
    files: []
  }
}

function mountComponent() {
  return shallowMount(StructureDataStep, {
    global: {
      stubs: {
        ModeButtons: true,
        Operations: true,
        TableList: true,
        FilePreviewList: true,
        SourceSectionHeader: {
          template: '<div><slot name="actions" /><slot /></div>'
        },
        SourceHeaderActions: {
          template: '<div data-test="source-header-actions" />'
        },
        CustomQueryEditor: true,
        FormSelect: true,
        S3ManifestSourceConfig: {
          props: ['variant', 'connectionId'],
          template:
            '<div :data-test="`manifest-config-${variant}`">{{ connectionId }}-{{ variant }}</div>'
        },
        DataSelectionToolbar: {
          props: ['selectAllLabel', 'clearLabel'],
          template: '<div data-test="combined-toolbar">{{ selectAllLabel }}|{{ clearLabel }}</div>'
        }
      }
    }
  })
}

describe('StructureDataStep manifest toolbar visibility', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('hides the shared object toolbar for manifest-only S3 sources', () => {
    seedStores('single-s3-manifest')

    const wrapper = mountComponent()

    expect(wrapper.find('[data-test="combined-toolbar"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="manifest-config-header"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="manifest-config-panel"]').exists()).toBe(true)
  })

  it('shows the shared object toolbar for regular S3 file selection mode', () => {
    seedStores('single-s3-selection')

    const wrapper = mountComponent()

    expect(wrapper.find('[data-test="combined-toolbar"]').exists()).toBe(true)
    expect(wrapper.get('[data-test="combined-toolbar"]').text()).toContain('Select all|Clear')
    expect(wrapper.find('[data-test="manifest-config-header"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="manifest-config-panel"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="source-header-actions"]').exists()).toBe(true)
    expect(wrapper.html().indexOf('conn-s3-header')).toBeLessThan(
      wrapper.html().indexOf('data-test="combined-toolbar"')
    )
  })

  it('keeps local file sources on the old shared-toolbar path', () => {
    seedStores('single-local-files')

    const wrapper = mountComponent()

    expect(wrapper.find('[data-test="combined-toolbar"]').exists()).toBe(true)
    expect(wrapper.get('[data-test="combined-toolbar"]').text()).toContain('Select all|Clear')
    expect(wrapper.find('[data-test="manifest-config-header"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="manifest-config-panel"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="source-header-actions"]').exists()).toBe(true)
  })

  it('does not pin the S3 mode header above the toolbar when multiple file sources exist', () => {
    seedStores('mixed-s3-and-local-files')

    const wrapper = mountComponent()

    expect(wrapper.find('[data-test="combined-toolbar"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="manifest-config-header"]').exists()).toBe(true)
    expect(wrapper.findAll('[data-test="source-header-actions"]')).toHaveLength(2)
    expect(wrapper.html().indexOf('data-test="combined-toolbar"')).toBeLessThan(
      wrapper.html().indexOf('conn-s3-header')
    )
  })
})
