<script setup lang="ts">
import { computed, type Component } from 'vue'
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
}>()

const emit = defineEmits<{
  (e: 'refresh-metadata'): void
}>()

type TabItem = {
  name: string
  component: Component
  props: Record<string, unknown>
}

const tabs = computed<TabItem[]>(() => {
  const items: TabItem[] = [
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
    },
    {
      name: 'Data',
      component: DatabaseObjectDataView,
      props: {
        tableMeta: props.tableMeta,
        isView: props.isView,
        database: props.database,
        connectionId: props.connectionId
      }
    }
  ]
  return items
})
</script>

<template>
  <div class="bg-white shadow-sm ring-1 ring-gray-900/5 rounded-lg">
    <TabGroup>
      <!-- Main Navigation Tabs -->
      <div class="border-b border-gray-200">
        <TabList class="flex space-x-8 px-6">
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
