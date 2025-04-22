<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { ArrowPathIcon } from '@heroicons/vue/24/outline'
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

onMounted(() => {
    loadMetadata()
})
</script>

<template>
    <div class="min-h-screen bg-gray-50 py-8">
        <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <!-- Header -->
            <div class="mb-8">
                <div class="flex items-center justify-between">
                    <h1 class="text-2xl font-semibold text-gray-900">Database Structure</h1>
                    <button type="button"
                        class="inline-flex items-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
                        :disabled="isLoading" @click="loadMetadata(true)">
                        <ArrowPathIcon :class="['h-5 w-5 text-gray-400 mr-2', { 'animate-spin': isLoading }]" />
                        Refresh Metadata
                    </button>
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
            <div class="grid grid-cols-12 gap-8">
                <!-- Sidebar -->
                <div class="col-span-4">
                    <div v-if="metadata" class="sticky top-8">
                        <DatabaseStructureTree :metadata="metadata" @select="handleTableSelect" />
                    </div>
                    <div v-else-if="isLoading"
                        class="bg-white shadow-sm ring-1 ring-gray-900/5 rounded-lg p-8 flex items-center justify-center">
                        <ArrowPathIcon class="h-8 w-8 text-gray-400 animate-spin" />
                    </div>
                </div>

                <!-- Main Content -->
                <div class="col-span-8">
                    <div v-if="selectedTable">
                        <TableContainer :table-meta="selectedTable" :show-ddl="true" :connection-id="connectionId" />
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