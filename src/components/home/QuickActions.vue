<!-- src/components/home/QuickActions.vue -->
<template>
    <div class="bg-white shadow rounded-lg p-6 h-full">
        <h2 class="text-xl font-semibold text-gray-900 mb-6">Quick Actions</h2>
        <div class="space-y-4">
            <!-- Create New Stream -->
            <div class="flex items-center group cursor-pointer" @click="createNewStream">
                <div class="flex-shrink-0">
                    <div class="bg-gray-50 rounded-md p-4 group-hover:bg-gray-100 transition-colors w-14 h-14 flex items-center justify-center">
                        <PlusCircleIcon class="h-8 w-8 text-blue-600" />
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
                    <div class="bg-gray-50 rounded-md p-4 group-hover:bg-gray-100 transition-colors w-14 h-14 flex items-center justify-center">
                        <LinkIcon class="h-8 w-8 text-purple-600" />
                    </div>
                </div>
                <div class="ml-4">
                    <h3 class="text-sm font-semibold text-gray-900">Create Connection</h3>
                    <p class="text-sm text-gray-500">Connect a new database</p>
                </div>
            </div>

            <!-- View All Connections -->
            <div class="flex items-center group cursor-pointer" @click="viewAllConnections">
                <div class="flex-shrink-0">
                    <div class="bg-gray-50 rounded-md p-4 group-hover:bg-gray-100 transition-colors w-14 h-14 flex items-center justify-center">
                        <CircleStackIcon class="h-8 w-8 text-emerald-600" />
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
                    <div class="bg-gray-50 rounded-md p-4 group-hover:bg-gray-100 transition-colors w-14 h-14 flex items-center justify-center">
                        <ArrowPathIcon class="h-8 w-8 text-amber-600" />
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
import { CircleStackIcon, ArrowPathIcon, PlusCircleIcon, LinkIcon } from '@heroicons/vue/24/outline'

const router = useRouter()

function createNewStream() {
    useStreamsStore().addStream()
    router.push({ name: 'ManageStream', params: { mode: 'add' } })
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
