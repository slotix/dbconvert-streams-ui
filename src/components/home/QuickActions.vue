<!-- src/components/home/QuickActions.vue -->
<template>
    <div class="p-6">
        <h2 class="text-xl font-semibold text-gray-900 mb-6">Quick Actions</h2>
        <div class="space-y-4">
            <!-- Create New Stream -->
            <div class="flex items-center justify-between group cursor-pointer hover:bg-gray-50 p-3 rounded-lg transition-colors"
                @click="createNewStream">
                <div class="flex items-center">
                    <div class="flex-shrink-0">
                        <div class="bg-blue-50 rounded-lg p-3 group-hover:bg-blue-100 transition-colors">
                            <PlusCircleIcon class="h-6 w-6 text-blue-600" />
                        </div>
                    </div>
                    <div class="ml-4">
                        <h3 class="text-sm font-semibold text-gray-900">Create Stream</h3>
                        <p class="text-sm text-gray-500">Set up a new data stream</p>
                    </div>
                </div>
                <ArrowTopRightOnSquareIcon class="h-5 w-5 text-gray-400 group-hover:text-gray-600" />
            </div>

            <!-- Create New Connection -->
            <div class="flex items-center justify-between group cursor-pointer hover:bg-gray-50 p-3 rounded-lg transition-colors"
                @click="createNewConnection">
                <div class="flex items-center">
                    <div class="flex-shrink-0">
                        <div class="bg-purple-50 rounded-lg p-3 group-hover:bg-purple-100 transition-colors">
                            <LinkIcon class="h-6 w-6 text-purple-600" />
                        </div>
                    </div>
                    <div class="ml-4">
                        <h3 class="text-sm font-semibold text-gray-900">Create Connection</h3>
                        <p class="text-sm text-gray-500">Connect a new database</p>
                    </div>
                </div>
                <ArrowTopRightOnSquareIcon class="h-5 w-5 text-gray-400 group-hover:text-gray-600" />
            </div>

            <!-- View All Connections -->
            <div class="flex items-center justify-between group cursor-pointer hover:bg-gray-50 p-3 rounded-lg transition-colors"
                @click="viewAllConnections">
                <div class="flex items-center">
                    <div class="flex-shrink-0">
                        <div class="bg-green-50 rounded-lg p-3 group-hover:bg-green-100 transition-colors">
                            <CircleStackIcon class="h-6 w-6 text-green-600" />
                        </div>
                    </div>
                    <div class="ml-4">
                        <h3 class="text-sm font-semibold text-gray-900">All Connections</h3>
                        <p class="text-sm text-gray-500">View database connections</p>
                    </div>
                </div>
                <ArrowTopRightOnSquareIcon class="h-5 w-5 text-gray-400 group-hover:text-gray-600" />
            </div>

            <!-- View All Stream Configurations -->
            <div class="flex items-center justify-between group cursor-pointer hover:bg-gray-50 p-3 rounded-lg transition-colors"
                @click="viewAllStreamConfigurations">
                <div class="flex items-center">
                    <div class="flex-shrink-0">
                        <div class="bg-amber-50 rounded-lg p-3 group-hover:bg-amber-100 transition-colors">
                            <ArrowPathIcon class="h-6 w-6 text-amber-600" />
                        </div>
                    </div>
                    <div class="ml-4">
                        <h3 class="text-sm font-semibold text-gray-900">All Streams</h3>
                        <p class="text-sm text-gray-500">View stream configurations</p>
                    </div>
                </div>
                <ArrowTopRightOnSquareIcon class="h-5 w-5 text-gray-400 group-hover:text-gray-600" />
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useStreamsStore } from '@/stores/streamConfig'
import {
    PlusCircleIcon,
    ArrowPathIcon,
    CircleStackIcon,
    LinkIcon,
    ArrowTopRightOnSquareIcon
} from '@heroicons/vue/24/outline'

const router = useRouter()
const streamsStore = useStreamsStore()

function createNewStream() {
    streamsStore.addStream()
    router.push('/streams/create')
}

function createNewConnection() {
    router.push('/connections?action=create')
}

function viewAllConnections() {
    router.push('/connections')
}

function viewAllStreamConfigurations() {
    router.push('/streams')
}
</script>
