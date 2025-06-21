<template>
  <div class="p-6 space-y-6">
    <h2 class="text-xl font-semibold text-gray-900">System Status</h2>

    <!-- Loading state -->
    <div v-if="isInitialLoading" class="animate-pulse space-y-4">
      <div v-for="i in 6" :key="i" class="h-16 bg-gray-100 rounded-lg"></div>
    </div>

    <!-- Service Status Cards -->
    <div v-else class="grid gap-3">
      <div
        v-for="service in services"
        :key="service.id"
        class="flex items-center justify-between p-3 rounded-lg bg-white transition-colors"
        :class="[
          getServiceStatus(service.id) === 'passing'
            ? 'border-emerald-100 hover:bg-emerald-50/50'
            : getServiceStatus(service.id) === 'warning'
              ? 'border-yellow-100 hover:bg-yellow-50/50'
              : getServiceStatus(service.id) === 'critical'
                ? 'border-red-100 hover:bg-red-50/50'
                : 'border-gray-100 hover:bg-gray-50/50'
        ]"
      >
        <div class="flex items-center space-x-3">
          <div class="rounded-lg p-2" :class="[service.bgColor]">
            <component :is="service.icon" class="h-5 w-5" :class="[service.iconColor]" />
          </div>
          <div>
            <h3 class="text-sm font-medium text-gray-900">{{ service.name }}</h3>
            <p class="text-xs text-gray-500">{{ service.description }}</p>
          </div>
        </div>
        <span
          class="px-2 py-1 rounded-full text-xs font-medium"
          :class="getStatusClasses(getServiceStatus(service.id))"
        >
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
  KeyIcon,
  ChartBarIcon
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
  },
  {
    id: 'sentry',
    name: 'sentry',
    description: 'Usage Tracking & Limits',
    icon: ChartBarIcon,
    bgColor: 'bg-indigo-50',
    iconColor: 'text-indigo-600'
  }
]

const commonStore = useCommonStore()
const pollingInterval = ref<number | null>(null)
const serviceStatuses = computed(() => commonStore.serviceStatuses)
const isInitialLoading = ref(true)

const getServiceStatus = (serviceId: string): string => {
  // If backend is disconnected, all services are unavailable
  if (!commonStore.isBackendConnected) {
    return 'unavailable'
  }
  
  if (serviceId === 'sentry') {
    return commonStore.sentryHealthy ? 'passing' : 'critical'
  }
  const status = commonStore.serviceStatuses.find((s) => s.name.toLowerCase().includes(serviceId))
  return status?.status || 'unknown'
}

const getStatusClasses = (status: string) => ({
  'bg-emerald-100 text-emerald-700': status === 'passing',
  'bg-red-100 text-red-700': status === 'critical',
  'bg-yellow-100 text-yellow-700': status === 'warning',
  'bg-gray-100 text-gray-700': status === 'unknown' || status === 'unavailable'
})

onMounted(async () => {
  try {
    await commonStore.fetchServiceStatus()
    commonStore.clearError()
    isInitialLoading.value = false
  } catch (error) {
    console.error('Failed to fetch initial service status:', error)
  } finally {
    isInitialLoading.value = false
  }

  // Start polling after initial load - reduced to 10 seconds for more responsive updates
  pollingInterval.value = window.setInterval(() => {
    // Only poll if backend is connected
    if (commonStore.isBackendConnected) {
      commonStore.fetchServiceStatus().then(() => {
        commonStore.clearError()
      }).catch((error) => {
        console.warn('Service status polling failed:', error)
      })
    }
  }, 10000)
})

onUnmounted(() => {
  if (pollingInterval.value) {
    clearInterval(pollingInterval.value)
  }
})
</script>
