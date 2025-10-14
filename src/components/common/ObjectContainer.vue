<script setup lang="ts">
import { computed, ref, watch, type Component } from 'vue'
import { ArrowPathIcon } from '@heroicons/vue/24/outline'
import { type SQLTableMeta, type SQLViewMeta } from '@/types/metadata'
import { type FileSystemEntry } from '@/api/fileSystem'
import { type FileMetadata } from '@/types/files'
import { useObjectTabStateStore } from '@/stores/objectTabState'

// Database components
import TableMetadataView from '@/components/database/TableMetadataView.vue'
import ViewStructureView from '@/components/database/ViewStructureView.vue'
import DatabaseObjectDataView from '@/components/database/DatabaseObjectDataView.vue'

// File components
import FileDataView from '@/components/files/FileDataView.vue'
import FileStructureView from '@/components/files/FileStructureView.vue'

defineOptions({
  name: 'ObjectContainer'
})

// Use the Pinia store for tab state management
const tabStateStore = useObjectTabStateStore()

// Simplified props approach - use discriminated union with all props optional except the discriminator
const props = defineProps<{
  objectType: 'database' | 'file'
  connectionId: string
  closable?: boolean
  // Database-specific props
  tableMeta?: SQLTableMeta | SQLViewMeta
  isView?: boolean
  connectionType?: string
  database?: string
  // File-specific props
  fileEntry?: FileSystemEntry
  fileMetadata?: FileMetadata | null
}>()

const emit = defineEmits<{
  (e: 'refresh-metadata'): void
  (e: 'close'): void
  (e: 'tab-change', tab: 'data' | 'structure'): void
}>()

type TabItem = {
  name: string
  component: Component
  props: Record<string, unknown>
}

const tabs = computed<TabItem[]>(() => {
  if (props.objectType === 'file') {
    if (!props.fileEntry) {
      console.error('fileEntry is required when objectType is file')
      return []
    }
    return [
      {
        name: 'Data',
        component: FileDataView,
        props: {
          entry: props.fileEntry,
          metadata: props.fileMetadata,
          connectionId: props.connectionId
        }
      },
      {
        name: 'Structure',
        component: FileStructureView,
        props: {
          entry: props.fileEntry,
          metadata: props.fileMetadata,
          connectionId: props.connectionId
        }
      }
    ]
  } else {
    if (
      !props.tableMeta ||
      props.isView === undefined ||
      !props.database ||
      !props.connectionType
    ) {
      console.error(
        'tableMeta, isView, database, and connectionType are required when objectType is database'
      )
      return []
    }
    return [
      {
        name: 'Data',
        component: DatabaseObjectDataView,
        props: {
          tableMeta: props.tableMeta,
          isView: props.isView,
          database: props.database,
          connectionId: props.connectionId,
          objectKey: objectKey.value
        }
      },
      {
        name: 'Structure',
        component: props.isView ? ViewStructureView : TableMetadataView,
        props: props.isView
          ? {
              viewMeta: props.tableMeta as SQLViewMeta,
              connectionId: props.connectionId,
              connectionType: props.connectionType,
              objectKey: objectKey.value
            }
          : {
              tableMeta: props.tableMeta as SQLTableMeta,
              connectionId: props.connectionId,
              connectionType: props.connectionType,
              objectKey: objectKey.value
            }
      }
    ]
  }
})

// Simple local state - each ObjectContainer manages its own Data/Structure state
// Global Map is defined in the script block above

function getObjectKey(): string {
  if (props.objectType === 'database' && props.tableMeta) {
    return `db-${props.tableMeta.database}-${props.tableMeta.schema || 'default'}-${props.tableMeta.name}`
  } else if (props.objectType === 'file' && props.fileEntry) {
    return `file-${props.fileEntry.path}`
  }
  return 'unknown'
}

const objectKey = computed(() => getObjectKey())

// Start with default state
const selectedIndex = ref(0)

// Load saved state when objectKey is available
const savedState = tabStateStore.getTabState(objectKey.value)
if (savedState !== undefined) {
  selectedIndex.value = savedState
}

// Watch for objectKey changes and update state accordingly
watch(objectKey, (newKey) => {
  const savedState = tabStateStore.getTabState(newKey)
  selectedIndex.value = savedState ?? 0
})

function onTabChange(i: number) {
  selectedIndex.value = i
  // Save state to Pinia store
  tabStateStore.setTabState(objectKey.value, i)
  const activeTab = i === 0 ? 'data' : 'structure'
  emit('tab-change', activeTab)
}

// Keep refs to the rendered child components so parent can trigger refresh
type Refreshable = { refresh?: () => Promise<void> | void }
const panelRefs = ref<Refreshable[]>([])
const isRefreshing = ref(false)

async function onRefreshClick() {
  try {
    isRefreshing.value = true
    const comp = panelRefs.value[selectedIndex.value]
    if (comp && typeof comp.refresh === 'function') {
      await comp.refresh()
    } else {
      emit('refresh-metadata')
    }
  } finally {
    // small delay to show spinner feels responsive even if instant
    setTimeout(
      () => {
        isRefreshing.value = false
      },
      props.objectType === 'database' ? 300 : 0
    )
  }
}
</script>

<template>
  <div
    :class="[
      'bg-white',
      $attrs.class ? $attrs.class : 'shadow-sm ring-1 ring-gray-900/5 rounded-lg'
    ]"
  >
    <!-- Header with tabs and refresh button -->
    <div class="border-b border-gray-200 px-4">
      <div class="flex items-center justify-between -mb-px">
        <div class="flex items-center gap-4 flex-wrap">
          <button
            v-for="(tab, i) in tabs"
            :key="tab.name"
            :class="[
              'border-b-2 py-4 px-1 text-sm font-medium whitespace-nowrap transition-colors duration-150',
              selectedIndex === i
                ? 'border-slate-500 text-slate-600'
                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
            ]"
            @click="onTabChange(i)"
          >
            {{ tab.name }}
          </button>
        </div>
        <div class="py-2">
          <button
            type="button"
            class="inline-flex items-center rounded-md bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm border border-gray-200 hover:bg-gray-50 transition-colors"
            :disabled="isRefreshing"
            @click="onRefreshClick"
          >
            <ArrowPathIcon
              :class="['h-4 w-4 mr-1.5', isRefreshing ? 'animate-spin' : 'text-gray-400']"
            />
            {{ selectedIndex === 0 ? 'Refresh Data' : 'Refresh Metadata' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Tab Content -->
    <div class="overflow-hidden">
      <div v-for="(tab, i) in tabs" v-show="selectedIndex === i" :key="tab.name">
        <component
          :is="tab.component"
          v-bind="tab.props"
          :ref="(el: any) => (panelRefs[i] = el)"
          @refresh-metadata="emit('refresh-metadata')"
        />
      </div>
    </div>
  </div>
</template>
