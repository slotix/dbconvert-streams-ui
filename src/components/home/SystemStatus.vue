<template>
    <div class="p-6">
        <h2 class="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
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
                    :class="getStatusClasses(getServiceStatus(service.id))">
                    {{ getServiceStatus(service.id) }}
                </span>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useCommonStore } from '@/stores/common'
import {
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
        name: 'stream-api',
        description: 'API Service',
        icon: CloudIcon,
        bgColor: 'bg-blue-50',
        iconColor: 'text-blue-600'
    },
    {
        id: 'reader',
        name: 'stream-reader',
        description: 'Source Reader',
        icon: ArrowDownTrayIcon,
        bgColor: 'bg-emerald-50',
        iconColor: 'text-emerald-600'
    },
    {
        id: 'writer',
        name: 'stream-writer',
        description: 'Target Writer',
        icon: ArrowUpTrayIcon,
        bgColor: 'bg-amber-50',
        iconColor: 'text-amber-600'
    },
    {
        id: 'nats',
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
const pollingInterval = ref<number | null>(null)

const getServiceStatus = (serviceId: string): string => {
    const status = commonStore.serviceStatuses.find(s => s.name.toLowerCase().includes(serviceId))
    return status?.status || 'unknown'
}

const getStatusClasses = (status: string) => ({
    'bg-green-100 text-green-700': status === 'passing',
    'bg-red-100 text-red-700': status === 'critical',
    'bg-yellow-100 text-yellow-700': status === 'warning',
    'bg-gray-100 text-gray-700': status === 'unknown'
})

onMounted(() => {
    commonStore.fetchServiceStatus()
    // Poll for service status every 30 seconds
    pollingInterval.value = window.setInterval(() => commonStore.fetchServiceStatus(), 30000)
})

onUnmounted(() => {
    if (pollingInterval.value) {
        clearInterval(pollingInterval.value)
    }
})
</script>
