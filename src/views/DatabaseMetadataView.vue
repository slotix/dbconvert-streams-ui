<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute } from 'vue-router'
import { ArrowPathIcon, ChevronLeftIcon, ChevronRightIcon, TableCellsIcon, ChartBarIcon } from '@heroicons/vue/24/outline'
import { Tab, TabGroup, TabList, TabPanel, TabPanels } from '@headlessui/vue'
import { useSchemaStore } from '@/stores/schema'
import { useConnectionsStore } from '@/stores/connections'
import { type DatabaseMetadata, type SQLTableMeta, type SQLViewMeta } from '@/types/metadata'
import connections from '@/api/connections'
import DatabaseStructureTree from '@/components/database/DatabaseStructureTree.vue'
import DatabaseObjectContainer from '@/components/database/DatabaseObjectContainer.vue'
import DiagramView from '@/components/database/DiagramView.vue'

const route = useRoute()
const connectionId = route.params.id as string
const schemaStore = useSchemaStore()
const connectionsStore = useConnectionsStore()

const isLoading = ref(false)
const metadata = ref<DatabaseMetadata>()
const selectedObjectName = ref<string | null>(null)
const selectedObjectType = ref<'table' | 'view' | null>(null)
const error = ref<string>()
const isSidebarCollapsed = ref(false)

const connection = computed(() => {
    return connectionsStore.connections.find(conn => conn.id === connectionId)
})

const connectionType = computed(() => {
    return connection.value?.type || 'sql'
})

const selectedObject = computed(() => {
    if (!metadata.value || !selectedObjectName.value || !selectedObjectType.value) return null

    return selectedObjectType.value === 'table'
        ? metadata.value.tables[selectedObjectName.value]
        : metadata.value.views[selectedObjectName.value]
})

const logoSrc = computed(() => {
    const dbType = connectionsStore.dbTypes.find(
        (f) => f.type === connection.value?.type
    )
    return dbType ? dbType.logo : ''
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

onMounted(async () => {
    schemaStore.setConnectionId(connectionId)
    await connectionsStore.refreshConnections()
    await loadMetadata()
})
</script>

<template>
    <div class="min-h-screen bg-gray-50">
        <div class="mx-auto w-full">
            <!-- Header -->
            <div class="mb-4">
                <div class="flex items-center justify-between px-2">
                    <div class="flex items-center gap-4">
                        <div v-if="connection" class="flex items-center gap-2 text-sm text-gray-500">
                            <div class="flex items-center gap-2">
                                <span class="font-medium text-gray-700">{{ connection.host }}:{{ connection.port
                                }}</span>
                                <span class="text-gray-400">•</span>
                                <span class="font-medium text-gray-700">{{ connection.database }}</span>
                                <span v-if="connection.schema" class="text-gray-400">•</span>
                                <span v-if="connection.schema" class="font-medium text-gray-700">{{ connection.schema
                                }}</span>
                            </div>
                        </div>
                    </div>
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
                <TabList class="flex space-x-2 mb-8 border-b border-gray-200">
                    <Tab v-slot="{ selected }" as="template">
                        <button :class="[
                            'px-5 py-2.5 text-sm font-medium rounded-t-lg transition-all duration-200',
                            'focus:outline-none relative',
                            selected
                                ? 'bg-white text-slate-800 border-t border-l border-r border-gray-200 shadow-sm'
                                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                        ]">
                            <span class="flex items-center gap-2">
                                <TableCellsIcon class="h-4 w-4" />
                                Structure & Data
                            </span>
                            <span v-if="selected" class="absolute bottom-0 left-0 w-full h-0.5 bg-slate-600"></span>
                        </button>
                    </Tab>
                    <Tab v-slot="{ selected }" as="template">
                        <button :class="[
                            'px-5 py-2.5 text-sm font-medium rounded-t-lg transition-all duration-200',
                            'focus:outline-none relative',
                            selected
                                ? 'bg-white text-slate-800 border-t border-l border-r border-gray-200 shadow-sm'
                                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                        ]">
                            <span class="flex items-center gap-2">
                                <ChartBarIcon class="h-4 w-4" />
                                Diagram
                            </span>
                            <span v-if="selected" class="absolute bottom-0 left-0 w-full h-0.5 bg-slate-600"></span>
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
                            <button
                                class="absolute left-0 top-6  -translate-y-1/2 bg-white shadow-lg rounded-r-lg p-2 hover:bg-gray-50 transition-colors"
                                :class="{ '-translate-x-1': !isSidebarCollapsed }" @click="toggleSidebar">
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
                                            :is-view="selectedObjectType === 'view'" :connection-id="connectionId"
                                            :connection-type="connectionType" @refresh-metadata="loadMetadata(true)" />
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
