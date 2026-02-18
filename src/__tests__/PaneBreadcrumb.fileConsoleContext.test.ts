import { shallowMount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import PaneBreadcrumb from '@/components/explorer/PaneBreadcrumb.vue'

type FileConsoleTabMock = {
  id: string
  tabType: 'file-console'
  connectionId: string
  name: string
  basePath: string
  pinned: boolean
}

let activeTab: FileConsoleTabMock | null = null

vi.mock('@/stores/paneTabs', () => ({
  usePaneTabsStore: () => ({
    getActiveTab: () => activeTab
  })
}))

vi.mock('@/stores/connections', () => ({
  useConnectionsStore: () => ({
    connections: [
      {
        id: 'files-1',
        name: 'Data Explorer Exports',
        type: 'files',
        spec: { files: { basePath: '/home/dm3/.local/share/dbconvert-streams/exports' } }
      }
    ]
  })
}))

vi.mock('@/stores/fileExplorer', () => ({
  useFileExplorerStore: () => ({
    getEntries: () => []
  })
}))

describe('PaneBreadcrumb file console context switching', () => {
  beforeEach(() => {
    activeTab = null
  })

  it('uses console breadcrumb when file-console tab is retargeted to another source context', () => {
    activeTab = {
      id: 'file-console-1',
      tabType: 'file-console',
      connectionId: 'files-1',
      name: 'mysql-localhost-root',
      basePath: '/home/dm3/.local/share/dbconvert-streams/exports',
      pinned: true
    }

    const wrapper = shallowMount(PaneBreadcrumb, {
      props: {
        paneId: 'left'
      }
    })

    const breadcrumb = wrapper.findComponent({ name: 'ExplorerBreadcrumb' })
    expect(breadcrumb.exists()).toBe(true)
    expect(breadcrumb.props('consoleName')).toBe('mysql-localhost-root')
    expect(breadcrumb.props('connectionLabel')).toBeNull()
    expect(breadcrumb.props('pathSegments')).toBeUndefined()
  })

  it('uses console breadcrumb for file-console on its origin context', () => {
    activeTab = {
      id: 'file-console-1',
      tabType: 'file-console',
      connectionId: 'files-1',
      name: 'Data Explorer Exports',
      basePath: '/home/dm3/.local/share/dbconvert-streams/exports',
      pinned: true
    }

    const wrapper = shallowMount(PaneBreadcrumb, {
      props: {
        paneId: 'left'
      }
    })

    const breadcrumb = wrapper.findComponent({ name: 'ExplorerBreadcrumb' })
    expect(breadcrumb.exists()).toBe(true)
    expect(breadcrumb.props('consoleName')).toBe('Data Explorer Exports')
    expect(breadcrumb.props('connectionLabel')).toBeNull()
    expect(breadcrumb.props('pathSegments')).toBeUndefined()
  })
})
