<template>
    <div class="p-6">
        <h2 class="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
            <ServerIcon class="h-6 w-6 text-gray-600" />
            System Status
        </h2>
        <div class="space-y-4">
            <div v-for="service in services" :key="service.id"
                class="flex items-center justify-between p-4 rounded-xl border border-gray-100 bg-white">
                <div class="flex items-center">
                    <div class="flex-shrink-0">
                        <div :class="service.bgColor" class="rounded-lg p-3">
                            <component :is="service.icon" class="h-6 w-6" :class="service.iconColor" />
                        </div>
                    </div>
                    <div class="ml-4">
                        <h3 class="text-sm font-semibold text-gray-900">{{ service.name }}</h3>
                        <p class="text-sm text-gray-500">{{ service.description }}</p>
                    </div>
                </div>
                <span class="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium"
                    :class="getStatusClasses(isBackendConnected)">
                    {{ getStatusText(isBackendConnected) }}
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

interface Service {
    id: string
    name: string
    description: string
    icon: typeof CloudIcon
    bgColor: string
    iconColor: string
}

const services: Service[] = [
    {
        id: 'api',
        name: 'dbconvert-streams-api',
        description: 'API Service',
        icon: CloudIcon,
        bgColor: 'bg-blue-50',
        iconColor: 'text-blue-600'
    },
    {
        id: 'reader',
        name: 'dbconvert-streams-source-reader',
        description: 'Source Reader',
        icon: ArrowDownTrayIcon,
        bgColor: 'bg-emerald-50',
        iconColor: 'text-emerald-600'
    },
    {
        id: 'writer',
        name: 'dbconvert-streams-target-writer',
        description: 'Target Writer',
        icon: ArrowUpTrayIcon,
        bgColor: 'bg-amber-50',
        iconColor: 'text-amber-600'
    },
    {
        id: 'queue',
        name: 'nats',
        description: 'Message Queue',
        icon: QueueListIcon,
        bgColor: 'bg-violet-50',
        iconColor: 'text-violet-600'
    },
    {
        id: 'vault',
        name: 'vault',
        description: 'Secrets Management',
        icon: KeyIcon,
        bgColor: 'bg-rose-50',
        iconColor: 'text-rose-600'
    }
]

const commonStore = useCommonStore()
const isBackendConnected = computed(() => commonStore.isBackendConnected)

const getStatusClasses = (isConnected: boolean) => ({
    'bg-green-100 text-green-700': isConnected,
    'bg-red-100 text-red-700': !isConnected
})

const getStatusText = (isConnected: boolean) => isConnected ? 'Passing' : 'Failed'
</script>
