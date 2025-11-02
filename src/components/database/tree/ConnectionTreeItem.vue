<script setup lang="ts">
import { computed, inject } from 'vue'
import type { ComputedRef } from 'vue'
import { ChevronRightIcon, ChevronDownIcon } from '@heroicons/vue/24/outline'
import DatabaseTreeItem from './DatabaseTreeItem.vue'
import FileEntry from '../FileEntry.vue'
import CloudProviderBadge from '@/components/common/CloudProviderBadge.vue'
import { highlightParts as splitHighlight } from '@/utils/highlight'
import { getConnectionTooltip } from '@/utils/connectionUtils'
import { useConnectionTreeLogic } from '@/composables/useConnectionTreeLogic'
import { useFileExplorerStore } from '@/stores/fileExplorer'
import { useExplorerNavigationStore } from '@/stores/explorerNavigation'
import { useTreeSearch } from '@/composables/useTreeSearch'
import { useContextualIconSizes } from '@/composables/useIconSizes'
import type { Connection } from '@/types/connections'
import type { FileSystemEntry } from '@/api/fileSystem'

type ObjectType = 'table' | 'view'

interface DatabaseInfo {
  name: string
}

const props = defineProps<{
  connection: Connection
  isExpanded: boolean
  isFileConnection: boolean
  isFocused: boolean
  databases: DatabaseInfo[]
}>()

// Inject search query and caret class from parent
const searchQuery = inject<ComputedRef<string>>('treeSearchQuery')!
const caretClass = inject<string>('treeCaretClass')!

// Use composable and stores directly
const treeLogic = useConnectionTreeLogic()
const fileExplorerStore = useFileExplorerStore()
const navigationStore = useExplorerNavigationStore()
const treeSearch = computed(() => useTreeSearch(searchQuery.value))

// Icon sizes
const iconSizes = useContextualIconSizes()

// Get file entries and selected path from store
const fileEntries = computed(() => fileExplorerStore.getEntries(props.connection.id))
const selectedFilePath = computed(() => fileExplorerStore.getSelectedPath(props.connection.id))

const emit = defineEmits<{
  (e: 'toggle-connection'): void
  (e: 'select-connection', payload: { connectionId: string }): void
  (e: 'toggle-database', dbName: string): void
  (e: 'toggle-schema', payload: { dbName: string; schemaName: string }): void
  (e: 'select-database', payload: { connectionId: string; database: string }): void
  (e: 'select-file', payload: { connectionId: string; path: string }): void
  (
    e: 'open-object',
    payload: {
      connectionId: string
      database: string
      type: ObjectType
      name: string
      schema?: string
      mode: 'preview' | 'pinned'
    }
  ): void
  (
    e: 'open-file',
    payload: {
      connectionId: string
      path: string
      entry: FileSystemEntry
      mode: 'preview' | 'pinned'
      defaultTab?: 'structure' | 'data'
      openInRightSplit?: boolean
    }
  ): void
  (e: 'contextmenu-connection', payload: { event: MouseEvent; connectionId: string }): void
  (
    e: 'contextmenu-database',
    payload: { event: MouseEvent; connectionId: string; database: string }
  ): void
  (
    e: 'contextmenu-schema',
    payload: { event: MouseEvent; connectionId: string; database: string; schema: string }
  ): void
  (
    e: 'contextmenu-object',
    payload: {
      event: MouseEvent
      kind: ObjectType
      connectionId: string
      database: string
      schema?: string
      name: string
    }
  ): void
  (
    e: 'contextmenu-file',
    payload: { event: MouseEvent; connectionId: string; path: string; name: string }
  ): void
  (e: 'request-file-entries', payload: { connectionId: string }): void
}>()

const highlightParts = (text: string) => splitHighlight(text, searchQuery.value)

function isDatabaseExpanded(dbName: string): boolean {
  const key = `${props.connection.id}:${dbName}`
  return navigationStore.isDatabaseExpanded(key)
}

function handleConnectionContextMenu(event: MouseEvent) {
  emit('contextmenu-connection', {
    event,
    connectionId: props.connection.id
  })
}

function handleDatabaseToggle(dbName: string) {
  emit('toggle-database', dbName)
}

function handleSchemaToggle(dbName: string, schemaName: string) {
  emit('toggle-schema', { dbName, schemaName })
}

function handleObjectOpen(
  payload: {
    type: ObjectType
    name: string
    schema?: string
    mode: 'preview' | 'pinned'
  },
  dbName: string
) {
  emit('open-object', {
    connectionId: props.connection.id,
    database: dbName,
    ...payload
  })
}

function handleFileOpen(payload: {
  entry: FileSystemEntry
  mode: 'preview' | 'pinned'
  openInRightSplit?: boolean
}) {
  emit('open-file', {
    connectionId: props.connection.id,
    path: payload.entry.path,
    entry: payload.entry,
    mode: payload.mode,
    defaultTab: 'data',
    openInRightSplit: payload.openInRightSplit
  })
}

function handleFileContextMenu(payload: { event: MouseEvent; entry: FileSystemEntry }) {
  emit('contextmenu-file', {
    event: payload.event,
    connectionId: props.connection.id,
    path: payload.entry.path,
    name: payload.entry.name
  })
}

function handleSelectFile(path: string) {
  emit('select-file', {
    connectionId: props.connection.id,
    path
  })
}

const visibleFileEntries = computed(() => {
  return treeSearch.value.filterFileEntries(fileEntries.value)
})

// Generate tooltip with full connection details
const connectionTooltip = computed(() => {
  return getConnectionTooltip(props.connection)
})
</script>

<template>
  <div class="transition-all duration-200">
    <div
      :data-explorer-connection="connection.id"
      :class="[
        'group flex items-center gap-2 px-3 py-2 text-sm text-gray-700 rounded-lg cursor-pointer select-none',
        'transition-all duration-200 ease-out',
        'hover:bg-linear-to-r hover:from-blue-50 hover:to-teal-50',
        'hover:shadow-sm hover:scale-[1.02] hover:-translate-y-0.5',
        'active:scale-[0.98]',
        // For file connections, don't highlight the parent connection when a file is selected
        // Only highlight when explicitly focused and no file is selected (same behavior as databases)
        isFocused && !(isFileConnection && selectedFilePath)
          ? 'bg-linear-to-r from-blue-100 to-teal-100 shadow-md ring-2 ring-blue-200/50'
          : ''
      ]"
      :title="connectionTooltip"
      @click="$emit('select-connection', { connectionId: connection.id })"
      @contextmenu.stop.prevent="handleConnectionContextMenu"
    >
      <component
        :is="isExpanded ? ChevronDownIcon : ChevronRightIcon"
        :class="[caretClass, 'transition-transform duration-200 group-hover:text-teal-600']"
        @click.stop="$emit('toggle-connection')"
      />
      <div
        class="flex items-center shrink-0 p-1.5 rounded-lg bg-white group-hover:bg-linear-to-br group-hover:from-blue-50 group-hover:to-teal-50 transition-all duration-200 group-hover:shadow-sm"
      >
        <img
          :src="treeLogic.getDbLogoForType(connection.type)"
          :alt="connection.type || 'db'"
          :class="[iconSizes.sidebarMenu, 'object-contain']"
        />
      </div>
      <div class="flex-1 min-w-0 flex flex-col gap-0.5">
        <div class="flex items-center gap-1.5">
          <span class="font-semibold truncate text-slate-800 group-hover:text-teal-900">
            <template
              v-for="(p, i) in highlightParts(connection.name || connection.host || 'Connection')"
              :key="i"
            >
              <span v-if="p.match" class="bg-yellow-200/60 rounded px-0.5" v-text="p.text"></span>
              <span v-else v-text="p.text"></span>
            </template>
          </span>
          <CloudProviderBadge
            v-if="connection.cloud_provider"
            :cloud-provider="connection.cloud_provider"
            :db-type="connection.type"
            size="sm"
            class="shrink-0"
          />
        </div>
        <div
          v-if="connection.host && connection.port"
          class="text-xs text-slate-500 truncate leading-tight group-hover:text-slate-600"
        >
          {{ connection.host }}:{{ connection.port }}
        </div>
      </div>
    </div>

    <!-- Databases or Files under connection -->
    <div v-if="isExpanded" class="ml-5 border-l-2 border-slate-200 pl-3 space-y-1 mt-1">
      <div v-if="isFileConnection">
        <div v-if="!visibleFileEntries.length" class="text-xs text-slate-500 px-3 py-1.5">
          No files
        </div>
        <FileEntry
          v-for="entry in visibleFileEntries"
          :key="entry.path"
          :entry="entry"
          :connection-id="connection.id"
          :selected="selectedFilePath === entry.path"
          @select="handleSelectFile(entry.path)"
          @open="handleFileOpen"
          @context-menu="handleFileContextMenu"
        />
      </div>
      <div v-else>
        <div v-if="!databases.length" class="text-xs text-slate-500 px-3 py-1.5">No databases</div>
        <DatabaseTreeItem
          v-for="db in databases"
          :key="db.name"
          :database="db"
          :connection-id="connection.id"
          :is-expanded="isDatabaseExpanded(db.name)"
          :has-schemas="treeLogic.hasSchemas(connection.id)"
          :schemas="treeLogic.getSchemas(connection.id, db.name)"
          :flat-tables="treeLogic.getFlatTables(connection.id, db.name)"
          :flat-views="treeLogic.getFlatViews(connection.id, db.name)"
          :search-query="searchQuery"
          :caret-class="caretClass"
          :metadata-loaded="treeLogic.isMetadataLoaded(connection.id, db.name)"
          @toggle-database="handleDatabaseToggle(db.name)"
          @toggle-schema="(schemaName) => handleSchemaToggle(db.name, schemaName)"
          @select-database="$emit('select-database', $event)"
          @open-object="(p) => handleObjectOpen(p, db.name)"
          @contextmenu-database="$emit('contextmenu-database', $event)"
          @contextmenu-schema="$emit('contextmenu-schema', $event)"
          @contextmenu-object="$emit('contextmenu-object', $event)"
        />
      </div>
    </div>
  </div>
</template>
