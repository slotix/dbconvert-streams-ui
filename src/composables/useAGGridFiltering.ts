/**
 * Composable for AG Grid filtering state and logic
 * Used by both database table views and file data views
 *
 * SIMPLIFIED: Query Filter Panel is the single source of truth for filtering/sorting.
 * AG-Grid only displays data - it does not manage filter or sort state.
 */

import { ref, computed } from 'vue'
import type { GridApi, SortModelItem, Column } from 'ag-grid-community'

const SQL_BANNER_MAX_LENGTH = 150

interface UseAGGridFilteringOptions {
  sqlBannerMaxLength?: number
}

/**
 * Shared AG Grid filtering state and computed properties
 * Query Filter Panel is the single source of truth - no AG-Grid sync needed
 */
export function useAGGridFiltering(options: UseAGGridFilteringOptions = {}) {
  const sqlBannerMaxLength = options.sqlBannerMaxLength || SQL_BANNER_MAX_LENGTH

  // Grid API reference
  const gridApi = ref<GridApi | null>(null)

  // Panel-driven state (Query Filter Panel is the single source of truth)
  const panelWhereSQL = ref<string>('')
  const panelSortModel = ref<SortModelItem[]>([])

  // Context menu state
  const showContextMenu = ref(false)
  const contextMenuX = ref(0)
  const contextMenuY = ref(0)
  const contextMenuColumn = ref<Column | null>(null)

  // SQL banner state
  const isSqlBannerExpanded = ref(false)

  /**
   * WHERE clause from Query Filter Panel
   */
  const whereClause = computed(() => panelWhereSQL.value)

  /**
   * Sort model from Query Filter Panel
   */
  const sortModel = computed(() => panelSortModel.value)

  /**
   * ORDER BY clause generated from panel sort model
   */
  const orderByClause = computed(() => {
    if (panelSortModel.value.length === 0) return ''

    const sortParts = panelSortModel.value.map((sort) => {
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

    if (panelWhereSQL.value) {
      parts.push(`WHERE ${panelWhereSQL.value}`)
    }

    if (orderByClause.value) {
      parts.push(`ORDER BY ${orderByClause.value}`)
    }

    return parts.join(' ')
  })

  /**
   * Check if any filters or sorts are active
   */
  const hasActiveFilters = computed(() => {
    return panelWhereSQL.value.length > 0 || panelSortModel.value.length > 0
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
   * Set panel filters (from DataFilterPanel)
   */
  function setPanelFilters(where: string, sortModel: SortModelItem[]): void {
    panelWhereSQL.value = where
    panelSortModel.value = sortModel
  }

  /**
   * Clear all filters and sorting
   */
  function clearAllFilters(): void {
    panelWhereSQL.value = ''
    panelSortModel.value = []
  }

  return {
    // State
    gridApi,
    panelWhereSQL,
    panelSortModel,
    showContextMenu,
    contextMenuX,
    contextMenuY,
    contextMenuColumn,
    isSqlBannerExpanded,

    // Computed
    whereClause,
    sortModel,
    orderByClause,
    fullSqlQuery,
    hasActiveFilters,
    needsTruncation,
    displayedSql,

    // Methods
    toggleSqlBanner,
    closeContextMenu,
    setPanelFilters,
    clearAllFilters
  }
}
