import { mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { afterEach, describe, expect, it } from 'vitest'
import ExplorerGroupedConnectionFilter from '@/components/database/ExplorerGroupedConnectionFilter.vue'

function mountFilter(selectedTypes: string[] = []) {
  return mount(ExplorerGroupedConnectionFilter, {
    attachTo: document.body,
    props: {
      selectedTypes
    },
    global: {
      plugins: [createPinia()],
      stubs: {
        teleport: true
      }
    }
  })
}

async function syncSelectedTypes(wrapper: ReturnType<typeof mount>, selectedTypes?: string[]) {
  const nextValue =
    selectedTypes ||
    (wrapper.emitted('update:selectedTypes')?.at(-1)?.[0] as string[] | undefined) ||
    []
  await wrapper.setProps({ selectedTypes: nextValue })
  return nextValue
}

describe('ExplorerGroupedConnectionFilter', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('shows All as active when no filters are selected', () => {
    const wrapper = mountFilter()

    expect(wrapper.get('[data-testid="explorer-filter-chip-all"]').attributes('aria-pressed')).toBe(
      'true'
    )
    expect(
      wrapper.get('[data-testid="explorer-filter-chip-database"]').attributes('aria-pressed')
    ).toBe('false')
    expect(
      wrapper.get('[data-testid="explorer-filter-chip-file"]').attributes('aria-pressed')
    ).toBe('false')
  })

  it('shows a compact database count and emits the selected leaf types', async () => {
    const wrapper = mountFilter()

    await wrapper.get('[data-testid="explorer-filter-chip-database"]').trigger('click')
    await wrapper.get('[data-testid="explorer-filter-option-MySQL"]').trigger('click')
    let selectedTypes = await syncSelectedTypes(wrapper)
    expect(selectedTypes).toEqual(['MySQL'])

    await wrapper.get('[data-testid="explorer-filter-option-PostgreSQL"]').trigger('click')
    selectedTypes = await syncSelectedTypes(wrapper)

    expect(selectedTypes).toEqual(['MySQL', 'PostgreSQL'])
    expect(wrapper.get('[data-testid="explorer-filter-chip-database"]').text()).toContain(
      'Databases (2)'
    )
    expect(wrapper.get('[data-testid="explorer-filter-chip-database"]').attributes('title')).toBe(
      'Databases: MySQL, PostgreSQL'
    )
  })

  it('shows a storage count when a storage type is selected', () => {
    const wrapper = mountFilter(['Files'])

    expect(wrapper.get('[data-testid="explorer-filter-chip-file"]').text()).toContain('Storage (1)')
    expect(wrapper.get('[data-testid="explorer-filter-chip-file"]').attributes('title')).toBe(
      'Storage: Files'
    )
  })

  it('clears only the active group when the chip clear button is pressed', async () => {
    const wrapper = mountFilter(['MySQL', 'PostgreSQL', 'S3'])

    await wrapper.get('[data-testid="explorer-filter-clear-database"]').trigger('click')
    const selectedTypes = wrapper.emitted('update:selectedTypes')?.at(-1)?.[0] as string[]

    expect(selectedTypes).toEqual(['S3'])
  })

  it('selects all types in the open group and keeps the other group', async () => {
    const wrapper = mountFilter(['S3'])

    await wrapper.get('[data-testid="explorer-filter-chip-database"]').trigger('click')
    await wrapper.get('[data-testid="explorer-filter-action-toggle-all"]').trigger('click')
    const selectedTypes = await syncSelectedTypes(wrapper)

    expect(selectedTypes).toEqual(['PostgreSQL', 'MySQL', 'S3'])
  })

  it('deselects all selectable types in the open group when all are already selected', async () => {
    const wrapper = mountFilter(['PostgreSQL', 'MySQL', 'S3'])

    await wrapper.get('[data-testid="explorer-filter-chip-database"]').trigger('click')
    expect(wrapper.get('[data-testid="explorer-filter-action-toggle-all"]').text()).toBe(
      'Deselect all'
    )
    await wrapper.get('[data-testid="explorer-filter-action-toggle-all"]').trigger('click')
    let selectedTypes = await syncSelectedTypes(wrapper)

    expect(selectedTypes).toEqual(['S3'])
  })

  it('shows Snowflake as coming soon and does not allow selecting it', async () => {
    const wrapper = mountFilter()

    await wrapper.get('[data-testid="explorer-filter-chip-database"]').trigger('click')

    expect(wrapper.get('[data-testid="explorer-filter-option-Snowflake"]').text()).toContain(
      'Coming soon'
    )

    await wrapper.get('[data-testid="explorer-filter-option-Snowflake"]').trigger('click')

    expect(wrapper.emitted('update:selectedTypes')).toBeUndefined()
  })

  it('clears every selection when All is clicked', async () => {
    const wrapper = mountFilter(['MySQL', 'S3'])

    await wrapper.get('[data-testid="explorer-filter-chip-all"]').trigger('click')

    expect(wrapper.emitted('update:selectedTypes')?.at(-1)?.[0]).toEqual([])
  })

  it('closes the dropdown on outside click and Escape without mutating selection', async () => {
    const wrapper = mountFilter(['MySQL'])

    await wrapper.get('[data-testid="explorer-filter-chip-database"]').trigger('click')
    expect(wrapper.find('[data-testid="explorer-filter-dropdown"]').exists()).toBe(true)

    document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await wrapper.vm.$nextTick()
    expect(wrapper.find('[data-testid="explorer-filter-dropdown"]').exists()).toBe(false)
    expect(wrapper.emitted('update:selectedTypes')).toBeUndefined()

    await wrapper.get('[data-testid="explorer-filter-chip-file"]').trigger('click')
    expect(wrapper.find('[data-testid="explorer-filter-dropdown"]').exists()).toBe(true)

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    await wrapper.vm.$nextTick()
    expect(wrapper.find('[data-testid="explorer-filter-dropdown"]').exists()).toBe(false)
    expect(wrapper.emitted('update:selectedTypes')).toBeUndefined()
  })
})
