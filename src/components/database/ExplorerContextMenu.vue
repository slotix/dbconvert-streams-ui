<script setup lang="ts">
import { computed } from 'vue'
import {
  Beaker,
  Copy,
  Eye,
  EyeOff,
  PanelLeftOpen,
  PanelRightOpen,
  Pencil,
  Plus,
  RefreshCw,
  Share2,
  Terminal,
  Trash2
} from 'lucide-vue-next'
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
      kind: 'table' | 'view' | 'function' | 'procedure'
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
}>()

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
// Check if this is a navigation folder (no menu items)
const isNavigationFolder = computed(() => {
  if (!props.target || props.target.kind !== 'file') return false
  return props.target.isDir && !props.target.isTable
})
// Objects that can be opened (tables, views, files, table folders)
const isOpenable = computed(() => isDatabaseObject.value || isFileOrTableFolder.value)
// Only show menu if visible, has target, and is not a navigation folder
const hasMenu = computed(() => props.visible && !!props.target && !isNavigationFolder.value)

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
        class="fixed z-50 bg-white dark:bg-gray-850 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg dark:shadow-gray-900/50 py-1 text-sm"
        :style="{ left: adjustedX + 'px', top: adjustedY + 'px', minWidth: '200px' }"
      >
        <template v-if="target.kind === 'connection'">
          <!-- Connection menu -->
          <button
            v-if="!props.isFileConnection"
            class="w-full text-left px-3 py-1.5 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-2"
            @click="click('sql-console')"
          >
            <Terminal class="w-4 h-4 shrink-0" />
            <span>SQL Console</span>
          </button>
          <button
            v-if="props.isFileConnection"
            class="w-full text-left px-3 py-1.5 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-2"
            @click="click('file-console')"
          >
            <Terminal class="w-4 h-4 shrink-0" />
            <span>SQL Console</span>
          </button>
          <div
            v-if="!props.isFileConnection"
            class="my-1 border-t border-gray-100 dark:border-gray-700"
          ></div>
          <div
            v-if="props.isFileConnection"
            class="my-1 border-t border-gray-100 dark:border-gray-700"
          ></div>
          <button
            class="w-full text-left px-3 py-1.5 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-2"
            @click="click('test-connection')"
          >
            <Beaker class="w-4 h-4 shrink-0 text-gray-500 dark:text-gray-400" />
            <span>Test connection</span>
          </button>
          <button
            class="w-full text-left px-3 py-1.5 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-2"
            @click="click('refresh-databases')"
          >
            <RefreshCw class="w-4 h-4 shrink-0 text-gray-500 dark:text-gray-400" />
            <span>Refresh</span>
          </button>
          <button
            v-if="!props.isFileConnection"
            class="w-full text-left px-3 py-1.5 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-2"
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
            class="w-full text-left px-3 py-1.5 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-2"
            @click="click('create-database')"
          >
            <Plus class="w-4 h-4 shrink-0 text-gray-500 dark:text-gray-400" />
            <span>New Database</span>
          </button>
          <div class="my-1 border-t border-gray-100 dark:border-gray-700"></div>
          <button
            class="w-full text-left px-3 py-1.5 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-2"
            @click="click('edit-connection')"
          >
            <Pencil class="w-4 h-4 shrink-0 text-gray-500 dark:text-gray-400" />
            <span>Edit</span>
          </button>
          <button
            class="w-full text-left px-3 py-1.5 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-2"
            @click="click('clone-connection')"
          >
            <Copy class="w-4 h-4 shrink-0 text-gray-500 dark:text-gray-400" />
            <span>Clone</span>
          </button>
          <button
            class="w-full text-left px-3 py-1.5 text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-2"
            @click="click('delete-connection')"
          >
            <Trash2 class="w-4 h-4 shrink-0" />
            <span>Delete</span>
          </button>
        </template>

        <template v-else-if="target.kind === 'database'">
          <!-- Database menu -->
          <button
            class="w-full text-left px-3 py-1.5 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-2"
            @click="click('sql-console')"
          >
            <Terminal class="w-4 h-4 shrink-0" />
            <span>SQL Console</span>
          </button>
          <div class="my-1 border-t border-gray-100 dark:border-gray-700"></div>
          <button
            class="w-full text-left px-3 py-1.5 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-2"
            @click="click('refresh-metadata')"
          >
            <RefreshCw class="w-4 h-4 shrink-0 text-gray-500 dark:text-gray-400" />
            <span>Refresh metadata</span>
          </button>
          <button
            v-if="canToggleSystemObjectsForDatabase"
            class="w-full text-left px-3 py-1.5 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-2"
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
            class="w-full text-left px-3 py-1.5 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-2"
            @click="click('create-schema')"
          >
            <Plus class="w-4 h-4 shrink-0 text-gray-500 dark:text-gray-400" />
            <span>New Schema</span>
          </button>
          <div
            v-if="canCreateSchema || canToggleSystemObjectsForDatabase"
            class="my-1 border-t border-gray-100 dark:border-gray-700"
          ></div>
          <button
            class="w-full text-left px-3 py-1.5 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-2"
            @click="click('show-diagram')"
          >
            <Share2 class="w-4 h-4 shrink-0 text-gray-500 dark:text-gray-400" />
            <span>Show diagram</span>
          </button>
          <button
            class="w-full text-left px-3 py-1.5 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-2"
            @click="click('copy-database-name')"
          >
            <Copy class="w-4 h-4 shrink-0 text-gray-500 dark:text-gray-400" />
            <span>Copy name</span>
          </button>
        </template>

        <template v-else-if="target.kind === 'schema'">
          <!-- Schema menu -->
          <button
            class="w-full text-left px-3 py-1.5 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-2"
            @click="click('refresh-metadata')"
          >
            <RefreshCw class="w-4 h-4 shrink-0 text-gray-500 dark:text-gray-400" />
            <span>Refresh metadata</span>
          </button>
          <button
            class="w-full text-left px-3 py-1.5 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-2"
            @click="click('copy-schema-name')"
          >
            <Copy class="w-4 h-4 shrink-0 text-gray-500 dark:text-gray-400" />
            <span>Copy name</span>
          </button>
        </template>

        <template v-else-if="isOpenable">
          <!-- Table/View/File menu - shared actions -->
          <button
            class="w-full text-left px-3 py-1.5 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-2"
            @click="click('open', false)"
          >
            <PanelLeftOpen class="w-4 h-4 shrink-0 text-gray-500 dark:text-gray-400" />
            <span>Open in Left Pane</span>
          </button>
          <button
            class="w-full text-left px-3 py-1.5 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-2"
            @click="click('open', true)"
          >
            <PanelRightOpen class="w-4 h-4 shrink-0 text-gray-500 dark:text-gray-400" />
            <span>Open in Right Pane</span>
          </button>
          <div class="my-1 border-t border-gray-100 dark:border-gray-700"></div>

          <!-- Database object actions -->
          <template v-if="isDatabaseObject">
            <template v-if="isTableOrView">
              <button
                class="w-full text-left px-3 py-1.5 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-2"
                @click="click('open-in-sql-console')"
              >
                <Terminal class="w-4 h-4 shrink-0 text-gray-500 dark:text-gray-400" />
                <span>Open in SQL Console</span>
              </button>
              <button
                class="w-full text-left px-3 py-1.5 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-2"
                @click="click('show-diagram')"
              >
                <Share2 class="w-4 h-4 shrink-0 text-gray-500 dark:text-gray-400" />
                <span>Show diagram</span>
              </button>
              <div class="my-1 border-t border-gray-100 dark:border-gray-700"></div>
            </template>
            <button
              class="w-full text-left px-3 py-1.5 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-2"
              @click="click('copy-object-name')"
            >
              <Copy class="w-4 h-4 shrink-0 text-gray-500 dark:text-gray-400" />
              <span>Copy name</span>
            </button>
            <button
              class="w-full text-left px-3 py-1.5 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50 flex items-center gap-2"
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
              class="w-full text-left px-3 py-1.5 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-2"
              @click="click('insert-into-console')"
            >
              <Terminal class="w-4 h-4 shrink-0 text-gray-500 dark:text-gray-400" />
              <span>Open in SQL Console</span>
            </button>
            <div class="my-1 border-t border-gray-100 dark:border-gray-700"></div>
            <button
              class="w-full text-left px-3 py-1.5 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-2"
              @click="click('copy-file-name')"
            >
              <Copy class="w-4 h-4 shrink-0 text-gray-500 dark:text-gray-400" />
              <span>Copy name</span>
            </button>
            <button
              class="w-full text-left px-3 py-1.5 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-2"
              @click="click('copy-file-path')"
            >
              <Copy class="w-4 h-4 shrink-0 text-gray-500 dark:text-gray-400" />
              <span>Copy path</span>
            </button>
          </template>
        </template>
      </div>
    </div>
  </teleport>
</template>
