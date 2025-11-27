import { defineStore } from 'pinia'
import type { SortModelItem, ColumnState } from 'ag-grid-community'

type AGGridDataState = {
  sortModel: SortModelItem[]
  filterModel: Record<string, any>
  // Panel-driven WHERE clause (Query Filter Panel is the single source of truth)
  panelWhereSQL?: string
  // Panel-driven LIMIT (user-specified row limit)
  panelLimit?: number
  // Page size (rows per page)
  pageSize?: number
  totalRowCount: number
  exactRowCount: number | null
  // Column state (pinned, width, order, etc.)
  columnState?: ColumnState[]
}

// Filter panel config types (matching DataFilterPanel)
export type FilterConfig = {
  id: string
  column: string
  operator: string
  value: string
}

export type SortConfig = {
  column: string
  direction: 'ASC' | 'DESC'
}

export type FilterPanelState = {
  filters: FilterConfig[]
  sorts: SortConfig[]
  selectedColumns: string[]
  isExpanded: boolean
  showColumnSelector: boolean
  limit?: number | null
}

type ObjectTabState = {
  mainTab: number // 0 = Data, 1 = Structure
  subTab: number // For Structure tab: 0 = Columns, 1 = Keys, 2 = Indexes, 3 = DDL
  // AG Grid data state (for Data tab)
  agGridData?: AGGridDataState
  // Filter panel state (for Data tab)
  filterPanelState?: FilterPanelState
}

const STORAGE_KEY = 'explorer.objectTabState'

function hasBrowserStorage(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

function loadPersistedTabStates(): Record<string, ObjectTabState> {
  if (!hasBrowserStorage()) {
    return {}
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      return {}
    }
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed === 'object') {
      return parsed as Record<string, ObjectTabState>
    }
  } catch (error) {
    console.warn('Failed to load object tab state from localStorage:', error)
  }

  return {}
}

function persistTabStates(tabStates: Record<string, ObjectTabState>) {
  if (!hasBrowserStorage()) {
    return
  }

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(tabStates))
  } catch (error) {
    console.warn('Failed to persist object tab state to localStorage:', error)
  }
}

export const useObjectTabStateStore = defineStore('objectTabState', {
  state: () => ({
    // Map of object keys to their complete tab state
    tabStates: loadPersistedTabStates()
  }),

  actions: {
    persistState() {
      persistTabStates(this.tabStates)
    },

    setTabState(objectKey: string, tabIndex: number) {
      if (!this.tabStates[objectKey]) {
        this.tabStates[objectKey] = { mainTab: 0, subTab: 0 }
      }
      this.tabStates[objectKey].mainTab = tabIndex
      this.persistState()
    },

    getTabState(objectKey: string): number {
      return this.tabStates[objectKey]?.mainTab ?? 0 // Default to Data tab
    },

    setSubTabState(objectKey: string, subTabIndex: number) {
      if (!this.tabStates[objectKey]) {
        this.tabStates[objectKey] = { mainTab: 0, subTab: 0 }
      }
      this.tabStates[objectKey].subTab = subTabIndex
      this.persistState()
    },

    getSubTabState(objectKey: string): number {
      return this.tabStates[objectKey]?.subTab ?? 0 // Default to Columns tab
    },

    // AG Grid Data state management
    setAGGridDataState(objectKey: string, dataState: Partial<AGGridDataState>) {
      if (!this.tabStates[objectKey]) {
        this.tabStates[objectKey] = { mainTab: 0, subTab: 0 }
      }
      if (!this.tabStates[objectKey].agGridData) {
        this.tabStates[objectKey].agGridData = {
          sortModel: [],
          filterModel: {},
          panelWhereSQL: '',
          totalRowCount: 0,
          exactRowCount: null
        }
      }
      this.tabStates[objectKey].agGridData = {
        ...this.tabStates[objectKey].agGridData!,
        ...dataState
      }
      this.persistState()
    },

    getAGGridDataState(objectKey: string): AGGridDataState | null {
      return this.tabStates[objectKey]?.agGridData || null
    },

    clearTabState(objectKey: string) {
      delete this.tabStates[objectKey]
      this.persistState()
    },

    clearAllTabStates() {
      this.tabStates = {}
      this.persistState()
    },

    // Filter Panel state management
    setFilterPanelState(objectKey: string, panelState: FilterPanelState) {
      if (!this.tabStates[objectKey]) {
        this.tabStates[objectKey] = { mainTab: 0, subTab: 0 }
      }
      this.tabStates[objectKey].filterPanelState = panelState
      this.persistState()
    },

    getFilterPanelState(objectKey: string): FilterPanelState | null {
      return this.tabStates[objectKey]?.filterPanelState || null
    },

    clearFilterPanelState(objectKey: string) {
      if (this.tabStates[objectKey]) {
        delete this.tabStates[objectKey].filterPanelState
        this.persistState()
      }
    }
  }
})
