<template>
  <div v-if="activeTab" class="h-[calc(100vh-220px)] overflow-hidden">
    <ObjectContainer
      v-if="activeTab.tabType === 'database'"
      :key="`${paneId}-${activeTab.database}.${activeTab.schema || 'default'}.${activeTab.name}`"
      object-type="database"
      :pane-id="paneId"
      :connection-id="activeTab.connectionId"
      :table-meta="activeTab.meta!"
      :is-view="activeTab.type === 'view'"
      :connection-type="connectionType"
      :database="activeTab.database!"
      @tab-change="$emit('tab-change', $event)"
      @refresh-metadata="$emit('refresh-metadata')"
      @open-sql-console="$emit('open-sql-console', $event)"
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
import { defineAsyncComponent } from 'vue'
import ObjectContainer from '@/components/common/ObjectContainer.vue'
import { UnifiedConsoleTab } from '@/components/console'
import EmptyStateMessage from './EmptyStateMessage.vue'
import type { PaneId } from '@/stores/paneTabs'
import type { PaneTab } from '@/stores/paneTabs'

// Lazy load DiagramTab since it includes heavy D3.js
const DiagramTab = defineAsyncComponent(() => import('@/components/database/DiagramTab.vue'))

interface Props {
  paneId: PaneId
  activeTab: PaneTab | null
  connectionType: string
  showEmptyState?: boolean
}

withDefaults(defineProps<Props>(), {
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
}>()
</script>
