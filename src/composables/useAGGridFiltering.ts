/**
 * Composable for shared AG Grid filtering state and logic
 * Used by both database table views and file data views
 */

import { ref, computed, type Ref, type ComputedRef } from 'vue'
import type { GridApi, SortModelItem, Column } from 'ag-grid-community'
import { convertFilterModelToSQL } from '@/utils/agGridFilterUtils'

const SQL_BANNER_MAX_LENGTH = 150

interface UseAGGridFilteringOptions {
  sqlBannerMaxLength?: number
}

/**
 * Shared AG Grid filtering state and computed properties
 * Manages filter conversion, SQL query generation, and filter UI state
 */
export function useAGGridFiltering(options: UseAGGridFilteringOptions = {}) {
  const sqlBannerMaxLength = options.sqlBannerMaxLength || SQL_BANNER_MAX_LENGTH

  // Reactive state - shared between database and file views
  const gridApi = ref<GridApi | null>(null)
  const currentSortModel = ref<SortModelItem[]>([])
  const whereClause = ref<string>('')
  const whereInput = ref<string>('')
  const whereError = ref<string>()
  const agGridFilters = ref<Record<string, unknown>>({})
  const agGridWhereSQL = ref<string>('')

  // Context menu state
  const showContextMenu = ref(false)
  const contextMenuX = ref(0)
  const contextMenuY = ref(0)
  const contextMenuColumn = ref<Column | null>(null)

  // Advanced filter modal state
  const showAdvancedFilterModal = ref(false)

  // SQL banner state
  const isSqlBannerExpanded = ref(false)

  /**
   * Combined WHERE clause from both AG Grid filters and manual input
   */
  const combinedWhereClause = computed(() => {
    const agGridWhereClause = agGridWhereSQL.value
    const manualWhere = whereClause.value

    if (agGridWhereClause && manualWhere) {
      return `(${agGridWhereClause}) AND (${manualWhere})`
    } else if (agGridWhereClause) {
      return agGridWhereClause
    } else if (manualWhere) {
      return manualWhere
    }
    return ''
  })

  /**
   * ORDER BY clause generated from current sort model
   */
  const orderByClause = computed(() => {
    if (currentSortModel.value.length === 0) return ''

    const sortParts = currentSortModel.value.map((sort) => {
      const direction = sort.sort?.toUpperCase() || 'ASC'
      return `${sort.colId} ${direction}`
    })

    return sortParts.join(', ')
  })

  /**
   * Full SQL query (WHERE + ORDER BY) for display
   */
  const fullSqlQuery = computed(() => {
    const parts: string[] = []

    if (combinedWhereClause.value) {
      parts.push(`WHERE ${combinedWhereClause.value}`)
    }

    if (orderByClause.value) {
      parts.push(`ORDER BY ${orderByClause.value}`)
    }

    return parts.join(' ')
  })

  /**
   * Check if SQL query needs truncation for display
   */
  const needsTruncation = computed(() => {
    return fullSqlQuery.value.length > sqlBannerMaxLength
  })

  /**
   * Displayed SQL (truncated or full based on expansion state)
   */
  const displayedSql = computed(() => {
    if (!needsTruncation.value || isSqlBannerExpanded.value) {
      return fullSqlQuery.value
    }
    return fullSqlQuery.value.substring(0, sqlBannerMaxLength) + '...'
  })

  /**
   * Toggle SQL banner expansion state
   */
  function toggleSqlBanner(): void {
    isSqlBannerExpanded.value = !isSqlBannerExpanded.value
  }

  /**
   * Close context menu
   */
  function closeContextMenu(): void {
    showContextMenu.value = false
  }

  /**
   * Open advanced filter modal
   */
  function openAdvancedFilterModal(): void {
    showAdvancedFilterModal.value = true
  }

  /**
   * Convert AG Grid filter model to SQL and update state
   * Should be called when grid filters change
   */
  function updateAgGridWhereSQL(filterModel: Record<string, any>): void {
    if (!filterModel || Object.keys(filterModel).length === 0) {
      agGridWhereSQL.value = ''
    } else {
      agGridWhereSQL.value = convertFilterModelToSQL(filterModel)
    }
  }

  /**
   * Clear all filters (both AG Grid and manual)
   * Components can extend this with their own cleanup logic
   */
  function clearAllFilters(): void {
    // Clear manual WHERE clause
    whereInput.value = ''
    whereClause.value = ''
    whereError.value = undefined

    // Clear AG Grid filters
    if (gridApi.value) {
      gridApi.value.setFilterModel(null)
    }

    // Clear agGridWhereSQL
    agGridWhereSQL.value = ''
    agGridFilters.value = {}
  }

  return {
    // State
    gridApi,
    currentSortModel,
    whereClause,
    whereInput,
    whereError,
    agGridFilters,
    agGridWhereSQL,
    showContextMenu,
    contextMenuX,
    contextMenuY,
    contextMenuColumn,
    showAdvancedFilterModal,
    isSqlBannerExpanded,

    // Computed
    combinedWhereClause,
    orderByClause,
    fullSqlQuery,
    needsTruncation,
    displayedSql,

    // Methods
    toggleSqlBanner,
    closeContextMenu,
    openAdvancedFilterModal,
    updateAgGridWhereSQL,
    clearAllFilters
  }
}
