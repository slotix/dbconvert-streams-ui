<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { ArrowPathIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/vue/24/outline'
import { useConnectionsStore } from '@/stores/connections'
import { type DatabaseMetadata, type SQLTableMeta } from '@/types/metadata'
import connections from '@/api/connections'
import DatabaseStructureTree from '@/components/database/DatabaseStructureTree.vue'
import TableContainer from '@/components/database/TableContainer.vue'

const route = useRoute()
const connectionId = route.params.id as string

const isLoading = ref(false)
const metadata = ref<DatabaseMetadata>()
const selectedTable = ref<SQLTableMeta>()
const error = ref<string>()
const isSidebarCollapsed = ref(false)

async function loadMetadata(forceRefresh = false) {
    isLoading.value = true
    error.value = undefined

    try {
        metadata.value = await connections.getMetadata(connectionId, forceRefresh)
    } catch (err) {
        error.value = err instanceof Error ? err.message : 'Failed to load metadata'
    } finally {
        isLoading.value = false
    }
}

function handleTableSelect(table: SQLTableMeta) {
    selectedTable.value = table
}

function toggleSidebar() {
    isSidebarCollapsed.value = !isSidebarCollapsed.value
}

onMounted(() => {
    loadMetadata()
})
</script>

<template>
    <div class="min-h-screen bg-gray-50 py-8">
        <div class="mx-auto max-w-[98%] px-4 sm:px-6 lg:px-8">
            <!-- Header -->
            <div class="mb-8">
                <div class="flex items-center justify-between">
                    <h1 class="text-2xl font-semibold text-gray-900">Database Structure</h1>
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

            <!-- Content -->
            <div class="flex gap-8 relative">
                <!-- Sidebar -->
                <div :class="[
                    'transition-all duration-300 ease-in-out',
                    isSidebarCollapsed ? 'w-0 opacity-0' : 'w-[300px] opacity-100'
                ]">
                    <div v-if="metadata" class="sticky top-8">
                        <DatabaseStructureTree :metadata="metadata" @select="handleTableSelect" />
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
                    'transition-all duration-300 ease-in-out flex-1',
                    isSidebarCollapsed ? 'ml-8' : ''
                ]">
                    <div v-if="selectedTable">
                        <TableContainer :table-meta="selectedTable" :show-ddl="true" :connection-id="connectionId"
                            @refresh-metadata="loadMetadata(true)" />
                    </div>
                    <div v-else class="bg-white shadow-sm ring-1 ring-gray-900/5 rounded-lg p-8 text-center">
                        <h3 class="text-sm font-medium text-gray-900">No table selected</h3>
                        <p class="mt-1 text-sm text-gray-500">
                            Select a table from the sidebar to view its structure
                        </p>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>