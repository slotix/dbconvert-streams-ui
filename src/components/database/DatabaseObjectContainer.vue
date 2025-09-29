<script setup lang="ts">
import { computed, ref, watch, type Component } from 'vue'
import { Tab, TabGroup, TabList, TabPanel, TabPanels } from '@headlessui/vue'
import { type SQLTableMeta, type SQLViewMeta } from '@/types/metadata'
import TableMetadataView from './TableMetadataView.vue'
import ViewStructureView from './ViewStructureView.vue'
import DatabaseObjectDataView from './DatabaseObjectDataView.vue'

// Ensure some tooling recognizes these imports are used via options; also sets a friendly name
defineOptions({
  name: 'DatabaseObjectContainer',
  components: { TabGroup, TabList, Tab, TabPanels, TabPanel }
})

const props = defineProps<{
  tableMeta: SQLTableMeta | SQLViewMeta
  isView: boolean
  connectionId: string
  connectionType: string
  database: string
  defaultTab?: 'structure' | 'data'
  closable?: boolean
}>()

const emit = defineEmits<{
  (e: 'refresh-metadata'): void
  (e: 'close'): void
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
  return items
})

// Select Data (index 0) by default unless caller explicitly requests Structure
const defaultIndex = computed(() => (props.defaultTab === 'structure' ? 1 : 0))

// Control the selected tab index so switching defaultTab from the outside takes effect
const selectedIndex = ref<number>(defaultIndex.value)
watch(defaultIndex, (val) => {
  selectedIndex.value = val
})
</script>

<template>
  <div class="bg-white shadow-sm ring-1 ring-gray-900/5 rounded-lg">
    <TabGroup :selectedIndex="selectedIndex" :defaultIndex="defaultIndex" @change="(i) => (selectedIndex = i)">
      <!-- Main Navigation Tabs + optional close -->
      <div class="border-b border-gray-200 flex items-center justify-between px-6">
        <TabList class="flex space-x-8">
          <Tab v-for="tab in tabs" :key="tab.name" v-slot="{ selected }" as="template">
            <button :class="[
              'border-b-2 py-4 px-1 text-sm font-medium whitespace-nowrap transition-colors duration-150',
              selected
                ? 'border-slate-500 text-slate-600'
                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
            ]">
              {{ tab.name }}
            </button>
          </Tab>
        </TabList>
        <button v-if="props.closable" class="text-gray-400 hover:text-gray-700 text-lg leading-none px-2 py-1"
          aria-label="Close" @click="emit('close')">
          ×
        </button>
      </div>

      <!-- Tab Panels -->
      <TabPanels class="overflow-hidden">
        <TabPanel v-for="tab in tabs" :key="tab.name">
          <component :is="tab.component" v-bind="tab.props" @refresh-metadata="emit('refresh-metadata')" />
        </TabPanel>
      </TabPanels>
    </TabGroup>
  </div>
</template>
