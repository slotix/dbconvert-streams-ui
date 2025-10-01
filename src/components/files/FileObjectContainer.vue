<script setup lang="ts">
import { computed, ref, watch, type Component } from 'vue'
import { ArrowPathIcon } from '@heroicons/vue/24/outline'
import { Tab, TabGroup, TabList, TabPanel, TabPanels } from '@headlessui/vue'
import { type FileSystemEntry } from '@/api/fileSystem'
import { type FileMetadata } from '@/types/files'
import FileDataView from './FileDataView.vue'
import FileStructureView from './FileStructureView.vue'

// Ensure some tooling recognizes these imports are used via options
defineOptions({
  name: 'FileObjectContainer',
  components: { TabGroup, TabList, Tab, TabPanels, TabPanel }
})

const props = defineProps<{
  entry: FileSystemEntry
  metadata: FileMetadata | null
  connectionId: string
  defaultTab?: 'structure' | 'data'
  closable?: boolean
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
  const items: TabItem[] = [
    {
      name: 'Data',
      component: FileDataView,
      props: {
        entry: props.entry,
        metadata: props.metadata,
        connectionId: props.connectionId
      }
    },
    {
      name: 'Structure',
      component: FileStructureView,
      props: {
        entry: props.entry,
        metadata: props.metadata,
        connectionId: props.connectionId
      }
    }
  ]
  return items
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

// File display name (just the filename)
const objectDisplayName = computed(() => props.entry.name)

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
    isRefreshing.value = false
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
