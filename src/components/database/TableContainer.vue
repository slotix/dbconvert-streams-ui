<script setup lang="ts">
import { type SQLTableMeta } from '@/types/metadata'
import { Tab, TabGroup, TabList, TabPanel, TabPanels } from '@headlessui/vue'
import TableMetadataView from './TableMetadataView.vue'
import TableDataView from './TableDataView.vue'

const props = defineProps<{
    tableMeta: SQLTableMeta
    showDdl?: boolean
    connectionId: string
}>()

const emit = defineEmits<{
    (e: 'refresh-metadata'): void
}>()

const tabs = [
    { name: 'Structure', component: 'TableMetadataView' },
    { name: 'Data', component: 'TableDataView' }
]
</script>

<template>
    <div class="bg-white shadow-sm ring-1 ring-gray-900/5 rounded-lg">
        <TabGroup>
            <!-- Main Navigation Tabs -->
            <div class="border-b border-gray-200">
                <TabList class="flex space-x-8 px-6">
                    <Tab v-for="tab in tabs" :key="tab.name" v-slot="{ selected }" as="template">
                        <button :class="[
                            'border-b-2 py-4 px-1 text-sm font-medium',
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
            <TabPanels>
                <!-- Structure Panel -->
                <TabPanel>
                    <TableMetadataView :table-meta="tableMeta" :show-ddl="showDdl" :connection-id="connectionId"
                        class="rounded-none shadow-none ring-0" @refresh-metadata="emit('refresh-metadata')" />
                </TabPanel>

                <!-- Data Panel -->
                <TabPanel>
                    <TableDataView :table-meta="tableMeta" :connection-id="connectionId"
                        class="rounded-none shadow-none ring-0" />
                </TabPanel>
            </TabPanels>
        </TabGroup>
    </div>
</template>