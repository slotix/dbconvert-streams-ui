/**
 * Composable for shared AG Grid filtering state and logic
 * Used by both database table views and file data views
 */

import { ref, computed } from 'vue'
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
  const agGridFilters = ref<Record<string, unknown>>({})
  const agGridWhereSQL = ref<string>('')

  // Context menu state
  const showContextMenu = ref(false)
  const contextMenuX = ref(0)
  const contextMenuY = ref(0)
  const contextMenuColumn = ref<Column | null>(null)

  // SQL banner state
  const isSqlBannerExpanded = ref(false)

  /**
   * Combined WHERE clause (only AG Grid filters)
   */
  const combinedWhereClause = computed(() => {
    return agGridWhereSQL.value
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
   * Clear all AG Grid filters
   * Components can extend this with their own cleanup logic
   */
  function clearAllFilters(): void {
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
    agGridFilters,
    agGridWhereSQL,
    showContextMenu,
    contextMenuX,
    contextMenuY,
    contextMenuColumn,
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
    updateAgGridWhereSQL,
    clearAllFilters
  }
}
