<template>
  <!-- Content area p        <template #left>
          <div v-if="selectedMeta">
            <DatabaseObjectContainer
              :connection-id="connectionId"
              :table-meta="selectedMeta"
              :default-tab="selectedDefaultTab || undefined"
              :link-tabs="linkTabs"
              @tab-change="$emit('left-tab-change', $event)"
            />
          </div>
          <div v-else-if="selectedFileEntry">
            <FileObjectContainer
              :entry="selectedFileEntry"
              :metadata="selectedFileMetadata"
              :connection-id="connectionId"
              :default-tab="selectedDefaultTab || undefined"
              @tab-change="$emit('left-tab-change', $event)"
            />
          </div>n details > database overview > diagram mode > object structure/data -->
  <div v-if="detailsConnection" class="bg-white shadow-sm ring-1 ring-gray-900/5 rounded-lg">
    <ConnectionDetailsPanel
      :connection="detailsConnection"
      :file-entries="fileEntries"
      @edit="$emit('edit-connection')"
      @clone="$emit('clone-connection')"
      @delete="$emit('delete-connection')"
    />
  </div>
  <div
    v-else-if="overviewConnectionId && overviewDatabaseName"
    class="bg-white shadow-sm ring-1 ring-gray-900/5 rounded-lg"
  >
    <DatabaseOverviewPanel
      :connection-id="overviewConnectionId"
      :database="overviewDatabaseName"
      @show-diagram="$emit('show-diagram', $event)"
    />
  </div>
  <div v-else-if="showDiagram" class="bg-white shadow-sm ring-1 ring-gray-900/5 rounded-lg">
    <DiagramView :tables="[] as any[]" :views="[] as any[]" :relationships="[] as any[]" />
  </div>
  <div v-else>
    <div class="min-h-[480px] min-w-0 overflow-x-hidden">
      <ExplorerSplitPane
        :split-meta="splitMeta || undefined"
        :split-file-entry="splitFileEntry || undefined"
        @set-active-pane="$emit('set-active-pane', $event)"
        @promote-right-split="$emit('promote-right-split')"
      >
        <template #left>
          <div v-if="selectedMeta">
            <DatabaseObjectContainer
              :connection-id="connectionId"
              :table-meta="selectedMeta"
              :is-view="false"
              :connection-type="'sql'"
              :database="''"
              :default-tab="selectedDefaultTab || undefined"
              :link-tabs="linkTabs"
              @tab-change="$emit('left-tab-change', $event)"
            />
          </div>
          <div v-else-if="selectedFileEntry">
            <FileObjectContainer
              :entry="selectedFileEntry"
              :metadata="selectedFileMetadata"
              :connection-id="connectionId"
              :default-tab="selectedDefaultTab || undefined"
              @tab-change="$emit('left-tab-change', $event)"
            />
          </div>
          <div v-else class="bg-white shadow-sm ring-1 ring-gray-900/5 rounded-lg p-8 text-center">
            <p class="text-gray-500">Select an object from the sidebar to view its details.</p>
          </div>
        </template>

        <template #right>
          <div v-if="splitMeta">
            <DatabaseObjectContainer
              :connection-id="splitConnectionId || ''"
              :table-meta="splitMeta"
              :is-view="false"
              :connection-type="'sql'"
              :database="''"
              :default-tab="splitDefaultTab || undefined"
              :link-tabs="linkTabs"
              @tab-change="$emit('right-tab-change', $event)"
            />
          </div>
          <div v-else-if="splitFileEntry">
            <FileObjectContainer
              :entry="splitFileEntry"
              :metadata="splitFileMetadata"
              :connection-id="splitConnectionId || ''"
              :default-tab="splitDefaultTab || undefined"
              @tab-change="$emit('right-tab-change', $event)"
            />
          </div>
        </template>

        <template #single>
          <div v-if="selectedMeta">
            <DatabaseObjectContainer
              :connection-id="connectionId"
              :table-meta="selectedMeta"
              :is-view="false"
              :connection-type="'sql'"
              :database="''"
              :default-tab="selectedDefaultTab || undefined"
              :link-tabs="linkTabs"
              @tab-change="$emit('left-tab-change', $event)"
            />
          </div>
          <div v-else-if="selectedFileEntry">
            <FileObjectContainer
              :entry="selectedFileEntry"
              :metadata="selectedFileMetadata"
              :connection-id="connectionId"
              :default-tab="selectedDefaultTab || undefined"
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
import { useConnectionsStore } from '@/stores/connections'
import ConnectionDetailsPanel from '@/components/database/ConnectionDetailsPanel.vue'
import DatabaseOverviewPanel from '@/components/database/DatabaseOverviewPanel.vue'
import DiagramView from '@/components/database/DiagramView.vue'
import DatabaseObjectContainer from '@/components/database/DatabaseObjectContainer.vue'
import FileObjectContainer from '@/components/files/FileObjectContainer.vue'
import ExplorerSplitPane from './ExplorerSplitPane.vue'
import type { SQLTableMeta, SQLViewMeta } from '@/types/metadata'
import type { FileSystemEntry } from '@/api/fileSystem'
import type { FileMetadata } from '@/types/files'

interface Props {
  connectionId: string
  detailsConnectionId?: string | null
  overviewConnectionId?: string | null
  overviewDatabaseName?: string | null
  showDiagram?: boolean
  tables?: SQLTableMeta[]
  views?: SQLViewMeta[]
  relationships?: object[]
  selectedMeta?: SQLTableMeta | SQLViewMeta | null
  selectedFileEntry?: FileSystemEntry | null
  selectedFileMetadata?: FileMetadata | null
  selectedDefaultTab?: 'structure' | 'data' | null
  linkTabs?: boolean
  splitConnectionId?: string | null
  splitMeta?: SQLTableMeta | SQLViewMeta | null
  splitFileEntry?: FileSystemEntry | null
  splitFileMetadata?: FileMetadata | null
  splitDefaultTab?: 'structure' | 'data' | null
  fileEntries?: FileSystemEntry[]
}

const props = withDefaults(defineProps<Props>(), {
  detailsConnectionId: null,
  overviewConnectionId: null,
  overviewDatabaseName: null,
  showDiagram: false,
  tables: () => [],
  views: () => [],
  relationships: () => [],
  selectedMeta: null,
  selectedFileEntry: null,
  selectedFileMetadata: null,
  selectedDefaultTab: null,
  linkTabs: false,
  splitConnectionId: null,
  splitMeta: null,
  splitFileEntry: null,
  splitFileMetadata: null,
  splitDefaultTab: null,
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
}>()

const connectionsStore = useConnectionsStore()

// Computed properties
const detailsConnection = computed(() =>
  props.detailsConnectionId
    ? connectionsStore.connections.find((c) => c.id === props.detailsConnectionId) || null
    : null
)
</script>
