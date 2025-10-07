import { defineStore } from 'pinia'

export const useObjectTabStateStore = defineStore('objectTabState', {
  state: () => ({
    // Map of object keys to their tab state (0 = Data, 1 = Structure)
    tabStates: {} as Record<string, number>
  }),

  actions: {
    setTabState(objectKey: string, tabIndex: number) {
      this.tabStates[objectKey] = tabIndex
    },

    getTabState(objectKey: string): number {
      return this.tabStates[objectKey] ?? 0 // Default to Data tab
    },

    clearTabState(objectKey: string) {
      delete this.tabStates[objectKey]
    },

    clearAllTabStates() {
      this.tabStates = {}
    }
  }
})
