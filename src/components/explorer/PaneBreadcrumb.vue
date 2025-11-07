<template>
  <div class="mb-3 px-2" :data-pane-id="paneId">
    <!-- Database object breadcrumb -->
    <ExplorerBreadcrumb
      v-if="breadcrumbData.database"
      :connection-label="breadcrumbData.connectionLabel"
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
      <template v-if="breadcrumbData.connectionLabel">
        <span class="font-medium text-gray-700">{{ breadcrumbData.connectionLabel }}</span>
        <span class="text-gray-400">/</span>
      </template>
      <span class="text-gray-500">File:</span>
      <span class="font-medium text-gray-900">{{ breadcrumbData.fileName }}</span>
      <span class="text-gray-400">•</span>
      <span class="text-gray-500 text-xs truncate max-w-[400px]" :title="breadcrumbData.filePath">
        {{ breadcrumbData.filePath }}
      </span>
    </div>

    <!-- Empty state (when no tab is active) - only show for left pane -->
    <div
      v-else-if="paneId === 'left'"
      class="mt-2 flex flex-col items-center justify-center gap-2 rounded-2xl bg-white dark:bg-gray-900 px-4 py-5 text-center text-gray-500 dark:text-gray-400 shadow-sm dark:shadow-gray-950/40"
    >
      <div
        class="inline-flex h-12 w-12 items-center justify-center rounded-full bg-linear-to-br from-blue-600 to-teal-500 text-white shadow-lg"
      >
        <svg
          class="h-6 w-6"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.4"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M8 9h8m-8 4h5m7-7v8.5a2.5 2.5 0 01-2.5 2.5H8.75L5 21v-4H4.5A2.5 2.5 0 012 14.5V6a2 2 0 012-2h14a2 2 0 012 2z"
          />
        </svg>
      </div>
      <div>
        <p class="text-sm font-semibold text-gray-900 dark:text-gray-100">No object selected</p>
        <p class="text-xs mt-1 text-gray-500 dark:text-gray-400">
          Select an object from the sidebar to view its details.
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import ExplorerBreadcrumb from '@/components/database/ExplorerBreadcrumb.vue'
import { usePaneTabsStore, type PaneId } from '@/stores/paneTabs'
import { useConnectionsStore } from '@/stores/connections'
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
const connectionsStore = useConnectionsStore()

function formatConnectionLabel(connectionId: string | undefined) {
  if (!connectionId) return null
  const conn = connectionsStore.connections.find((c) => c.id === connectionId)
  if (!conn) return null

  if (conn.type === 'localfiles' || conn.type === 'files') {
    return conn.name || conn.id
  }

  const host = conn.host?.trim()
  const port = conn.port ? String(conn.port) : ''

  if (host && port) return `${host}:${port}`
  if (host) return host
  return conn.name || null
}

// Get breadcrumb data from active tab in this pane
const breadcrumbData = computed(() => {
  const activeTab = store.getActiveTab(props.paneId)

  if (!activeTab) {
    return {
      connectionLabel: null,
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
      connectionLabel: formatConnectionLabel(activeTab.connectionId),
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
    connectionLabel: formatConnectionLabel(activeTab.connectionId),
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
