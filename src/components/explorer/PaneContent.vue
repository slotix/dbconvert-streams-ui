<template>
  <div v-if="activeTab">
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
    />
  </div>
  <EmptyStateMessage v-else-if="showEmptyState" />
</template>

<script setup lang="ts">
import ObjectContainer from '@/components/common/ObjectContainer.vue'
import EmptyStateMessage from './EmptyStateMessage.vue'
import type { PaneId } from '@/stores/paneTabs'
import type { PaneTab } from '@/stores/paneTabs'

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
}>()
</script>
