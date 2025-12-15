<script setup lang="ts">
import { computed } from 'vue'
import { useExplorerNavigationStore } from '@/stores/explorerNavigation'
import { useConnectionTreeLogic } from '@/composables/useConnectionTreeLogic'

type ContextTarget =
  | { kind: 'connection'; connectionId: string }
  | { kind: 'database'; connectionId: string; database: string }
  | { kind: 'schema'; connectionId: string; database: string; schema: string }
  | {
      kind: 'table' | 'view'
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
const isOpenable = computed(() => isTableOrView.value || isFileOrTableFolder.value)
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
        :style="{ left: x + 'px', top: y + 'px', minWidth: '200px' }"
      >
        <template v-if="target.kind === 'connection'">
          <!-- Connection menu -->
          <button
            v-if="!props.isFileConnection"
            class="w-full text-left px-3 py-1.5 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
            @click="click('sql-console')"
          >
            Database Console
          </button>
          <button
            v-if="props.isFileConnection"
            class="w-full text-left px-3 py-1.5 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
            @click="click('file-console')"
          >
            File Console
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
            class="w-full text-left px-3 py-1.5 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
            @click="click('test-connection')"
          >
            Test connection
          </button>
          <button
            class="w-full text-left px-3 py-1.5 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
            @click="click('refresh-databases')"
          >
            Refresh
          </button>
          <button
            v-if="!props.isFileConnection"
            class="w-full text-left px-3 py-1.5 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
            @click="click('toggle-system-databases')"
          >
            {{ showSystemDatabases ? 'Hide system databases' : 'Show system databases' }}
          </button>
          <button
            v-if="canCreateDatabase"
            class="w-full text-left px-3 py-1.5 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
            @click="click('create-database')"
          >
            New Database
          </button>
          <div class="my-1 border-t border-gray-100 dark:border-gray-700"></div>
          <button
            class="w-full text-left px-3 py-1.5 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
            @click="click('edit-connection')"
          >
            Edit
          </button>
          <button
            class="w-full text-left px-3 py-1.5 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
            @click="click('clone-connection')"
          >
            Clone
          </button>
          <button
            class="w-full text-left px-3 py-1.5 text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-800"
            @click="click('delete-connection')"
          >
            Delete
          </button>
        </template>

        <template v-else-if="target.kind === 'database'">
          <!-- Database menu -->
          <button
            class="w-full text-left px-3 py-1.5 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
            @click="click('sql-console')"
          >
            SQL Console
          </button>
          <div class="my-1 border-t border-gray-100 dark:border-gray-700"></div>
          <button
            class="w-full text-left px-3 py-1.5 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
            @click="click('refresh-metadata')"
          >
            Refresh metadata
          </button>
          <button
            v-if="canToggleSystemObjectsForDatabase"
            class="w-full text-left px-3 py-1.5 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
            @click="click('toggle-system-objects')"
          >
            {{ showSystemObjectsForDatabase ? 'Hide system objects' : 'Show system objects' }}
          </button>
          <button
            v-if="canCreateSchema"
            class="w-full text-left px-3 py-1.5 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
            @click="click('create-schema')"
          >
            New Schema
          </button>
          <div
            v-if="canCreateSchema || canToggleSystemObjectsForDatabase"
            class="my-1 border-t border-gray-100 dark:border-gray-700"
          ></div>
          <button
            class="w-full text-left px-3 py-1.5 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
            @click="click('show-diagram')"
          >
            Show diagram
          </button>
          <button
            class="w-full text-left px-3 py-1.5 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
            @click="click('copy-database-name')"
          >
            Copy name
          </button>
        </template>

        <template v-else-if="target.kind === 'schema'">
          <!-- Schema menu -->
          <button
            class="w-full text-left px-3 py-1.5 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
            @click="click('refresh-metadata')"
          >
            Refresh metadata
          </button>
          <button
            class="w-full text-left px-3 py-1.5 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
            @click="click('copy-schema-name')"
          >
            Copy name
          </button>
        </template>

        <template v-else-if="isOpenable">
          <!-- Table/View/File menu - shared actions -->
          <button
            class="w-full text-left px-3 py-1.5 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
            @click="click('open', false)"
          >
            Open
          </button>
          <button
            class="w-full text-left px-3 py-1.5 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
            @click="click('open', true)"
          >
            Open in Right Pane
          </button>
          <div class="my-1 border-t border-gray-100 dark:border-gray-700"></div>

          <!-- Table/View specific actions -->
          <template v-if="isTableOrView">
            <button
              class="w-full text-left px-3 py-1.5 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
              @click="click('open-in-sql-console')"
            >
              Open in SQL Console
            </button>
            <div class="my-1 border-t border-gray-100 dark:border-gray-700"></div>
            <button
              class="w-full text-left px-3 py-1.5 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
              @click="click('copy-object-name')"
            >
              Copy name
            </button>
            <button
              class="w-full text-left px-3 py-1.5 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50"
              :disabled="!canCopyDDL"
              @click="click('copy-ddl')"
            >
              Copy DDL
            </button>
          </template>

          <!-- File specific actions -->
          <template v-else-if="isFileOrTableFolder">
            <button
              class="w-full text-left px-3 py-1.5 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
              @click="click('insert-into-console')"
            >
              Open in SQL Console
            </button>
            <div class="my-1 border-t border-gray-100 dark:border-gray-700"></div>
            <button
              class="w-full text-left px-3 py-1.5 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
              @click="click('copy-file-name')"
            >
              Copy name
            </button>
            <button
              class="w-full text-left px-3 py-1.5 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
              @click="click('copy-file-path')"
            >
              Copy path
            </button>
          </template>
        </template>
      </div>
    </div>
  </teleport>
</template>
