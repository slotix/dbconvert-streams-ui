import { defineStore } from 'pinia'

type ObjectTabState = {
  mainTab: number // 0 = Data, 1 = Structure
  subTab: number // For Structure tab: 0 = Columns, 1 = Keys, 2 = Indexes, 3 = DDL
}

export const useObjectTabStateStore = defineStore('objectTabState', {
  state: () => ({
    // Map of object keys to their complete tab state
    tabStates: {} as Record<string, ObjectTabState>
  }),

  actions: {
    setTabState(objectKey: string, tabIndex: number) {
      if (!this.tabStates[objectKey]) {
        this.tabStates[objectKey] = { mainTab: 0, subTab: 0 }
      }
      this.tabStates[objectKey].mainTab = tabIndex
    },

    getTabState(objectKey: string): number {
      return this.tabStates[objectKey]?.mainTab ?? 0 // Default to Data tab
    },

    setSubTabState(objectKey: string, subTabIndex: number) {
      if (!this.tabStates[objectKey]) {
        this.tabStates[objectKey] = { mainTab: 0, subTab: 0 }
      }
      this.tabStates[objectKey].subTab = subTabIndex
    },

    getSubTabState(objectKey: string): number {
      return this.tabStates[objectKey]?.subTab ?? 0 // Default to Columns tab
    },

    clearTabState(objectKey: string) {
      delete this.tabStates[objectKey]
    },

    clearAllTabStates() {
      this.tabStates = {}
    }
  }
})
