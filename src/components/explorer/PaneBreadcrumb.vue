<template>
  <div class="mb-3 px-2" :data-pane-id="paneId">
    <!-- Database object breadcrumb (including SQL console tabs) -->
    <ExplorerBreadcrumb
      v-if="breadcrumbData.database || breadcrumbData.isSqlConsole"
      :connection-label="breadcrumbData.connectionLabel"
      :database="breadcrumbData.database"
      :schema="breadcrumbData.schema"
      :name="breadcrumbData.name"
      :objects="breadcrumbData.objects"
      :console-name="breadcrumbData.consoleName"
      @pick-name="(payload) => $emit('pick-name', payload)"
    />

    <!-- File breadcrumb (using unified component) -->
    <ExplorerBreadcrumb
      v-else-if="breadcrumbData.isFileBreadcrumb"
      :connection-label="breadcrumbData.connectionLabel"
      :path-segments="breadcrumbData.pathSegments"
      :name="breadcrumbData.fileName"
      :files="breadcrumbData.siblingFiles"
      @pick-file="(payload) => $emit('pick-file', payload)"
    />

    <!-- Empty state removed - now handled by PaneContent component -->
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import ExplorerBreadcrumb from '@/components/database/ExplorerBreadcrumb.vue'
import { usePaneTabsStore, type PaneId } from '@/stores/paneTabs'
import { useConnectionsStore } from '@/stores/connections'
import { useFileExplorerStore } from '@/stores/fileExplorer'
import type { DatabaseMetadata } from '@/types/metadata'
import type { FileSystemEntry } from '@/api/fileSystem'
import { getConnectionKindFromSpec, isFileBasedKind } from '@/types/specs'
import { parsePathToSegments, getParentPath, type PathSegment } from '@/utils/pathUtils'
import {
  buildSqlConsoleBreadcrumbData,
  isSqlConsoleTabType
} from '@/composables/useSqlConsoleBreadcrumb'

const props = defineProps<{
  paneId: PaneId
  metadata?: DatabaseMetadata | null // For building objects list in breadcrumb
}>()

defineEmits<{
  'pick-name': [
    payload: {
      name: string
      type: 'table' | 'view' | 'function' | 'procedure' | 'sequence'
      schema?: string
    }
  ]
  'pick-file': [payload: { name: string; path: string }]
}>()

const store = usePaneTabsStore()
const connectionsStore = useConnectionsStore()
const fileExplorerStore = useFileExplorerStore()

function formatConnectionLabel(connectionId: string | undefined) {
  if (!connectionId) return null
  const conn = connectionsStore.connections.find((c) => c.id === connectionId)
  if (!conn) return null

  const kind = getConnectionKindFromSpec(conn.spec)
  if (isFileBasedKind(kind)) {
    return conn.name || conn.id
  }

  const host = conn.host?.trim()
  const port = conn.port ? String(conn.port) : ''

  if (host && port) return `${host}:${port}`
  if (host) return host
  return conn.name || null
}

/**
 * Find sibling files in the same directory as the given file path.
 * Searches the file explorer store entries recursively.
 */
function findSiblingFiles(
  connectionId: string,
  filePath: string
): Array<{ name: string; path: string; format?: string }> {
  const parentPath = getParentPath(filePath)
  if (!parentPath) return []

  const entries = fileExplorerStore.getEntries(connectionId)
  if (!entries.length) return []

  // Helper to search entries recursively
  function findFilesInDirectory(items: FileSystemEntry[], targetParent: string): FileSystemEntry[] {
    for (const item of items) {
      // Check if this directory matches the parent path
      if (item.type === 'dir') {
        const itemPath = item.path.replace(/\/$/, '') // Remove trailing slash
        if (itemPath === targetParent || itemPath + '/' === targetParent) {
          // Found the parent directory, return its file children
          return (item.children || []).filter((c) => c.type === 'file')
        }
        // Recurse into children
        if (item.children?.length) {
          const found = findFilesInDirectory(item.children, targetParent)
          if (found.length) return found
        }
      }
    }
    return []
  }

  // First, check if files are at the root level (matching parent path)
  const rootFiles = entries.filter((e) => {
    if (e.type !== 'file') return false
    const entryParent = getParentPath(e.path)
    return entryParent === parentPath
  })

  if (rootFiles.length > 0) {
    return rootFiles.map((f) => ({
      name: f.name,
      path: f.path,
      format: f.format
    }))
  }

  // Search in nested directories
  const foundFiles = findFilesInDirectory(entries, parentPath)
  return foundFiles.map((f) => ({
    name: f.name,
    path: f.path,
    format: f.format
  }))
}

// Get breadcrumb data from active tab in this pane
const breadcrumbData = computed(() => {
  const activeTab = store.getActiveTab(props.paneId)

  if (!activeTab) {
    return {
      connectionLabel: null,
      database: null,
      schema: null,
      name: null,
      objects: [],
      pathSegments: [] as PathSegment[],
      fileName: null,
      siblingFiles: [] as Array<{ name: string; path: string; format?: string }>,
      isSqlConsole: false,
      isFileBreadcrumb: false,
      consoleName: null
    }
  }

  // Check if this is a SQL console tab (database- or file-initiated)
  const isSqlConsole = isSqlConsoleTabType(activeTab.tabType)

  if (activeTab.tabType === 'file') {
    const filePath = activeTab.filePath || ''
    // Get base path from connection spec for proper segment parsing
    const conn = connectionsStore.connections.find((c) => c.id === activeTab.connectionId)
    const basePath = conn?.spec?.files?.basePath

    // Build path segments (excluding the file name itself)
    const allSegments = parsePathToSegments(filePath, basePath)
    // Remove the last segment (the file name) since we display it separately
    const pathSegments = allSegments.slice(0, -1)

    // Find sibling files for the picker
    const siblingFiles = findSiblingFiles(activeTab.connectionId, filePath)

    return {
      connectionLabel: formatConnectionLabel(activeTab.connectionId),
      database: null,
      schema: null,
      name: null,
      objects: [],
      pathSegments,
      fileName: activeTab.name || null,
      siblingFiles,
      isSqlConsole: false,
      isFileBreadcrumb: true,
      consoleName: null
    }
  }

  if (isSqlConsole) {
    return buildSqlConsoleBreadcrumbData(activeTab.name)
  }

  // Database object - build objects list for picker
  const objects: Array<{
    name: string
    type: 'table' | 'view' | 'function' | 'procedure' | 'sequence'
    schema?: string
  }> = []

  // Build objects list from metadata for picker dropdown
  if (props.metadata) {
    // Add tables
    if (props.metadata.tables) {
      Object.values(props.metadata.tables).forEach((table) => {
        objects.push({
          name: table.name,
          type: 'table',
          schema: table.schema
        })
      })
    }

    // Add views
    if (props.metadata.views) {
      Object.values(props.metadata.views).forEach((view) => {
        objects.push({
          name: view.name,
          type: 'view',
          schema: view.schema
        })
      })
    }

    if (props.metadata.functions) {
      Object.values(props.metadata.functions).forEach((fn) => {
        const signature = fn.signature?.trim()
        const label = signature ? `${fn.name}(${signature})` : fn.name
        objects.push({
          name: label,
          type: 'function',
          schema: fn.schema
        })
      })
    }

    if (props.metadata.procedures) {
      Object.values(props.metadata.procedures).forEach((proc) => {
        const signature = proc.signature?.trim()
        const label = signature ? `${proc.name}(${signature})` : proc.name
        objects.push({
          name: label,
          type: 'procedure',
          schema: proc.schema
        })
      })
    }

    if (props.metadata.sequences) {
      Object.values(props.metadata.sequences).forEach((seq) => {
        objects.push({
          name: seq.name,
          type: 'sequence',
          schema: seq.schema
        })
      })
    }
  }

  return {
    connectionLabel: formatConnectionLabel(activeTab.connectionId),
    database: activeTab.database || null,
    schema: activeTab.schema || null,
    name: activeTab.name || null,
    objects,
    pathSegments: [] as PathSegment[],
    fileName: null,
    siblingFiles: [] as Array<{ name: string; path: string; format?: string }>,
    isSqlConsole: false,
    isFileBreadcrumb: false,
    consoleName: null
  }
})
</script>
