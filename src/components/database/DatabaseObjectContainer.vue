<script setup lang="ts">
import { computed, ref, watch, type Component } from 'vue'
import { ArrowPathIcon } from '@heroicons/vue/24/outline'
import { Tab, TabGroup, TabList, TabPanel, TabPanels } from '@headlessui/vue'
import { type SQLTableMeta, type SQLViewMeta } from '@/types/metadata'
import { type FileSystemEntry } from '@/api/fileSystem'
import { type FileMetadata } from '@/types/files'
import TableMetadataView from './TableMetadataView.vue'
import ViewStructureView from './ViewStructureView.vue'
import DatabaseObjectDataView from './DatabaseObjectDataView.vue'
import FileDataView from '@/components/files/FileDataView.vue'
import FileStructureView from '@/components/files/FileStructureView.vue'

// Ensure some tooling recognizes these imports are used via options; also sets a friendly name
defineOptions({
  name: 'DatabaseObjectContainer',
  components: { TabGroup, TabList, Tab, TabPanels, TabPanel }
})

type DatabaseProps = {
  tableMeta: SQLTableMeta | SQLViewMeta
  isView: boolean
  connectionId: string
  connectionType: string
  database: string
  defaultTab?: 'structure' | 'data'
  closable?: boolean
  // File-specific props (unused for database objects)
  fileEntry?: never
  fileMetadata?: never
  objectType?: never
}

type FileProps = {
  fileEntry: FileSystemEntry
  fileMetadata: FileMetadata | null
  connectionId: string
  defaultTab?: 'structure' | 'data'
  closable?: boolean
  objectType: 'file'
  // Database-specific props (unused for file objects)
  tableMeta?: never
  isView?: never
  connectionType?: never
  database?: never
}

const props = defineProps<DatabaseProps | FileProps>()

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
  if ('fileEntry' in props && props.fileEntry) {
    // File object tabs
    const fileEntry = props.fileEntry as FileSystemEntry
    const fileMetadata = 'fileMetadata' in props ? props.fileMetadata : null
    return [
      {
        name: 'Data',
        component: FileDataView,
        props: {
          entry: fileEntry,
          metadata: fileMetadata,
          connectionId: props.connectionId
        }
      },
      {
        name: 'Structure',
        component: FileStructureView,
        props: {
          entry: fileEntry,
          metadata: fileMetadata,
          connectionId: props.connectionId
        }
      }
    ]
  } else {
    // Database object tabs
    const dbProps = props as DatabaseProps
    return [
      {
        name: 'Data',
        component: DatabaseObjectDataView,
        props: {
          tableMeta: dbProps.tableMeta,
          isView: dbProps.isView,
          database: dbProps.database,
          connectionId: dbProps.connectionId
        }
      },
      {
        name: 'Structure',
        component: dbProps.isView ? ViewStructureView : TableMetadataView,
        props: dbProps.isView
          ? {
              viewMeta: dbProps.tableMeta as SQLViewMeta,
              connectionId: dbProps.connectionId,
              connectionType: dbProps.connectionType
            }
          : {
              tableMeta: dbProps.tableMeta as SQLTableMeta,
              connectionId: dbProps.connectionId,
              connectionType: dbProps.connectionType
            }
      }
    ]
  }
})

// Select Data (index 0) by default unless caller explicitly requests Structure
const defaultIndex = computed(() => (props.defaultTab === 'structure' ? 1 : 0))

// Control the selected tab index so switching defaultTab from the outside takes effect
const selectedIndex = ref<number>(defaultIndex.value)
watch(defaultIndex, (val) => {
  selectedIndex.value = val
})

function onTabChange(i: number) {
  selectedIndex.value = i
  emit('tab-change', i === 0 ? 'data' : 'structure')
}

// Compose object display name (schema.name when schema is not public/empty)
const objectDisplayName = computed(() => {
  // Check if this is a file object by looking for the fileEntry property
  if ('fileEntry' in props && props.fileEntry) {
    // File object - show file name
    return (props.fileEntry as FileSystemEntry).name
  } else {
    // Database object - show schema.name format
    const meta = (props as DatabaseProps).tableMeta as Partial<SQLTableMeta & SQLViewMeta>
    const name = meta?.name || ''
    const schema = meta?.schema
    if (schema && schema !== 'public' && schema !== '') return `${schema}.${name}`
    return name
  }
})

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
    } else if (selectedIndex.value === 1) {
      // Fallback for Structure tab: bubble to parent
      emit('refresh-metadata')
    }
  } finally {
    // small delay to show spinner feels responsive even if instant
    setTimeout(() => (isRefreshing.value = false), 300)
  }
}
</script>

<template>
  <div class="bg-white shadow-sm ring-1 ring-gray-900/5 rounded-lg">
    <TabGroup :selectedIndex="selectedIndex" :defaultIndex="defaultIndex" @change="onTabChange">
      <!-- Tabs + object name + actions in one row -->
      <div class="border-b border-gray-200 flex items-center justify-between px-6 gap-3">
        <TabList class="flex items-center gap-4 flex-wrap">
          <Tab v-for="tab in tabs" :key="tab.name" v-slot="{ selected }" as="template">
            <button
              :class="[
                'border-b-2 py-4 px-1 text-sm font-medium whitespace-nowrap transition-colors duration-150',
                selected
                  ? 'border-slate-500 text-slate-600'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
              ]"
            >
              {{ tab.name }}
            </button>
          </Tab>
        </TabList>
        <div class="flex items-center gap-3 ml-auto">
          <div class="text-sm text-gray-600 truncate max-w-[40vw]">
            {{ objectDisplayName }}
          </div>
          <button
            type="button"
            class="inline-flex items-center rounded-md bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm border border-gray-200 hover:bg-gray-50"
            :disabled="isRefreshing"
            @click="onRefreshClick"
          >
            <ArrowPathIcon
              :class="['h-4 w-4 mr-2', isRefreshing ? 'animate-spin' : 'text-gray-400']"
            />
            {{ selectedIndex === 0 ? 'Refresh Data' : 'Refresh Metadata' }}
          </button>
          <button
            v-if="props.closable"
            class="text-gray-400 hover:text-gray-700 text-lg leading-none px-2 py-1"
            aria-label="Close"
            @click="emit('close')"
          >
            ×
          </button>
        </div>
      </div>

      <!-- Tab Panels -->
      <TabPanels class="overflow-hidden">
        <TabPanel v-for="(tab, i) in tabs" :key="tab.name">
          <component
            :is="tab.component"
            v-bind="tab.props"
            :ref="(el: any) => (panelRefs[i] = el)"
            @refresh-metadata="emit('refresh-metadata')"
          />
        </TabPanel>
      </TabPanels>
    </TabGroup>
  </div>
</template>
