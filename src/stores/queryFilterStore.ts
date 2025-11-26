/**
 * Query Filter Store
 *
 * Central state management for query filters and sorting.
 *
 * SIMPLIFIED: Query Filter Panel is the single source of truth.
 * This store is now primarily for state persistence and sharing
 * filter state between components if needed.
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

// Types
export interface FilterCondition {
  id: string
  column: string
  operator: string
  value: string
}

export interface SortColumn {
  column: string
  direction: 'ASC' | 'DESC'
}

export interface QueryFilterState {
  filters: FilterCondition[]
  sorts: SortColumn[]
}

// Operators
const UNARY_OPERATORS = ['IS NULL', 'IS NOT NULL']

// Helper to generate unique IDs
let filterId = 0
const generateFilterId = () => `filter-${++filterId}`

export const useQueryFilterStore = defineStore('queryFilter', () => {
  // State per object key (table/view/file)
  const stateMap = ref<Map<string, QueryFilterState>>(new Map())

  // Current active object key
  const activeObjectKey = ref<string>('')

  // Get or create state for an object
  function getState(objectKey: string): QueryFilterState {
    if (!stateMap.value.has(objectKey)) {
      stateMap.value.set(objectKey, {
        filters: [],
        sorts: []
      })
    }
    return stateMap.value.get(objectKey)!
  }

  // Current state (for active object)
  const currentState = computed(() => {
    if (!activeObjectKey.value) return null
    return getState(activeObjectKey.value)
  })

  // Current filters
  const filters = computed(() => currentState.value?.filters ?? [])

  // Current sorts
  const sorts = computed(() => currentState.value?.sorts ?? [])

  // Set active object
  function setActiveObject(objectKey: string) {
    activeObjectKey.value = objectKey
  }

  // ============================================
  // Filter/Sort Actions
  // ============================================

  function setFilters(objectKey: string, newFilters: FilterCondition[]) {
    const state = getState(objectKey)
    state.filters = newFilters.map((f) => ({
      ...f,
      id: f.id || generateFilterId()
    }))
  }

  function setSorts(objectKey: string, newSorts: SortColumn[]) {
    const state = getState(objectKey)
    state.sorts = [...newSorts]
  }

  function addFilter(objectKey: string, filter?: Partial<FilterCondition>) {
    const state = getState(objectKey)
    state.filters.push({
      id: generateFilterId(),
      column: filter?.column ?? '',
      operator: filter?.operator ?? '=',
      value: filter?.value ?? ''
    })
  }

  function updateFilter(objectKey: string, filterId: string, updates: Partial<FilterCondition>) {
    const state = getState(objectKey)
    const filter = state.filters.find((f) => f.id === filterId)
    if (filter) {
      Object.assign(filter, updates)
    }
  }

  function removeFilter(objectKey: string, filterId: string) {
    const state = getState(objectKey)
    const index = state.filters.findIndex((f) => f.id === filterId)
    if (index !== -1) {
      state.filters.splice(index, 1)
    }
  }

  function addSort(objectKey: string, sort?: Partial<SortColumn>) {
    const state = getState(objectKey)
    state.sorts.push({
      column: sort?.column ?? '',
      direction: sort?.direction ?? 'ASC'
    })
  }

  function updateSort(objectKey: string, index: number, updates: Partial<SortColumn>) {
    const state = getState(objectKey)
    if (state.sorts[index]) {
      Object.assign(state.sorts[index], updates)
    }
  }

  function removeSort(objectKey: string, index: number) {
    const state = getState(objectKey)
    if (index >= 0 && index < state.sorts.length) {
      state.sorts.splice(index, 1)
    }
  }

  // ============================================
  // Query Building (Output)
  // ============================================

  function buildWhereClause(
    objectKey: string,
    quoted = false,
    dialect: 'mysql' | 'pgsql' | 'sql' = 'mysql'
  ): string {
    const state = getState(objectKey)
    const quoteId = (name: string) => {
      if (!quoted) return name
      if (dialect === 'mysql') return `\`${name}\``
      if (dialect === 'pgsql') return `"${name}"`
      return name
    }

    const conditions = state.filters
      .filter((f) => f.column && (UNARY_OPERATORS.includes(f.operator) || f.value))
      .map((f) => {
        const col = quoteId(f.column)

        if (f.operator === 'IS NULL' || f.operator === 'IS NOT NULL') {
          return `${col} ${f.operator}`
        }
        if (f.operator === 'LIKE' || f.operator === 'NOT LIKE') {
          return `${col} ${f.operator} '${f.value}'`
        }
        if (f.operator === 'IN' || f.operator === 'NOT IN') {
          const values = f.value
            .split(',')
            .map((v) => v.trim())
            .filter((v) => v)
            .map((v) => (isNaN(Number(v)) ? `'${v}'` : v))
            .join(', ')
          return `${col} ${f.operator} (${values})`
        }
        const val = isNaN(Number(f.value)) ? `'${f.value}'` : f.value
        return `${col} ${f.operator} ${val}`
      })

    return conditions.join(' AND ')
  }

  function buildOrderByColumns(objectKey: string): string {
    const state = getState(objectKey)
    return state.sorts
      .filter((s) => s.column)
      .map((s) => s.column)
      .join(',')
  }

  function buildOrderByDirections(objectKey: string): string {
    const state = getState(objectKey)
    return state.sorts
      .filter((s) => s.column)
      .map((s) => s.direction)
      .join(',')
  }

  function buildFullSql(
    objectKey: string,
    tableName: string,
    dialect: 'mysql' | 'pgsql' | 'sql' = 'mysql'
  ): string {
    const quoteId = (name: string) => {
      if (dialect === 'mysql') return `\`${name}\``
      if (dialect === 'pgsql') return `"${name}"`
      return name
    }

    const parts: string[] = []

    // SELECT * FROM table
    parts.push(`SELECT * FROM ${quoteId(tableName)}`)

    // WHERE
    const where = buildWhereClause(objectKey, true, dialect)
    if (where) {
      parts.push(`WHERE ${where}`)
    }

    // ORDER BY
    const state = getState(objectKey)
    const sortClauses = state.sorts
      .filter((s) => s.column)
      .map((s) => `${quoteId(s.column)} ${s.direction}`)

    if (sortClauses.length > 0) {
      parts.push(`ORDER BY ${sortClauses.join(', ')}`)
    }

    return parts.join(' ')
  }

  // ============================================
  // Utility
  // ============================================

  function clearAll(objectKey: string) {
    const state = getState(objectKey)
    state.filters = []
    state.sorts = []
  }

  function hasFilters(objectKey: string): boolean {
    const state = getState(objectKey)
    return state.filters.some((f) => f.column && (UNARY_OPERATORS.includes(f.operator) || f.value))
  }

  function hasSorts(objectKey: string): boolean {
    const state = getState(objectKey)
    return state.sorts.some((s) => s.column)
  }

  return {
    // State
    activeObjectKey,
    currentState,
    filters,
    sorts,
    stateMap,

    // Setup
    setActiveObject,
    getState,

    // Filter/Sort Actions
    setFilters,
    setSorts,
    addFilter,
    updateFilter,
    removeFilter,
    addSort,
    updateSort,
    removeSort,

    // Query Building
    buildWhereClause,
    buildOrderByColumns,
    buildOrderByDirections,
    buildFullSql,

    // Utility
    clearAll,
    hasFilters,
    hasSorts
  }
})
