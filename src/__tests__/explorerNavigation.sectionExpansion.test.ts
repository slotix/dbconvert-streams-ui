import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

function getStorageKey(): string {
  const apiUrl = (window as Window & { ENV?: { VITE_API_URL?: string } }).ENV?.VITE_API_URL
  return `explorer.navigation.expansions.v1:${apiUrl || import.meta.env.VITE_API_URL || '/api'}`
}

describe('explorerNavigation section expansion', () => {
  beforeEach(() => {
    vi.resetModules()
    window.localStorage.clear()
    setActivePinia(createPinia())
  })

  it('tracks tables and views independently and persists collapsed sections', async () => {
    const { getExplorerObjectSectionKey, useExplorerNavigationStore } =
      await import('@/stores/explorerNavigation')

    const store = useExplorerNavigationStore()
    const tablesKey = getExplorerObjectSectionKey({
      connectionId: 'conn-1',
      database: 'sakila',
      section: 'tables'
    })
    const viewsKey = getExplorerObjectSectionKey({
      connectionId: 'conn-1',
      database: 'sakila',
      section: 'views'
    })

    expect(store.isObjectSectionExpanded(tablesKey)).toBe(true)
    expect(store.isObjectSectionExpanded(viewsKey)).toBe(true)

    store.collapseObjectSection(tablesKey)

    expect(store.isObjectSectionExpanded(tablesKey)).toBe(false)
    expect(store.isObjectSectionExpanded(viewsKey)).toBe(true)

    const persisted = JSON.parse(window.localStorage.getItem(getStorageKey()) || '{}')
    expect(persisted.collapsedObjectSections).toEqual([tablesKey])
  })

  it('hydrates collapsed object sections from persisted storage', async () => {
    const tablesKey = 'conn-2:postgres:public:section:tables'
    window.localStorage.setItem(
      getStorageKey(),
      JSON.stringify({
        expandedConnections: [],
        expandedDatabases: [],
        expandedSchemas: [],
        collapsedObjectSections: [tablesKey]
      })
    )

    const { getExplorerObjectSectionKey, useExplorerNavigationStore } =
      await import('@/stores/explorerNavigation')

    const store = useExplorerNavigationStore()
    const viewsKey = getExplorerObjectSectionKey({
      connectionId: 'conn-2',
      database: 'postgres',
      schema: 'public',
      section: 'views'
    })

    expect(store.isObjectSectionExpanded(tablesKey)).toBe(false)
    expect(store.isObjectSectionExpanded(viewsKey)).toBe(true)
  })
})
