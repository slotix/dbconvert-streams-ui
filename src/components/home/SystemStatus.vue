<template>
  <div class="p-6 space-y-6">
    <div class="flex items-center justify-between">
      <h2
        class="text-xl font-semibold bg-linear-to-r from-slate-900 to-slate-700 dark:from-gray-100 dark:to-gray-300 bg-clip-text text-transparent"
      >
        System Status
      </h2>
      <!-- Show initialization notice during grace period -->
      <div
        v-if="isWithinGracePeriod() && !isInitialLoading"
        class="flex items-center text-sm text-blue-600 dark:text-blue-400"
      >
        <svg
          class="animate-spin -ml-1 mr-2 h-4 w-4 text-blue-600 dark:text-blue-400"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            class="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            stroke-width="4"
          ></circle>
          <path
            class="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          ></path>
        </svg>
        Services are starting up...
      </div>
    </div>

    <!-- Loading state -->
    <div v-if="isInitialLoading" class="animate-pulse space-y-4">
      <div
        v-for="i in 6"
        :key="i"
        class="h-16 bg-linear-to-r from-slate-100 to-slate-50 dark:from-gray-800 dark:to-gray-850 rounded-xl"
      ></div>
    </div>

    <!-- Initialization Help Text -->
    <div
      v-else-if="isWithinGracePeriod() && hasInitializingServices()"
      class="mb-4 p-4 bg-linear-to-br from-blue-50 to-teal-50 dark:from-blue-900/30 dark:to-teal-900/30 border border-blue-200 dark:border-blue-700 rounded-xl shadow-sm dark:shadow-gray-900/50"
    >
      <div class="flex items-start">
        <svg
          class="shrink-0 h-5 w-5 text-blue-400 dark:text-blue-500 mt-0.5"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path
            fill-rule="evenodd"
            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
            clip-rule="evenodd"
          ></path>
        </svg>
        <div class="ml-3">
          <h3 class="text-sm font-medium text-blue-800 dark:text-blue-300">
            Services are starting up
          </h3>
          <p class="mt-1 text-sm text-blue-700 dark:text-blue-400">
            DBConvert Streams services are initializing. Health checks need time to verify that all
            components are ready. This typically takes 10-30 seconds. Services showing "starting..."
            will automatically change to "healthy" once they're fully operational.
          </p>
          <div class="mt-2 text-xs text-blue-600 dark:text-blue-400">
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
          v-for="service in visibleServices"
          :key="service.id"
          class="flex items-center justify-between p-4 rounded-lg bg-slate-50 dark:bg-gray-800/50"
        >
          <div class="flex items-center space-x-3">
            <div class="rounded-lg p-2" :class="[service.bgColor]">
              <component :is="service.icon" class="h-5 w-5" :class="[service.iconColor]" />
            </div>
            <div>
              <h3 class="text-sm font-medium text-gray-900 dark:text-gray-100">
                {{ service.name }}
              </h3>
              <p class="text-xs text-gray-500 dark:text-gray-400">{{ service.description }}</p>
            </div>
          </div>
          <span
            class="px-3 py-1 rounded-full text-xs font-medium"
            :class="getStatusClasses(getServiceStatus(service.backendName))"
          >
            {{ getStatusDisplayText(getServiceStatus(service.backendName)) }}
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
  backendName: string
  description: string
  icon: typeof CloudIcon
  bgColor: string
  iconColor: string
}

const services: Service[] = [
  {
    id: 'api',
    name: 'stream-api',
    backendName: 'stream-api',
    description: 'API Service',
    icon: CloudIcon,
    bgColor: 'bg-blue-50 dark:bg-blue-900/30',
    iconColor: 'text-blue-600 dark:text-blue-400'
  },
  {
    id: 'reader',
    name: 'stream-reader',
    backendName: 'stream-reader',
    description: 'Source Reader',
    icon: ArrowDownTrayIcon,
    bgColor: 'bg-teal-50 dark:bg-teal-900/30',
    iconColor: 'text-teal-600 dark:text-teal-400'
  },
  {
    id: 'writer',
    name: 'stream-writer',
    backendName: 'stream-writer',
    description: 'Target Writer',
    icon: ArrowUpTrayIcon,
    bgColor: 'bg-teal-50 dark:bg-teal-900/30',
    iconColor: 'text-teal-600 dark:text-teal-400'
  },
  {
    id: 'nats',
    name: 'nats',
    backendName: 'nats',
    description: 'Message Queue',
    icon: QueueListIcon,
    bgColor: 'bg-blue-50 dark:bg-blue-900/30',
    iconColor: 'text-blue-600 dark:text-blue-400'
  },
  {
    id: 'vault',
    name: 'vault',
    backendName: 'vault',
    description: 'Secrets Management',
    icon: KeyIcon,
    bgColor: 'bg-slate-50 dark:bg-slate-800/30',
    iconColor: 'text-slate-600 dark:text-slate-400'
  },
  {
    id: 'sentry',
    name: 'sentry',
    backendName: 'sentry',
    description: 'Usage Tracking & Limits',
    icon: ChartBarIcon,
    bgColor: 'bg-blue-50 dark:bg-blue-900/30',
    iconColor: 'text-blue-600 dark:text-blue-400'
  }
]

const commonStore = useCommonStore()
const pollingInterval = ref<number | null>(null)
const isInitialLoading = ref(true)

const visibleServices = computed(() => {
  // Keep core services visible even if they haven't registered yet; hide optional services
  // unless the backend reports them as relevant.
  const reported = new Set(commonStore.serviceStatuses.map((s) => s.name.toLowerCase()))
  return services.filter((service) => {
    if (service.id === 'sentry') return true
    if (service.id === 'vault') return reported.has('vault')
    return true
  })
})

const getServiceStatus = (backendName: string): string => {
  // If backend is disconnected, all services are unavailable
  if (!commonStore.isBackendConnected) {
    return 'unavailable'
  }

  if (backendName === 'sentry') {
    return commonStore.sentryHealthy ? 'passing' : 'critical'
  }

  const status = commonStore.serviceStatuses.find(
    (s) => s.name.toLowerCase() === backendName.toLowerCase()
  )
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
  return visibleServices.value.some(
    (service) => getServiceStatus(service.backendName) === 'initializing'
  )
}

const getStatusClasses = (status: string) => ({
  'bg-teal-100 dark:bg-teal-900/50 text-teal-700 dark:text-teal-300': status === 'passing',
  'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300': status === 'initializing',
  'bg-orange-100 dark:bg-orange-900/50 text-orange-700 dark:text-orange-300':
    status === 'unavailable' || status === 'critical' || status === 'unknown'
})

const getStatusDisplayText = (status: string): string => {
  switch (status) {
    case 'initializing':
      return 'starting...'
    case 'passing':
      return 'healthy'
    default:
      return 'offline' // covers critical, unavailable, unknown, warning - all mean "not working"
  }
}

onMounted(async () => {
  try {
    await commonStore.fetchServiceStatus()
    commonStore.clearError()
    isInitialLoading.value = false
  } catch (error) {
    // Silently handle initial fetch failure - backend might not be available yet
    const errorMessage = error instanceof Error ? error.message : String(error)
    if (!errorMessage.includes('Network Error') && !errorMessage.includes('connection')) {
      console.log('Failed to fetch initial service status:', errorMessage)
    }
  } finally {
    isInitialLoading.value = false
  }

  // Start polling after initial load - reduced to 10 seconds for more responsive updates
  pollingInterval.value = window.setInterval(() => {
    // Only poll if backend is connected
    if (commonStore.isBackendConnected) {
      commonStore
        .fetchServiceStatus()
        .then(() => {
          commonStore.clearError()
        })
        .catch((error) => {
          // Silently handle polling failures - backend connection monitor handles this
          const errorMessage = error instanceof Error ? error.message : String(error)
          if (!errorMessage.includes('Network Error') && !errorMessage.includes('connection')) {
            console.log('Service status polling failed:', errorMessage)
          }
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
