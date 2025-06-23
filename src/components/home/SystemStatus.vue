<template>
  <div class="p-6 space-y-6">
    <div class="flex items-center justify-between">
      <h2 class="text-xl font-semibold text-gray-900">System Status</h2>
      <!-- Show initialization notice during grace period -->
      <div v-if="isWithinGracePeriod() && !isInitialLoading" class="flex items-center text-sm text-blue-600">
        <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        Services are starting up...
      </div>
    </div>

    <!-- Loading state -->
    <div v-if="isInitialLoading" class="animate-pulse space-y-4">
      <div v-for="i in 6" :key="i" class="h-16 bg-gray-100 rounded-lg"></div>
    </div>

    <!-- Initialization Help Text -->
    <div v-else-if="isWithinGracePeriod() && hasInitializingServices()" class="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
      <div class="flex items-start">
        <svg class="flex-shrink-0 h-5 w-5 text-blue-400 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"></path>
        </svg>
        <div class="ml-3">
          <h3 class="text-sm font-medium text-blue-800">Services are starting up</h3>
          <p class="mt-1 text-sm text-blue-700">
            DBConvert Streams services are initializing. Health checks need time to verify that all components are ready. 
            This typically takes 10-30 seconds. Services showing "starting..." will automatically change to "healthy" once they're fully operational.
          </p>
          <div class="mt-2 text-xs text-blue-600">
            <strong>Status meanings:</strong> 
            <span class="inline-block mr-3">🔵 starting... = initializing</span>
            <span class="inline-block mr-3">🟢 healthy = working normally</span>
            <span class="inline-block">🟠 offline = not working</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Service Status Cards -->
    <div v-else>
      <div class="grid gap-3">
      <div
        v-for="service in services"
        :key="service.id"
        class="flex items-center justify-between p-3 rounded-lg bg-white transition-colors"
        :class="[
          getServiceStatus(service.id) === 'passing'
            ? 'border-emerald-100 hover:bg-emerald-50/50'
            : getServiceStatus(service.id) === 'initializing'
              ? 'border-blue-100 hover:bg-blue-50/50'
              : 'border-orange-100 hover:bg-orange-50/50'
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
          class="px-2 py-1 rounded-full text-xs font-medium flex items-center"
          :class="getStatusClasses(getServiceStatus(service.id))"
        >
          <!-- Show spinner for initializing status -->
          <svg v-if="getServiceStatus(service.id) === 'initializing'" class="animate-spin -ml-1 mr-1 h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          {{ getStatusDisplayText(getServiceStatus(service.id)) }}
        </span>
      </div>
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

// Remove the grace period logic entirely - show actual service status
const isWithinGracePeriod = (): boolean => {
  return false // Always false - no more fake "starting" status
}

const hasMixedServiceStatuses = (): boolean => {
  return false // Not needed anymore
}

const hasInitializingServices = (): boolean => {
  return services.some(service => getServiceStatus(service.id) === 'initializing')
}

const getStatusClasses = (status: string) => ({
  'bg-emerald-100 text-emerald-700': status === 'passing',
  'bg-blue-100 text-blue-700': status === 'initializing',
  'bg-orange-100 text-orange-700': status === 'unavailable' || status === 'critical' || status === 'unknown'
})

const getStatusDisplayText = (status: string): string => {
  switch (status) {
    case 'initializing':
      return 'starting...'
    case 'passing':
      return 'healthy'
    default:
      return 'offline'  // covers critical, unavailable, unknown, warning - all mean "not working"
  }
}

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
