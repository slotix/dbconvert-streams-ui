import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { computed } from 'vue'
import ObjectList from '../components/database/tree/ObjectList.vue'
import { formatDataSize } from '../utils/formats'

const baseProvide = {
  treeSearchQuery: computed(() => ''),
  treeSelection: computed(() => ({})),
  treeShowTableSizes: computed(() => true)
}

const baseProps = {
  items: ['products'],
  objectType: 'table' as const,
  connectionId: 'conn-1',
  database: 'db1',
  explorerObjPrefix: 'conn-1:db1:public'
}

describe('ObjectList table sizes', () => {
  it('uses schema-qualified size when available', () => {
    const wrapper = mount(ObjectList, {
      props: {
        ...baseProps,
        schema: 'private',
        tableSizes: {
          products: 1024,
          'private.products': 2048
        }
      },
      global: {
        provide: baseProvide,
        stubs: {
          ObjectIcon: { template: '<span />' },
          HighlightedText: { props: ['text'], template: '<span>{{ text }}</span>' }
        }
      }
    })

    const sizeLabel = wrapper.find('span.text-xs').text()
    expect(sizeLabel).toBe(formatDataSize(2048, true))
  })

  it('falls back to unqualified size when schema-qualified key is missing', () => {
    const wrapper = mount(ObjectList, {
      props: {
        ...baseProps,
        schema: 'public',
        tableSizes: {
          products: 4096
        }
      },
      global: {
        provide: baseProvide,
        stubs: {
          ObjectIcon: { template: '<span />' },
          HighlightedText: { props: ['text'], template: '<span>{{ text }}</span>' }
        }
      }
    })

    const sizeLabel = wrapper.find('span.text-xs').text()
    expect(sizeLabel).toBe(formatDataSize(4096, true))
  })
})
