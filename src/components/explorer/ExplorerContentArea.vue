<template>
  <div
    v-if="showConnectionDetails && currentConnection"
    class="bg-white shadow-sm ring-1 ring-gray-900/5 rounded-lg"
  >
    <ConnectionDetailsPanel
      :connection="currentConnection"
      :file-entries="fileEntries"
      @edit="$emit('edit-connection')"
      @clone="$emit('clone-connection')"
      @delete="$emit('delete-connection')"
    />
  </div>
  <div
    v-else-if="showDatabaseOverview && databaseFromQuery"
    class="bg-white shadow-sm ring-1 ring-gray-900/5 rounded-lg"
  >
    <DatabaseOverviewPanel
      :connection-id="connectionId"
      :database="databaseFromQuery"
      @show-diagram="$emit('show-diagram', $event)"
    />
  </div>
  <div v-else-if="showDiagram" class="bg-white shadow-sm ring-1 ring-gray-900/5 rounded-lg">
    <DiagramView :tables="tables" :views="views" :relationships="relationships" />
  </div>
  <div v-else>
    <div class="min-h-[480px] min-w-0 overflow-x-hidden">
      <ExplorerSplitPane
        @set-active-pane="$emit('set-active-pane', $event)"
        @promote-right-split="$emit('promote-right-split')"
      >
        <template #left>
          <div v-if="selectedMeta">
            <ObjectContainer
              :key="`left-${selectedMeta.database}.${selectedMeta.schema || 'default'}.${selectedMeta.name}`"
              object-type="database"
              :connection-id="connectionId"
              :table-meta="selectedMeta"
              :is-view="false"
              :connection-type="currentConnection?.type || 'sql'"
              :database="selectedMeta.database"
              @tab-change="$emit('left-tab-change', $event)"
              @refresh-metadata="$emit('refresh-metadata')"
            />
          </div>
          <div v-else-if="selectedFileEntry">
            <ObjectContainer
              :key="`left-${selectedFileEntry.path}`"
              object-type="file"
              :file-entry="selectedFileEntry"
              :file-metadata="selectedFileMetadata"
              :connection-id="connectionId"
              @tab-change="$emit('left-tab-change', $event)"
              @refresh-metadata="$emit('refresh-metadata')"
            />
          </div>
          <div v-else class="bg-white shadow-sm ring-1 ring-gray-900/5 rounded-lg p-8 text-center">
            <p class="text-gray-500">Select an object from the sidebar to view its details.</p>
          </div>
        </template>

        <template #right>
          <div v-if="splitViewStore.splitContent?.type === 'database'">
            <ObjectContainer
              object-type="database"
              :connection-id="connectionId"
              :table-meta="splitViewStore.splitContent.meta"
              :is-view="false"
              :connection-type="currentConnection?.type || 'sql'"
              :database="splitViewStore.splitContent.meta.database"
              @tab-change="$emit('right-tab-change', $event)"
              @refresh-metadata="$emit('refresh-metadata')"
            />
          </div>
          <div v-else-if="splitViewStore.splitContent?.type === 'file'">
            <ObjectContainer
              object-type="file"
              :file-entry="splitViewStore.splitContent.entry"
              :file-metadata="splitViewStore.splitContent.metadata || null"
              :connection-id="connectionId"
              @tab-change="$emit('right-tab-change', $event)"
              @refresh-metadata="$emit('refresh-metadata')"
            />
          </div>
        </template>

        <template #single>
          <div v-if="selectedMeta">
            <ObjectContainer
              object-type="database"
              :connection-id="connectionId"
              :table-meta="selectedMeta"
              :is-view="false"
              :connection-type="currentConnection?.type || 'sql'"
              :database="selectedMeta.database"
              @tab-change="$emit('left-tab-change', $event)"
            />
          </div>
          <div v-else-if="selectedFileEntry">
            <ObjectContainer
              object-type="file"
              :file-entry="selectedFileEntry"
              :file-metadata="selectedFileMetadata"
              :connection-id="connectionId"
              @tab-change="$emit('left-tab-change', $event)"
            />
          </div>
          <div v-else class="bg-white shadow-sm ring-1 ring-gray-900/5 rounded-lg p-8 text-center">
            <p class="text-gray-500">Select an object from the sidebar to view its details.</p>
          </div>
        </template>
      </ExplorerSplitPane>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useConnectionsStore } from '@/stores/connections'
import { useSplitViewStore } from '@/stores/splitView'
import ConnectionDetailsPanel from '@/components/database/ConnectionDetailsPanel.vue'
import DatabaseOverviewPanel from '@/components/database/DatabaseOverviewPanel.vue'
import DiagramView from '@/components/database/DiagramView.vue'
import ExplorerSplitPane from './ExplorerSplitPane.vue'
import ObjectContainer from '@/components/common/ObjectContainer.vue'
import type { SQLTableMeta, SQLViewMeta } from '@/types/metadata'
import type { FileSystemEntry } from '@/api/fileSystem'
import type { FileMetadata } from '@/types/files'
import type { Table, Relationship } from '@/types/schema'

interface Props {
  connectionId: string
  showDiagram?: boolean
  tables?: Table[]
  views?: Table[]
  relationships?: Relationship[]
  selectedMeta?: SQLTableMeta | SQLViewMeta | null
  selectedFileEntry?: FileSystemEntry | null
  selectedFileMetadata?: FileMetadata | null
  fileEntries?: FileSystemEntry[]
}

const props = withDefaults(defineProps<Props>(), {
  showDiagram: false,
  tables: () => [],
  views: () => [],
  relationships: () => [],
  selectedMeta: null,
  selectedFileEntry: null,
  selectedFileMetadata: null,
  fileEntries: () => []
})

// Define emits
defineEmits<{
  'edit-connection': []
  'clone-connection': []
  'delete-connection': []
  'show-diagram': [payload: { connectionId: string; database: string }]
  'set-active-pane': [pane: 'left' | 'right']
  'promote-right-split': []
  'left-tab-change': [tab: 'data' | 'structure']
  'right-tab-change': [tab: 'data' | 'structure']
  'refresh-metadata': []
}>()

const route = useRoute()
const connectionsStore = useConnectionsStore()
const splitViewStore = useSplitViewStore()

// Computed properties - derive view mode from route
const databaseFromQuery = computed(() => route.query.db as string | undefined)
const showConnectionDetails = computed(
  () => route.query.details === 'true' && currentConnection.value !== null
)
const showDatabaseOverview = computed(
  () =>
    !showConnectionDetails.value &&
    !props.showDiagram &&
    !props.selectedMeta &&
    !props.selectedFileEntry &&
    !!databaseFromQuery.value
)

const currentConnection = computed(
  () => connectionsStore.connections.find((c) => c.id === props.connectionId) || null
)
</script>
