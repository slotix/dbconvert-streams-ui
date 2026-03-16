<script setup lang="ts">
import { computed } from 'vue'
import {
  Beaker,
  ChevronsDown,
  ChevronsUp,
  Copy,
  Eye,
  EyeOff,
  FolderOpen,
  PanelLeftOpen,
  PanelRightOpen,
  Pencil,
  Plus,
  RefreshCw,
  Share2,
  Terminal,
  Trash2
} from 'lucide-vue-next'
import { useDesktopMode } from '@/composables/useDesktopMode'
import { useExplorerNavigationStore } from '@/stores/explorerNavigation'
import { useConnectionTreeLogic } from '@/composables/useConnectionTreeLogic'

// Get current zoom factor for position adjustment
const getZoomFactor = () => {
  const zoomValue = getComputedStyle(document.documentElement).getPropertyValue('--app-zoom')
  return parseFloat(zoomValue) || 1
}

type ContextTarget =
  | { kind: 'connection'; connectionId: string }
  | { kind: 'database'; connectionId: string; database: string }
  | { kind: 'schema'; connectionId: string; database: string; schema: string }
  | {
      kind: 'table' | 'view' | 'function' | 'procedure' | 'sequence'
      connectionId: string
      database: string
      schema?: string
      name: string
    }
  | {
      kind: 'file'
      connectionId: string
      path: string
      name: string
      isDir?: boolean
      isTable?: boolean
      format?: string
    }

const props = defineProps<{
  visible: boolean
  x: number
  y: number
  target: ContextTarget | null
  canCopyDDL?: boolean
  canCreateDatabase?: boolean
  canCreateSchema?: boolean
  isFileConnection?: boolean
  isLocalFileConnection?: boolean
  isS3Connection?: boolean
}>()

const { isDesktop } = useDesktopMode()

const emit = defineEmits<{
  (
    e: 'menu-action',
    payload: { action: string; target: ContextTarget; openInRightSplit?: boolean }
  ): void
  (e: 'close'): void
}>()

const target = computed(() => props.target as ContextTarget)

// Adjust position for CSS zoom
const adjustedX = computed(() => props.x / getZoomFactor())
const adjustedY = computed(() => props.y / getZoomFactor())
const navigationStore = useExplorerNavigationStore()
const treeLogic = useConnectionTreeLogic()

const showSystemDatabases = computed(() => {
  if (!props.target || props.target.kind !== 'connection') return false
  return navigationStore.showSystemDatabasesFor(props.target.connectionId)
})

const showSystemObjectsForDatabase = computed(() => {
  if (!props.target || props.target.kind !== 'database') return false
  return navigationStore.showSystemObjectsFor(props.target.connectionId, props.target.database)
})

const canToggleSystemObjectsForDatabase = computed(() => {
  if (!props.target || props.target.kind !== 'database') return false
  return treeLogic.hasSchemas(props.target.connectionId)
})
const isDatabaseObject = computed(
  () =>
    !!props.target &&
    (props.target.kind === 'table' ||
      props.target.kind === 'view' ||
      props.target.kind === 'function' ||
      props.target.kind === 'procedure')
)
const isTableOrView = computed(
  () => !!props.target && (props.target.kind === 'table' || props.target.kind === 'view')
)
// Check if this is a file or table folder (not a navigation folder)
const isFileOrTableFolder = computed(() => {
  if (!props.target || props.target.kind !== 'file') return false
  // For directories, only true if it's a table folder (contains data files)
  if (props.target.isDir) return !!props.target.isTable
  // For regular files, always true
  return true
})
// Check if this is a local filesystem file (not S3/cloud) - for desktop features
const isLocalFile = computed(
  () => props.isFileConnection && props.isLocalFileConnection && isFileOrTableFolder.value
)
// Check if this is a navigation folder (directory that's not a table folder)
const isNavigationFolder = computed(() => {
  if (!props.target || props.target.kind !== 'file') return false
  return props.target.isDir && !props.target.isTable
})
// Check if this is a local navigation folder (for copy/open folder actions)
const isLocalNavigationFolder = computed(
  () => props.isFileConnection && props.isLocalFileConnection && isNavigationFolder.value
)
const isS3NavigationFolder = computed(
  () => props.isFileConnection && props.isS3Connection && isNavigationFolder.value
)
// Objects that can be opened (tables, views, files, table folders)
const isOpenable = computed(() => isDatabaseObject.value || isFileOrTableFolder.value)
// Show menu for: non-file targets, openable files, OR local navigation folders
const hasMenu = computed(
  () =>
    props.visible &&
    !!props.target &&
    (!isNavigationFolder.value || isLocalNavigationFolder.value || isS3NavigationFolder.value)
)

const refreshConnectionLabel = computed(() => {
  if (props.isS3Connection) {
    return 'List live S3 contents'
  }
  if (props.isFileConnection) {
    return 'Refresh files'
  }
  return 'Refresh'
})

const canCollapseSubtree = computed(() => {
  if (!props.target) return false
  if (
    props.target.kind === 'connection' ||
    props.target.kind === 'database' ||
    props.target.kind === 'schema'
  ) {
    return true
  }
  return props.target.kind === 'file' && !!props.target.isDir
})

function click(action: string, openInRightSplit?: boolean) {
  if (!props.target) return
  emit('menu-action', { action, target: props.target, openInRightSplit })
}
</script>

<template>
  <teleport to="body">
    <div v-if="hasMenu">
      <div class="fixed inset-0 z-40" @click="emit('close')"></div>
      <div
        class="ui-surface-floating ui-border-default fixed z-50 rounded-md border py-1 text-sm"
        :style="{ left: adjustedX + 'px', top: adjustedY + 'px', minWidth: '200px' }"
      >
        <template v-if="target.kind === 'connection'">
          <!-- Connection menu -->
          <button
            v-if="!props.isFileConnection"
            class="flex w-full items-center gap-2 px-3 py-1.5 text-left text-gray-700 hover:bg-(--ui-surface-muted) dark:text-gray-300"
            @click="click('sql-console')"
          >
            <Terminal class="w-4 h-4 shrink-0" />
            <span>SQL Console</span>
          </button>
          <button
            v-if="props.isFileConnection"
            class="flex w-full items-center gap-2 px-3 py-1.5 text-left text-gray-700 hover:bg-(--ui-surface-muted) dark:text-gray-300"
            @click="click('file-console')"
          >
            <Terminal class="w-4 h-4 shrink-0" />
            <span>SQL Console</span>
          </button>
          <div v-if="!props.isFileConnection" class="ui-border-default my-1 border-t"></div>
          <div v-if="props.isFileConnection" class="ui-border-default my-1 border-t"></div>
          <button
            class="flex w-full items-center gap-2 px-3 py-1.5 text-left text-gray-700 hover:bg-(--ui-surface-muted) dark:text-gray-300"
            @click="click('test-connection')"
          >
            <Beaker class="w-4 h-4 shrink-0 text-gray-500 dark:text-gray-400" />
            <span>Test connection</span>
          </button>
          <button
            class="flex w-full items-center gap-2 px-3 py-1.5 text-left text-gray-700 hover:bg-(--ui-surface-muted) dark:text-gray-300"
            @click="click('refresh-databases')"
          >
            <RefreshCw class="w-4 h-4 shrink-0 text-gray-500 dark:text-gray-400" />
            <span>{{ refreshConnectionLabel }}</span>
          </button>
          <button
            v-if="canCollapseSubtree"
            class="flex w-full items-center gap-2 px-3 py-1.5 text-left text-gray-700 hover:bg-(--ui-surface-muted) dark:text-gray-300"
            @click="click('expand-subtree')"
          >
            <ChevronsDown class="w-4 h-4 shrink-0 text-gray-500 dark:text-gray-400" />
            <span>Expand subtree</span>
          </button>
          <button
            v-if="canCollapseSubtree"
            class="flex w-full items-center gap-2 px-3 py-1.5 text-left text-gray-700 hover:bg-(--ui-surface-muted) dark:text-gray-300"
            @click="click('collapse-subtree')"
          >
            <ChevronsUp class="w-4 h-4 shrink-0 text-gray-500 dark:text-gray-400" />
            <span>Collapse subtree</span>
          </button>
          <button
            v-if="!props.isFileConnection"
            class="flex w-full items-center gap-2 px-3 py-1.5 text-left text-gray-700 hover:bg-(--ui-surface-muted) dark:text-gray-300"
            @click="click('toggle-system-databases')"
          >
            <component
              :is="showSystemDatabases ? EyeOff : Eye"
              class="w-4 h-4 shrink-0 text-gray-500 dark:text-gray-400"
            />
            <span>{{ showSystemDatabases ? 'Hide system objects' : 'Show system objects' }}</span>
          </button>
          <button
            v-if="canCreateDatabase"
            class="flex w-full items-center gap-2 px-3 py-1.5 text-left text-gray-700 hover:bg-(--ui-surface-muted) dark:text-gray-300"
            @click="click('create-database')"
          >
            <Plus class="w-4 h-4 shrink-0 text-gray-500 dark:text-gray-400" />
            <span>New Database</span>
          </button>
          <!-- Local file connection: Copy/Open base path -->
          <template v-if="props.isLocalFileConnection">
            <div class="ui-border-default my-1 border-t"></div>
            <button
              class="flex w-full items-center gap-2 px-3 py-1.5 text-left text-gray-700 hover:bg-(--ui-surface-muted) dark:text-gray-300"
              @click="click('copy-base-path')"
            >
              <Copy class="w-4 h-4 shrink-0 text-gray-500 dark:text-gray-400" />
              <span>Copy Path</span>
            </button>
            <button
              v-if="isDesktop"
              class="flex w-full items-center gap-2 px-3 py-1.5 text-left text-gray-700 hover:bg-(--ui-surface-muted) dark:text-gray-300"
              @click="click('open-base-folder')"
            >
              <FolderOpen class="w-4 h-4 shrink-0 text-gray-500 dark:text-gray-400" />
              <span>Open Folder</span>
            </button>
          </template>
          <div class="ui-border-default my-1 border-t"></div>
          <button
            class="flex w-full items-center gap-2 px-3 py-1.5 text-left text-gray-700 hover:bg-(--ui-surface-muted) dark:text-gray-300"
            @click="click('edit-connection')"
          >
            <Pencil class="w-4 h-4 shrink-0 text-gray-500 dark:text-gray-400" />
            <span>Edit</span>
          </button>
          <button
            class="flex w-full items-center gap-2 px-3 py-1.5 text-left text-gray-700 hover:bg-(--ui-surface-muted) dark:text-gray-300"
            @click="click('clone-connection')"
          >
            <Copy class="w-4 h-4 shrink-0 text-gray-500 dark:text-gray-400" />
            <span>Clone</span>
          </button>
          <button
            class="flex w-full items-center gap-2 px-3 py-1.5 text-left text-red-600 hover:bg-(--ui-surface-muted) dark:text-red-300"
            @click="click('delete-connection')"
          >
            <Trash2 class="w-4 h-4 shrink-0" />
            <span>Delete</span>
          </button>
        </template>

        <template v-else-if="target.kind === 'database'">
          <!-- Database menu -->
          <button
            class="flex w-full items-center gap-2 px-3 py-1.5 text-left text-gray-700 hover:bg-(--ui-surface-muted) dark:text-gray-300"
            @click="click('sql-console')"
          >
            <Terminal class="w-4 h-4 shrink-0" />
            <span>SQL Console</span>
          </button>
          <div class="ui-border-default my-1 border-t"></div>
          <button
            class="flex w-full items-center gap-2 px-3 py-1.5 text-left text-gray-700 hover:bg-(--ui-surface-muted) dark:text-gray-300"
            @click="click('refresh-metadata')"
          >
            <RefreshCw class="w-4 h-4 shrink-0 text-gray-500 dark:text-gray-400" />
            <span>Refresh metadata</span>
          </button>
          <button
            v-if="canCollapseSubtree"
            class="flex w-full items-center gap-2 px-3 py-1.5 text-left text-gray-700 hover:bg-(--ui-surface-muted) dark:text-gray-300"
            @click="click('expand-subtree')"
          >
            <ChevronsDown class="w-4 h-4 shrink-0 text-gray-500 dark:text-gray-400" />
            <span>Expand subtree</span>
          </button>
          <button
            v-if="canCollapseSubtree"
            class="flex w-full items-center gap-2 px-3 py-1.5 text-left text-gray-700 hover:bg-(--ui-surface-muted) dark:text-gray-300"
            @click="click('collapse-subtree')"
          >
            <ChevronsUp class="w-4 h-4 shrink-0 text-gray-500 dark:text-gray-400" />
            <span>Collapse subtree</span>
          </button>
          <button
            v-if="canToggleSystemObjectsForDatabase"
            class="flex w-full items-center gap-2 px-3 py-1.5 text-left text-gray-700 hover:bg-(--ui-surface-muted) dark:text-gray-300"
            @click="click('toggle-system-objects')"
          >
            <component
              :is="showSystemObjectsForDatabase ? EyeOff : Eye"
              class="w-4 h-4 shrink-0 text-gray-500 dark:text-gray-400"
            />
            <span>
              {{ showSystemObjectsForDatabase ? 'Hide system objects' : 'Show system objects' }}
            </span>
          </button>
          <button
            v-if="canCreateSchema"
            class="flex w-full items-center gap-2 px-3 py-1.5 text-left text-gray-700 hover:bg-(--ui-surface-muted) dark:text-gray-300"
            @click="click('create-schema')"
          >
            <Plus class="w-4 h-4 shrink-0 text-gray-500 dark:text-gray-400" />
            <span>New Schema</span>
          </button>
          <div
            v-if="canCreateSchema || canToggleSystemObjectsForDatabase"
            class="ui-border-default my-1 border-t"
          ></div>
          <button
            class="flex w-full items-center gap-2 px-3 py-1.5 text-left text-gray-700 hover:bg-(--ui-surface-muted) dark:text-gray-300"
            @click="click('show-diagram')"
          >
            <Share2 class="w-4 h-4 shrink-0 text-gray-500 dark:text-gray-400" />
            <span>Show diagram</span>
          </button>
          <button
            class="flex w-full items-center gap-2 px-3 py-1.5 text-left text-gray-700 hover:bg-(--ui-surface-muted) dark:text-gray-300"
            @click="click('copy-database-name')"
          >
            <Copy class="w-4 h-4 shrink-0 text-gray-500 dark:text-gray-400" />
            <span>Copy name</span>
          </button>
        </template>

        <template v-else-if="target.kind === 'schema'">
          <!-- Schema menu -->
          <button
            class="flex w-full items-center gap-2 px-3 py-1.5 text-left text-gray-700 hover:bg-(--ui-surface-muted) dark:text-gray-300"
            @click="click('refresh-metadata')"
          >
            <RefreshCw class="w-4 h-4 shrink-0 text-gray-500 dark:text-gray-400" />
            <span>Refresh metadata</span>
          </button>
          <button
            v-if="canCollapseSubtree"
            class="flex w-full items-center gap-2 px-3 py-1.5 text-left text-gray-700 hover:bg-(--ui-surface-muted) dark:text-gray-300"
            @click="click('expand-subtree')"
          >
            <ChevronsDown class="w-4 h-4 shrink-0 text-gray-500 dark:text-gray-400" />
            <span>Expand subtree</span>
          </button>
          <button
            v-if="canCollapseSubtree"
            class="flex w-full items-center gap-2 px-3 py-1.5 text-left text-gray-700 hover:bg-(--ui-surface-muted) dark:text-gray-300"
            @click="click('collapse-subtree')"
          >
            <ChevronsUp class="w-4 h-4 shrink-0 text-gray-500 dark:text-gray-400" />
            <span>Collapse subtree</span>
          </button>
          <button
            class="flex w-full items-center gap-2 px-3 py-1.5 text-left text-gray-700 hover:bg-(--ui-surface-muted) dark:text-gray-300"
            @click="click('copy-schema-name')"
          >
            <Copy class="w-4 h-4 shrink-0 text-gray-500 dark:text-gray-400" />
            <span>Copy name</span>
          </button>
        </template>

        <template v-else-if="isOpenable">
          <!-- Table/View/File menu - shared actions -->
          <button
            class="flex w-full items-center gap-2 px-3 py-1.5 text-left text-gray-700 hover:bg-(--ui-surface-muted) dark:text-gray-300"
            @click="click('open', false)"
          >
            <PanelLeftOpen class="w-4 h-4 shrink-0 text-gray-500 dark:text-gray-400" />
            <span>Open in Left Pane</span>
          </button>
          <button
            class="flex w-full items-center gap-2 px-3 py-1.5 text-left text-gray-700 hover:bg-(--ui-surface-muted) dark:text-gray-300"
            @click="click('open', true)"
          >
            <PanelRightOpen class="w-4 h-4 shrink-0 text-gray-500 dark:text-gray-400" />
            <span>Open in Right Pane</span>
          </button>
          <div class="ui-border-default my-1 border-t"></div>

          <!-- Database object actions -->
          <template v-if="isDatabaseObject">
            <template v-if="isTableOrView">
              <button
                class="flex w-full items-center gap-2 px-3 py-1.5 text-left text-gray-700 hover:bg-(--ui-surface-muted) dark:text-gray-300"
                @click="click('open-in-sql-console')"
              >
                <Terminal class="w-4 h-4 shrink-0 text-gray-500 dark:text-gray-400" />
                <span>Open in SQL Console</span>
              </button>
              <button
                class="flex w-full items-center gap-2 px-3 py-1.5 text-left text-gray-700 hover:bg-(--ui-surface-muted) dark:text-gray-300"
                @click="click('show-diagram')"
              >
                <Share2 class="w-4 h-4 shrink-0 text-gray-500 dark:text-gray-400" />
                <span>Show diagram</span>
              </button>
              <div class="ui-border-default my-1 border-t"></div>
            </template>
            <button
              class="flex w-full items-center gap-2 px-3 py-1.5 text-left text-gray-700 hover:bg-(--ui-surface-muted) dark:text-gray-300"
              @click="click('copy-object-name')"
            >
              <Copy class="w-4 h-4 shrink-0 text-gray-500 dark:text-gray-400" />
              <span>Copy name</span>
            </button>
            <button
              class="flex w-full items-center gap-2 px-3 py-1.5 text-left text-gray-700 hover:bg-(--ui-surface-muted) disabled:opacity-50 dark:text-gray-300"
              :disabled="!canCopyDDL"
              @click="click('copy-ddl')"
            >
              <Copy class="w-4 h-4 shrink-0 text-gray-500 dark:text-gray-400" />
              <span>Copy DDL</span>
            </button>
          </template>

          <!-- File specific actions -->
          <template v-else-if="isFileOrTableFolder">
            <button
              v-if="target.kind === 'file' && target.isDir"
              class="flex w-full items-center gap-2 px-3 py-1.5 text-left text-gray-700 hover:bg-(--ui-surface-muted) dark:text-gray-300"
              @click="click('expand-subtree')"
            >
              <ChevronsDown class="w-4 h-4 shrink-0 text-gray-500 dark:text-gray-400" />
              <span>Expand subtree</span>
            </button>
            <button
              v-if="target.kind === 'file' && target.isDir"
              class="flex w-full items-center gap-2 px-3 py-1.5 text-left text-gray-700 hover:bg-(--ui-surface-muted) dark:text-gray-300"
              @click="click('collapse-subtree')"
            >
              <ChevronsUp class="w-4 h-4 shrink-0 text-gray-500 dark:text-gray-400" />
              <span>Collapse subtree</span>
            </button>
            <div
              v-if="target.kind === 'file' && target.isDir"
              class="ui-border-default my-1 border-t"
            ></div>
            <button
              v-if="props.isS3Connection"
              class="flex w-full items-center gap-2 px-3 py-1.5 text-left text-gray-700 hover:bg-(--ui-surface-muted) dark:text-gray-300"
              @click="click('refresh-databases')"
            >
              <RefreshCw class="w-4 h-4 shrink-0 text-gray-500 dark:text-gray-400" />
              <span>List live S3 contents</span>
            </button>
            <div v-if="props.isS3Connection" class="ui-border-default my-1 border-t"></div>
            <button
              class="flex w-full items-center gap-2 px-3 py-1.5 text-left text-gray-700 hover:bg-(--ui-surface-muted) dark:text-gray-300"
              @click="click('insert-into-console')"
            >
              <Terminal class="w-4 h-4 shrink-0 text-gray-500 dark:text-gray-400" />
              <span>Open in SQL Console</span>
            </button>
            <div class="ui-border-default my-1 border-t"></div>
            <!-- Copy Path: full system path for local files, relative path for S3 -->
            <button
              class="flex w-full items-center gap-2 px-3 py-1.5 text-left text-gray-700 hover:bg-(--ui-surface-muted) dark:text-gray-300"
              @click="click(isLocalFile ? 'copy-system-path' : 'copy-file-path')"
            >
              <Copy class="w-4 h-4 shrink-0 text-gray-500 dark:text-gray-400" />
              <span>Copy Path</span>
            </button>
            <button
              v-if="isLocalFile && isDesktop"
              class="flex w-full items-center gap-2 px-3 py-1.5 text-left text-gray-700 hover:bg-(--ui-surface-muted) dark:text-gray-300"
              @click="click('open-in-explorer')"
            >
              <FolderOpen class="w-4 h-4 shrink-0 text-gray-500 dark:text-gray-400" />
              <span>Open Folder</span>
            </button>
          </template>
        </template>

        <!-- Navigation folder menu -->
        <template v-else-if="isLocalNavigationFolder || isS3NavigationFolder">
          <button
            class="flex w-full items-center gap-2 px-3 py-1.5 text-left text-gray-700 hover:bg-(--ui-surface-muted) dark:text-gray-300"
            @click="click('expand-subtree')"
          >
            <ChevronsDown class="w-4 h-4 shrink-0 text-gray-500 dark:text-gray-400" />
            <span>Expand subtree</span>
          </button>
          <button
            class="flex w-full items-center gap-2 px-3 py-1.5 text-left text-gray-700 hover:bg-(--ui-surface-muted) dark:text-gray-300"
            @click="click('collapse-subtree')"
          >
            <ChevronsUp class="w-4 h-4 shrink-0 text-gray-500 dark:text-gray-400" />
            <span>Collapse subtree</span>
          </button>
          <div class="ui-border-default my-1 border-t"></div>
          <button
            v-if="isS3NavigationFolder"
            class="flex w-full items-center gap-2 px-3 py-1.5 text-left text-gray-700 hover:bg-(--ui-surface-muted) dark:text-gray-300"
            @click="click('refresh-databases')"
          >
            <RefreshCw class="w-4 h-4 shrink-0 text-gray-500 dark:text-gray-400" />
            <span>List live S3 contents</span>
          </button>
          <div v-if="isS3NavigationFolder" class="ui-border-default my-1 border-t"></div>
          <button
            class="flex w-full items-center gap-2 px-3 py-1.5 text-left text-gray-700 hover:bg-(--ui-surface-muted) dark:text-gray-300"
            @click="click(isS3NavigationFolder ? 'copy-file-path' : 'copy-system-path')"
          >
            <Copy class="w-4 h-4 shrink-0 text-gray-500 dark:text-gray-400" />
            <span>Copy Path</span>
          </button>
          <button
            v-if="isDesktop && isLocalNavigationFolder"
            class="flex w-full items-center gap-2 px-3 py-1.5 text-left text-gray-700 hover:bg-(--ui-surface-muted) dark:text-gray-300"
            @click="click('open-in-explorer')"
          >
            <FolderOpen class="w-4 h-4 shrink-0 text-gray-500 dark:text-gray-400" />
            <span>Open Folder</span>
          </button>
        </template>
      </div>
    </div>
  </teleport>
</template>
