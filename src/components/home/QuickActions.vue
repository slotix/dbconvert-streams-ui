<!-- src/components/home/QuickActions.vue -->
<template>
    <div class="bg-white shadow rounded-lg p-6 h-full">
        <h2 class="text-xl font-semibold text-gray-900 mb-6">Quick Actions</h2>
        <div class="space-y-4">
            <!-- Create New Stream -->
            <div class="flex items-center group cursor-pointer" @click="createNewStream">
                <div class="flex-shrink-0">
                    <div class="bg-blue-50 rounded-md p-3 group-hover:bg-blue-100 transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                    </div>
                </div>
                <div class="ml-4">
                    <h3 class="text-sm font-semibold text-gray-900">Create Stream</h3>
                    <p class="text-sm text-gray-500">Set up a new data stream</p>
                </div>
            </div>

            <!-- Add New Database Connection -->
            <div class="flex items-center group cursor-pointer" @click="addNewDatabaseConnection">
                <div class="flex-shrink-0">
                    <div class="bg-green-50 rounded-md p-3 group-hover:bg-green-100 transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 7v10c0 2 1.5 3 3.5 3h9c2 0 3.5-1 3.5-3V7c0-2-1.5-3-3.5-3h-9C5.5 4 4 5 4 7z" />
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h8" />
                        </svg>
                    </div>
                </div>
                <div class="ml-4">
                    <h3 class="text-sm font-semibold text-gray-900">Add Connection</h3>
                    <p class="text-sm text-gray-500">Connect a new database</p>
                </div>
            </div>

            <!-- View All Connections -->
            <div class="flex items-center group cursor-pointer" @click="viewAllConnections">
                <div class="flex-shrink-0">
                    <div class="bg-purple-50 rounded-md p-3 group-hover:bg-purple-100 transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                        </svg>
                    </div>
                </div>
                <div class="ml-4">
                    <h3 class="text-sm font-semibold text-gray-900">All Connections</h3>
                    <p class="text-sm text-gray-500">View database connections</p>
                </div>
            </div>

            <!-- View All Stream Configurations -->
            <div class="flex items-center group cursor-pointer" @click="viewAllStreamConfigurations">
                <div class="flex-shrink-0">
                    <div class="bg-orange-50 rounded-md p-3 group-hover:bg-orange-100 transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                    </div>
                </div>
                <div class="ml-4">
                    <h3 class="text-sm font-semibold text-gray-900">All Streams</h3>
                    <p class="text-sm text-gray-500">View stream configurations</p>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useStreamsStore } from '@/stores/streamConfig'
import { useCommonStore } from '@/stores/common'
const router = useRouter()

function createNewStream() {
    useStreamsStore().addStream()
}

function addNewDatabaseConnection() {
    useCommonStore().openModal('Add')
    router.push({ name: 'Connections' })
}

function viewAllConnections() {
    router.push({ name: 'Connections' })
}

function viewAllStreamConfigurations() {
    router.push({ name: 'Streams' })
}
</script>
