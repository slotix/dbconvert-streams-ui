import { describe, expect, it } from 'vitest'
import { shallowMount } from '@vue/test-utils'
import { nextTick } from 'vue'
import QueryBuilder from '@/components/query/QueryBuilder.vue'

const filterBuilderStub = {
  name: 'FilterBuilder',
  template: '<div />',
  props: [
    'columns',
    'dialect',
    'tableName',
    'mode',
    'showColumnSelector',
    'initialSelectedColumns',
    'initialFilters',
    'initialSorts',
    'initialLimit'
  ]
}

function mountQueryBuilder() {
  return shallowMount(QueryBuilder, {
    props: {
      tableName: 'public.users',
      columns: [
        { name: 'id', type: 'int' },
        { name: 'email', type: 'text' },
        { name: 'created_at', type: 'timestamp' }
      ],
      initialSelectionState: {
        selectedColumns: ['id', 'email'],
        filters: [{ id: 'f-1', column: 'active', operator: '=', value: 'true' }],
        sorts: [{ column: 'created_at', direction: 'DESC' }],
        limit: 20
      }
    },
    global: {
      stubs: {
        FilterBuilder: filterBuilderStub,
        FilterBuilderShell: { template: '<div><slot /></div>' }
      },
      directives: {
        tooltip: () => {}
      }
    }
  })
}

describe('QueryBuilder selection state', () => {
  it('loads initial selection state into FilterBuilder props', async () => {
    const wrapper = mountQueryBuilder()
    await nextTick()

    const filterBuilder = wrapper.findComponent({ name: 'FilterBuilder' })
    expect(filterBuilder.props('initialSelectedColumns')).toEqual(['id', 'email'])
    expect(filterBuilder.props('initialFilters')).toEqual([
      { id: 'f-1', column: 'active', operator: '=', value: 'true' }
    ])
    expect(filterBuilder.props('initialSorts')).toEqual([
      { column: 'created_at', direction: 'DESC' }
    ])
    expect(filterBuilder.props('initialLimit')).toBe(20)
  })

  it('emits update:selectionState when the builder updates', async () => {
    const wrapper = mountQueryBuilder()

    wrapper.findComponent({ name: 'FilterBuilder' }).vm.$emit('update', {
      selectedColumns: ['id'],
      filters: [{ id: 'f-2', column: 'status', operator: 'IN', value: 'active' }],
      sorts: [{ column: 'id', direction: 'ASC' }],
      limit: 5,
      sql: 'SELECT id FROM public.users'
    })
    await nextTick()

    expect(wrapper.emitted('update:selectionState')).toEqual([
      [
        {
          selectedColumns: ['id'],
          filters: [{ id: 'f-2', column: 'status', operator: 'IN', value: 'active' }],
          sorts: [{ column: 'id', direction: 'ASC' }],
          limit: 5
        }
      ]
    ])
  })
})
