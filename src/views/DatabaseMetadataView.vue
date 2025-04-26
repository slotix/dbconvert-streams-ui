<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute } from 'vue-router'
import { ArrowPathIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/vue/24/outline'
import { Tab, TabGroup, TabList, TabPanel, TabPanels } from '@headlessui/vue'
import { useSchemaStore } from '@/stores/schema'
import { type DatabaseMetadata, type SQLTableMeta, type SQLViewMeta } from '@/types/metadata'
import connections from '@/api/connections'
import DatabaseStructureTree from '@/components/database/DatabaseStructureTree.vue'
import DatabaseObjectContainer from '@/components/database/DatabaseObjectContainer.vue'
import DiagramView from '@/components/database/DiagramView.vue'

const route = useRoute()
const connectionId = route.params.id as string
const schemaStore = useSchemaStore()

const isLoading = ref(false)
const metadata = ref<DatabaseMetadata>()
const selectedObjectName = ref<string | null>(null)
const selectedObjectType = ref<'table' | 'view' | null>(null)
const error = ref<string>()
const isSidebarCollapsed = ref(false)

const selectedObject = computed(() => {
    if (!metadata.value || !selectedObjectName.value || !selectedObjectType.value) return null

    return selectedObjectType.value === 'table'
        ? metadata.value.tables[selectedObjectName.value]
        : metadata.value.views[selectedObjectName.value]
})

async function loadMetadata(forceRefresh = false) {
    isLoading.value = true
    error.value = undefined

    try {
        metadata.value = await connections.getMetadata(connectionId, forceRefresh)
        await schemaStore.fetchSchema(forceRefresh)

        // Select the first table by default if none is selected
        if (!selectedObjectName.value && metadata.value) {
            const firstTableName = Object.keys(metadata.value.tables)[0]
            if (firstTableName) {
                selectedObjectName.value = firstTableName
                selectedObjectType.value = 'table'
            }
        }
    } catch (err) {
        error.value = err instanceof Error ? err.message : 'Failed to load metadata'
    } finally {
        isLoading.value = false
    }
}

function handleObjectSelect(name: string, type: 'table' | 'view') {
    selectedObjectName.value = name
    selectedObjectType.value = type
}

function toggleSidebar() {
    isSidebarCollapsed.value = !isSidebarCollapsed.value
}

onMounted(() => {
    schemaStore.setConnectionId(connectionId)
    loadMetadata()
})
</script>

<template>
    <div class="min-h-screen bg-gray-50 py-8">
        <div class="mx-auto max-w-[98%] px-4 sm:px-6 lg:px-8">
            <!-- Header -->
            <div class="mb-8">
                <div class="flex flex-wrap items-center justify-between gap-4">
                    <h1 class="text-2xl font-semibold text-gray-900">Database Explorer</h1>
                </div>
            </div>

            <div v-if="error" class="rounded-md bg-red-50 p-4 mb-8">
                <div class="flex">
                    <div class="ml-3">
                        <h3 class="text-sm font-medium text-red-800">Error loading metadata</h3>
                        <div class="mt-2 text-sm text-red-700">
                            {{ error }}
                        </div>
                    </div>
                </div>
            </div>

            <!-- Main Tabs -->
            <TabGroup>
                <TabList class="flex space-x-1 border-b border-gray-200 mb-8">
                    <Tab v-slot="{ selected }" as="template">
                        <button :class="[
                            'px-3 py-2 text-sm font-medium leading-5',
                            'focus:outline-none focus:ring-2 ring-offset-2 ring-offset-blue-400 ring-white ring-opacity-60',
                            selected
                                ? 'border-blue-500 text-blue-600 border-b-2 -mb-px'
                                : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        ]">
                            Structure & Data
                        </button>
                    </Tab>
                    <Tab v-slot="{ selected }" as="template">
                        <button :class="[
                            'px-3 py-2 text-sm font-medium leading-5',
                            'focus:outline-none focus:ring-2 ring-offset-2 ring-offset-blue-400 ring-white ring-opacity-60',
                            selected
                                ? 'border-blue-500 text-blue-600 border-b-2 -mb-px'
                                : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        ]">
                            Diagram
                        </button>
                    </Tab>
                </TabList>

                <TabPanels>
                    <!-- Structure Panel -->
                    <TabPanel>
                        <div class="flex gap-8 relative">
                            <!-- Sidebar -->
                            <div :class="[
                                'transition-all duration-300 ease-in-out',
                                isSidebarCollapsed ? 'w-0 opacity-0' : 'w-[300px] opacity-100'
                            ]">
                                <div v-if="metadata" class="sticky top-8">
                                    <DatabaseStructureTree :metadata="metadata" :selected-name="selectedObjectName"
                                        :selected-type="selectedObjectType" @select="handleObjectSelect" />
                                </div>
                                <div v-else-if="isLoading"
                                    class="bg-white shadow-sm ring-1 ring-gray-900/5 rounded-lg p-8 flex items-center justify-center">
                                    <ArrowPathIcon class="h-8 w-8 text-gray-400 animate-spin" />
                                </div>
                            </div>

                            <!-- Sidebar Toggle Button -->
                            <button @click="toggleSidebar"
                                class="absolute left-0 top-1/2 -translate-y-1/2 bg-white shadow-lg rounded-r-lg p-2 hover:bg-gray-50 transition-colors"
                                :class="{ '-translate-x-1': !isSidebarCollapsed }">
                                <component :is="isSidebarCollapsed ? ChevronRightIcon : ChevronLeftIcon"
                                    class="h-5 w-5 text-gray-500" />
                            </button>

                            <!-- Main Content -->
                            <div :class="[
                                'transition-all duration-300 ease-in-out flex-1 min-w-0 overflow-x-auto',
                                isSidebarCollapsed ? 'ml-8' : ''
                            ]">
                                <div class="flex-1 min-w-0">
                                    <div v-if="selectedObject">
                                        <DatabaseObjectContainer :table-meta="selectedObject"
                                            :is-view="selectedObjectType === 'view'" :show-ddl="true"
                                            :connection-id="connectionId" @refresh-metadata="loadMetadata(true)" />
                                    </div>
                                    <div v-else
                                        class="bg-white shadow-sm ring-1 ring-gray-900/5 rounded-lg p-8 text-center">
                                        <h3 class="text-sm font-medium text-gray-900">No object selected</h3>
                                        <p class="mt-1 text-sm text-gray-500">
                                            Select a table or view from the sidebar to view its structure
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </TabPanel>

                    <!-- Diagram Panel -->
                    <TabPanel>
                        <div class="bg-white shadow-sm ring-1 ring-gray-900/5 rounded-lg">
                            <DiagramView :tables="schemaStore.tables" :views="schemaStore.views"
                                :relationships="schemaStore.relationships" />
                        </div>
                    </TabPanel>
                </TabPanels>
            </TabGroup>
        </div>
    </div>
</template>