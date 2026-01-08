<template>
  <div v-if="activeTab" :class="wrapperClass">
    <ConnectionDetailsPanel
      v-if="activeTab.tabType === 'connection-details' && currentConnection"
      :key="`${paneId}-connection-${activeTab.connectionId}`"
      :connection="currentConnection"
      :file-entries="connectionFileEntries"
      @edit-wizard="$emit('edit-connection-wizard', activeTab.connectionId)"
      @edit-json="$emit('edit-connection-json', activeTab.connectionId)"
      @clone="$emit('clone-connection', activeTab.connectionId)"
      @delete="$emit('delete-connection', activeTab.connectionId)"
      @create-database="
        $emit('create-database', { connectionId: activeTab.connectionId, name: $event })
      "
      @create-schema="
        $emit('create-schema', { connectionId: activeTab.connectionId, name: $event })
      "
      @create-bucket="$emit('create-bucket', { connectionId: activeTab.connectionId, ...$event })"
      @open-sql-console="$emit('open-connection-sql-console', activeTab.connectionId)"
      @open-file-console="$emit('open-connection-file-console', activeTab.connectionId)"
    />
    <div
      v-else-if="activeTab.tabType === 'connection-details'"
      class="flex h-full items-center justify-center text-sm text-gray-500 dark:text-gray-400"
    >
      Connection no longer available. Close this tab to remove it.
    </div>
    <div
      v-else-if="activeTab.tabType === 'database-overview' && activeTab.database"
      class="rounded-2xl bg-white dark:bg-gray-900 shadow-lg dark:shadow-gray-900/40"
    >
      <DatabaseOverviewPanel
        :key="`overview-${activeTab.connectionId}-${activeTab.database}`"
        :connection-id="activeTab.connectionId"
        :database="activeTab.database"
        @show-diagram="$emit('show-diagram', $event)"
        @open-sql-console="$emit('open-database-sql-console', $event)"
        @create-schema="
          $emit('create-schema', {
            connectionId: activeTab.connectionId,
            name: $event,
            database: activeTab.database
          })
        "
      />
    </div>
    <ObjectContainer
      v-else-if="activeTab.tabType === 'database' && resolvedDatabaseMeta"
      :key="`${paneId}-${activeTab.database}.${activeTab.schema || 'default'}.${activeTab.name}`"
      object-type="database"
      :pane-id="paneId"
      :connection-id="activeTab.connectionId"
      :object-meta="resolvedDatabaseMeta"
      :object-kind="activeTab.type"
      :connection-type="connectionType"
      :database="activeTab.database!"
      @tab-change="$emit('tab-change', $event)"
      @refresh-metadata="$emit('refresh-metadata')"
      @open-sql-console="$emit('open-sql-console', $event)"
      @open-diagram="$emit('show-diagram', $event)"
    />
    <ObjectContainer
      v-else-if="activeTab.tabType === 'file'"
      :key="`${paneId}-${activeTab.filePath}`"
      object-type="file"
      :pane-id="paneId"
      :file-entry="activeTab.fileEntry!"
      :file-metadata="activeTab.fileMetadata || null"
      :connection-id="activeTab.connectionId"
      @tab-change="$emit('tab-change', $event)"
      @refresh-metadata="$emit('refresh-metadata')"
      @open-file-console="$emit('open-file-console', $event)"
    />
    <UnifiedConsoleTab
      v-else-if="activeTab.tabType === 'sql-console'"
      :key="`${paneId}-sql-${activeTab.connectionId}-${activeTab.database || '*'}`"
      mode="database"
      :connection-id="activeTab.connectionId"
      :database="activeTab.database"
      :sql-scope="activeTab.sqlScope || 'database'"
    />
    <UnifiedConsoleTab
      v-else-if="activeTab.tabType === 'file-console'"
      :key="`${paneId}-file-console-${activeTab.connectionId}`"
      mode="file"
      :connection-id="activeTab.connectionId"
      :connection-type="activeTab.fileConnectionType || 'files'"
      :base-path="activeTab.basePath"
    />
    <DiagramTab
      v-else-if="activeTab.tabType === 'diagram'"
      :key="`${paneId}-diagram-${activeTab.connectionId}-${activeTab.database}`"
      :connection-id="activeTab.connectionId"
      :database="activeTab.database!"
    />
  </div>
  <EmptyStateMessage v-else-if="showEmptyState" />
</template>

<script setup lang="ts">
import { computed, defineAsyncComponent } from 'vue'
import ObjectContainer from '@/components/common/ObjectContainer.vue'
import ConnectionDetailsPanel from '@/components/database/ConnectionDetailsPanel.vue'
import DatabaseOverviewPanel from '@/components/database/DatabaseOverviewPanel.vue'
import { UnifiedConsoleTab } from '@/components/console'
import EmptyStateMessage from './EmptyStateMessage.vue'
import { useConnectionsStore } from '@/stores/connections'
import { useExplorerNavigationStore } from '@/stores/explorerNavigation'
import { useFileExplorerStore } from '@/stores/fileExplorer'
import type { PaneId } from '@/stores/paneTabs'
import type { PaneTab } from '@/stores/paneTabs'
import type { ShowDiagramPayload } from '@/types/diagram'
import type { SQLRoutineMeta, SQLSequenceMeta, SQLTableMeta, SQLViewMeta } from '@/types/metadata'
import { parseRoutineName } from '@/utils/routineUtils'

// Lazy load DiagramTab since it includes heavy D3.js
const DiagramTab = defineAsyncComponent(() => import('@/components/database/DiagramTab.vue'))

interface Props {
  paneId: PaneId
  activeTab: PaneTab | null
  connectionType: string
  showEmptyState?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  showEmptyState: true
})

defineEmits<{
  'tab-change': [tab: 'data' | 'structure']
  'refresh-metadata': []
  'open-sql-console': [
    payload: { connectionId: string; database: string; tableName: string; schema?: string }
  ]
  'open-file-console': [
    payload: {
      connectionId: string
      filePath: string
      fileName: string
      isDir?: boolean
      format?: string
    }
  ]
  'open-connection-sql-console': [connectionId: string]
  'open-connection-file-console': [connectionId: string]
  'open-database-sql-console': [payload: { connectionId: string; database: string }]
  'show-diagram': [payload: ShowDiagramPayload]
  'edit-connection-wizard': [connectionId: string]
  'edit-connection-json': [connectionId: string]
  'clone-connection': [connectionId: string]
  'delete-connection': [connectionId: string]
  'create-database': [payload: { connectionId: string; name: string }]
  'create-schema': [payload: { connectionId: string; name: string; database?: string }]
  'create-bucket': [payload: { connectionId: string; bucket: string; region?: string }]
}>()

const connectionsStore = useConnectionsStore()
const fileExplorerStore = useFileExplorerStore()
const navigationStore = useExplorerNavigationStore()

const resolvedDatabaseMeta = computed<
  SQLTableMeta | SQLViewMeta | SQLRoutineMeta | SQLSequenceMeta | null
>(() => {
  const activeTab = props.activeTab
  if (!activeTab || activeTab.tabType !== 'database') return null

  const database = activeTab.database
  if (!database) return null

  if (activeTab.type === 'view') {
    return (
      navigationStore.findViewMeta(
        activeTab.connectionId,
        database,
        activeTab.name,
        activeTab.schema
      ) || null
    )
  }

  if (activeTab.type === 'table') {
    return (
      navigationStore.findTableMeta(
        activeTab.connectionId,
        database,
        activeTab.name,
        activeTab.schema
      ) || null
    )
  }

  if (activeTab.type === 'sequence') {
    return (
      navigationStore.findSequenceMeta(
        activeTab.connectionId,
        database,
        activeTab.name,
        activeTab.schema
      ) || null
    )
  }

  if (activeTab.type === 'function' || activeTab.type === 'procedure') {
    const { routineName, signature } = parseRoutineName(activeTab.name)
    return (
      navigationStore.findRoutineMeta(
        activeTab.connectionId,
        database,
        routineName,
        activeTab.type === 'function' ? 'function' : 'procedure',
        activeTab.schema,
        signature
      ) || null
    )
  }

  return null
})

const wrapperClass = computed(() => {
  const base = 'h-[calc(100vh-220px)]'
  const tabType = props.activeTab?.tabType
  if (tabType === 'connection-details' || tabType === 'database-overview') {
    return `${base} overflow-y-auto overflow-x-hidden`
  }
  return `${base} overflow-hidden`
})

const currentConnection = computed(() => {
  if (!props.activeTab || props.activeTab.tabType !== 'connection-details') return null
  return connectionsStore.connectionByID(props.activeTab.connectionId)
})

const connectionFileEntries = computed(() => {
  if (!props.activeTab || props.activeTab.tabType !== 'connection-details') return []
  return fileExplorerStore.getEntries(props.activeTab.connectionId)
})
</script>
