<template>
    <div class="bg-white shadow rounded-lg p-6 h-full">
        <h2 class="text-xl font-semibold text-gray-900 mb-6">System Status</h2>
        
        <div class="space-y-4">
            <div v-if="loading" class="text-center py-4">
                <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
            </div>

            <div v-else-if="error" class="text-center text-red-600 py-4">
                {{ error }}
            </div>

            <template v-else>
                <div v-for="service in services" :key="service.name" class="flex items-center">
                    <div class="flex-shrink-0">
                        <div class="rounded-full h-3 w-3 mr-3" :class="{
                            'bg-green-500': service.status === 'passing',
                            'bg-red-500': service.status === 'critical',
                            'bg-yellow-500': service.status === 'warning',
                            'bg-gray-500': service.status === 'unknown'
                        }">
                        </div>
                    </div>
                    <div class="flex-grow">
                        <h3 class="text-sm font-medium text-gray-900">{{ service.name }}</h3>
                    </div>
                    <div class="text-sm text-gray-500 capitalize">{{ service.status }}</div>
                </div>
            </template>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import api from '@/api/apiClient'
import { ServiceStatus, ServiceStatusResponse } from '@/types/common'

const services = ref<ServiceStatus[]>([])
const loading = ref(true)
const error = ref<string | null>(null)

async function fetchServiceStatus() {
    try {
        loading.value = true
        const response = await api.getServiceStatus() as ServiceStatusResponse
        services.value = response.services || []
    } catch (err) {
        error.value = 'Failed to load system status'
        console.error('Error fetching service status:', err)
    } finally {
        loading.value = false
    }
}

onMounted(() => {
    fetchServiceStatus()
    // Optionally set up polling to refresh status periodically
    const interval = setInterval(fetchServiceStatus, 30000) // every 30 seconds

    // Clean up interval on component unmount
    onUnmounted(() => clearInterval(interval))
})
</script>

