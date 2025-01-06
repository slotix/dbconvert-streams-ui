<template>
    <div class="p-6">
        <h2 class="text-xl font-semibold text-gray-900 mb-6">System Status</h2>

        <div class="space-y-4">
            <div v-if="loading" class="text-center py-4">
                <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
            </div>

            <div v-else-if="error" class="text-center text-red-600 py-4">
                {{ error }}
            </div>

            <div v-else class="space-y-3">
                <div v-for="service in services" :key="service.name"
                    class="flex items-center justify-between group hover:bg-gray-50 p-3 rounded-lg transition-colors">
                    <div class="flex items-center">
                        <div class="flex-shrink-0">
                            <div class="bg-teal-50 rounded-lg p-3 group-hover:bg-teal-100 transition-colors">
                                <ServerIcon class="h-6 w-6 text-teal-600" />
                            </div>
                        </div>
                        <div class="ml-4">
                            <h3 class="text-sm font-semibold text-gray-900">{{ service.name }}</h3>
                            <p class="text-sm text-gray-500">{{ service.description || 'Service status' }}</p>
                        </div>
                    </div>
                    <div class="flex items-center">
                        <span class="inline-flex items-center rounded-full px-2 py-1 text-xs font-medium" :class="{
                            'bg-green-100 text-green-700': service.status === 'Passing',
                            'bg-red-100 text-red-700': service.status === 'Failed',
                            'bg-yellow-100 text-yellow-700': service.status === 'Warning'
                        }">
                            {{ service.status }}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ServerIcon } from '@heroicons/vue/24/outline'

interface Service {
    name: string
    status: string
    description?: string
}

const loading = ref(true)
const error = ref<string | null>(null)
const services = ref<Service[]>([
    { name: 'dbconvert-streams-api', status: 'Passing', description: 'API Service' },
    { name: 'nats', status: 'Passing', description: 'Message Queue' },
    { name: 'dbconvert-streams-source-reader', status: 'Passing', description: 'Source Reader' },
    { name: 'dbconvert-streams-target-writer', status: 'Passing', description: 'Target Writer' },
    { name: 'vault', status: 'Passing', description: 'Secrets Management' }
])

onMounted(async () => {
    try {
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000))
        loading.value = false
    } catch (e) {
        error.value = 'Failed to load system status'
        loading.value = false
    }
})
</script>
