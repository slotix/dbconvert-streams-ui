<template>
  <div class="mb-3 px-2" :data-pane-id="paneId">
    <!-- Database object breadcrumb -->
    <ExplorerBreadcrumb
      v-if="breadcrumbData.database"
      :database="breadcrumbData.database"
      :schema="breadcrumbData.schema"
      :type="breadcrumbData.type"
      :name="breadcrumbData.name"
      :objects="breadcrumbData.objects"
      @navigate="$emit('navigate', $event)"
      @pick-name="$emit('pick-name', $event)"
    />

    <!-- File breadcrumb -->
    <div v-else-if="breadcrumbData.filePath" class="flex items-center gap-1 text-sm text-gray-600">
      <span class="text-gray-500">File:</span>
      <span class="font-medium text-gray-900">{{ breadcrumbData.fileName }}</span>
      <span class="text-gray-400">•</span>
      <span class="text-gray-500 text-xs truncate max-w-[400px]" :title="breadcrumbData.filePath">
        {{ breadcrumbData.filePath }}
      </span>
    </div>

    <!-- Empty state (when no tab is active) -->
    <div v-else class="text-sm text-gray-400 italic">No object selected</div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import ExplorerBreadcrumb from '@/components/database/ExplorerBreadcrumb.vue'
import { usePaneTabsStore, type PaneId } from '@/stores/paneTabs'
import type { DatabaseMetadata } from '@/types/metadata'

const props = defineProps<{
  paneId: PaneId
  metadata?: DatabaseMetadata | null // For building objects list in breadcrumb
}>()

const emit = defineEmits<{
  navigate: [payload: { level: 'database' | 'schema' | 'type' | 'name' }]
  'pick-name': [payload: { name: string; type: 'table' | 'view'; schema?: string }]
}>()

const store = usePaneTabsStore()

// Get breadcrumb data from active tab in this pane
const breadcrumbData = computed(() => {
  const activeTab = store.getActiveTab(props.paneId)

  if (!activeTab) {
    return {
      database: null,
      schema: null,
      type: null,
      name: null,
      objects: [],
      filePath: null,
      fileName: null
    }
  }

  if (activeTab.tabType === 'file') {
    return {
      database: null,
      schema: null,
      type: null,
      name: null,
      objects: [],
      filePath: activeTab.filePath || null,
      fileName: activeTab.name || null
    }
  }

  // Database object
  const objects: Array<{ name: string; type: 'table' | 'view'; schema?: string }> = []

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
  }

  return {
    database: activeTab.database || null,
    schema: activeTab.schema || null,
    type: activeTab.type || null,
    name: activeTab.name || null,
    objects,
    filePath: null,
    fileName: null
  }
})
</script>
