import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import SqlResultsPane from '@/components/database/sql-console/SqlResultsPane.vue'

function mountPane(overrides?: Record<string, unknown>) {
  return mount(SqlResultsPane, {
    props: {
      columns: [],
      rows: [],
      error: 'Federated mode requires alias-qualified tables',
      hasExecuted: true,
      currentPage: 1,
      pageSize: 100,
      ...overrides
    }
  })
}

describe('SqlResultsPane error action', () => {
  it('renders contextual action under error when label is provided', () => {
    const wrapper = mountPane({
      errorActionLabel: 'Rewrite starter SQL to federated naming'
    })

    expect(wrapper.text()).toContain('Rewrite starter SQL to federated naming')
  })

  it('emits error-action when contextual action is clicked', async () => {
    const wrapper = mountPane({
      errorActionLabel: 'Rewrite starter SQL to federated naming'
    })

    const button = wrapper.find('button')
    await button.trigger('click')

    expect(wrapper.emitted('error-action')).toHaveLength(1)
  })
})
