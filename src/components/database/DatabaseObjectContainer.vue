<script setup lang="ts">
import { computed } from 'vue'
import { Tab, TabGroup, TabList, TabPanel, TabPanels } from '@headlessui/vue'
import { type SQLTableMeta, type SQLViewMeta } from '@/types/metadata'
import TableMetadataView from './TableMetadataView.vue'
import ViewStructureView from './ViewStructureView.vue'
import DatabaseObjectDataView from './DatabaseObjectDataView.vue'

const props = defineProps<{
    tableMeta: SQLTableMeta | SQLViewMeta
    isView: boolean
    showDdl?: boolean
    connectionId: string
}>()

const emit = defineEmits<{
    (e: 'refresh-metadata'): void
}>()

// Debug log to inspect the tableMeta prop
console.log('DatabaseObjectContainer props:', {
    tableMeta: props.tableMeta,
    isView: props.isView
})

const tabs = computed(() => {
    const commonTabs = [
        {
            name: 'Structure',
            component: props.isView ? ViewStructureView : TableMetadataView,
            props: props.isView
                ? { viewMeta: props.tableMeta as SQLViewMeta }
                : { tableMeta: props.tableMeta as SQLTableMeta }
        },
        {
            name: 'Data',
            component: DatabaseObjectDataView,
            props: {
                tableMeta: props.tableMeta,
                isView: props.isView
            }
        }
    ]
    return commonTabs
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
                            'border-b-2 py-4 px-1 text-sm font-medium whitespace-nowrap',
                            selected
                                ? 'border-blue-500 text-blue-600'
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
                    <component :is="tab.component" v-bind="tab.props" :show-ddl="showDdl" :connection-id="connectionId"
                        @refresh-metadata="emit('refresh-metadata')" />
                </TabPanel>
            </TabPanels>
        </TabGroup>
    </div>
</template>