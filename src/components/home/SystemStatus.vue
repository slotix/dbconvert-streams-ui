<template>
    <div class="p-6">
        <h2 class="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
            <ServerIcon class="h-6 w-6 text-gray-600" />
            System Status
        </h2>
        <div class="space-y-4">
            <!-- API Service -->
            <div class="flex items-center justify-between p-4 rounded-xl border border-gray-100 bg-white">
                <div class="flex items-center">
                    <div class="flex-shrink-0">
                        <div class="bg-blue-50 rounded-lg p-3">
                            <CloudIcon class="h-6 w-6 text-blue-600" />
                        </div>
                    </div>
                    <div class="ml-4">
                        <h3 class="text-sm font-semibold text-gray-900">dbconvert-streams-api</h3>
                        <p class="text-sm text-gray-500">API Service</p>
                    </div>
                </div>
                <span class="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium" :class="{
                    'bg-green-100 text-green-700': isBackendConnected,
                    'bg-red-100 text-red-700': !isBackendConnected
                }">
                    {{ isBackendConnected ? 'Passing' : 'Failed' }}
                </span>
            </div>

            <!-- Message Queue -->
            <div class="flex items-center justify-between p-4 rounded-xl border border-gray-100 bg-white">
                <div class="flex items-center">
                    <div class="flex-shrink-0">
                        <div class="bg-violet-50 rounded-lg p-3">
                            <QueueListIcon class="h-6 w-6 text-violet-600" />
                        </div>
                    </div>
                    <div class="ml-4">
                        <h3 class="text-sm font-semibold text-gray-900">nats</h3>
                        <p class="text-sm text-gray-500">Message Queue</p>
                    </div>
                </div>
                <span class="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium" :class="{
                    'bg-green-100 text-green-700': isBackendConnected,
                    'bg-red-100 text-red-700': !isBackendConnected
                }">
                    {{ isBackendConnected ? 'Passing' : 'Failed' }}
                </span>
            </div>

            <!-- Source Reader -->
            <div class="flex items-center justify-between p-4 rounded-xl border border-gray-100 bg-white">
                <div class="flex items-center">
                    <div class="flex-shrink-0">
                        <div class="bg-emerald-50 rounded-lg p-3">
                            <ArrowDownTrayIcon class="h-6 w-6 text-emerald-600" />
                        </div>
                    </div>
                    <div class="ml-4">
                        <h3 class="text-sm font-semibold text-gray-900">dbconvert-streams-source-reader</h3>
                        <p class="text-sm text-gray-500">Source Reader</p>
                    </div>
                </div>
                <span class="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium" :class="{
                    'bg-green-100 text-green-700': isBackendConnected,
                    'bg-red-100 text-red-700': !isBackendConnected
                }">
                    {{ isBackendConnected ? 'Passing' : 'Failed' }}
                </span>
            </div>

            <!-- Target Writer -->
            <div class="flex items-center justify-between p-4 rounded-xl border border-gray-100 bg-white">
                <div class="flex items-center">
                    <div class="flex-shrink-0">
                        <div class="bg-amber-50 rounded-lg p-3">
                            <ArrowUpTrayIcon class="h-6 w-6 text-amber-600" />
                        </div>
                    </div>
                    <div class="ml-4">
                        <h3 class="text-sm font-semibold text-gray-900">dbconvert-streams-target-writer</h3>
                        <p class="text-sm text-gray-500">Target Writer</p>
                    </div>
                </div>
                <span class="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium" :class="{
                    'bg-green-100 text-green-700': isBackendConnected,
                    'bg-red-100 text-red-700': !isBackendConnected
                }">
                    {{ isBackendConnected ? 'Passing' : 'Failed' }}
                </span>
            </div>

            <!-- Vault -->
            <div class="flex items-center justify-between p-4 rounded-xl border border-gray-100 bg-white">
                <div class="flex items-center">
                    <div class="flex-shrink-0">
                        <div class="bg-rose-50 rounded-lg p-3">
                            <KeyIcon class="h-6 w-6 text-rose-600" />
                        </div>
                    </div>
                    <div class="ml-4">
                        <h3 class="text-sm font-semibold text-gray-900">vault</h3>
                        <p class="text-sm text-gray-500">Secrets Management</p>
                    </div>
                </div>
                <span class="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium" :class="{
                    'bg-green-100 text-green-700': isBackendConnected,
                    'bg-red-100 text-red-700': !isBackendConnected
                }">
                    {{ isBackendConnected ? 'Passing' : 'Failed' }}
                </span>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useCommonStore } from '@/stores/common'
import {
    ServerIcon,
    CloudIcon,
    QueueListIcon,
    ArrowDownTrayIcon,
    ArrowUpTrayIcon,
    KeyIcon
} from '@heroicons/vue/24/outline'

const commonStore = useCommonStore()
const isBackendConnected = computed(() => commonStore.isBackendConnected)
</script>
