<script setup lang="ts">
import { computed, ref, watch, type Component } from 'vue'
import { ArrowPathIcon } from '@heroicons/vue/24/outline'
import { Tab, TabGroup, TabList, TabPanel, TabPanels } from '@headlessui/vue'
import { type SQLTableMeta, type SQLViewMeta } from '@/types/metadata'
import { type FileSystemEntry } from '@/api/fileSystem'
import { type FileMetadata } from '@/types/files'

// Database components
import TableMetadataView from '@/components/database/TableMetadataView.vue'
import ViewStructureView from '@/components/database/ViewStructureView.vue'
import DatabaseObjectDataView from '@/components/database/DatabaseObjectDataView.vue'

// File components
import FileDataView from '@/components/files/FileDataView.vue'
import FileStructureView from '@/components/files/FileStructureView.vue'

defineOptions({
  name: 'ObjectContainer',
  components: { TabGroup, TabList, Tab, TabPanels, TabPanel }
})

// Simplified props approach - use discriminated union with all props optional except the discriminator
const props = defineProps<{
  objectType: 'database' | 'file'
  connectionId: string
  defaultTab?: 'structure' | 'data'
  closable?: boolean
  linkTabs?: boolean
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
          connectionId: props.connectionId
        }
      },
      {
        name: 'Structure',
        component: props.isView ? ViewStructureView : TableMetadataView,
        props: props.isView
          ? {
              viewMeta: props.tableMeta as SQLViewMeta,
              connectionId: props.connectionId,
              connectionType: props.connectionType
            }
          : {
              tableMeta: props.tableMeta as SQLTableMeta,
              connectionId: props.connectionId,
              connectionType: props.connectionType
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

// Compose object display name
const objectDisplayName = computed(() => {
  if (props.objectType === 'file') {
    return props.fileEntry?.name || 'Unknown file'
  } else {
    const meta = props.tableMeta as Partial<SQLTableMeta & SQLViewMeta>
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
    } else {
      emit('refresh-metadata')
    }
  } finally {
    // small delay to show spinner feels responsive even if instant
    setTimeout(() => (isRefreshing.value = false), props.objectType === 'database' ? 300 : 0)
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
    <TabGroup v-model="selectedIndex" as="div" @change="onTabChange">
      <!-- Header with tabs and actions -->
      <div class="border-b border-gray-200 px-4 py-3">
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
