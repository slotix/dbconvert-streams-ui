<template>
  <div class="p-6 space-y-6">
    <div class="flex items-center justify-between">
      <h2
        class="text-xl font-semibold bg-linear-to-r from-slate-900 to-slate-700 dark:from-gray-100 dark:to-gray-300 bg-clip-text text-transparent"
      >
        System Status
      </h2>
    </div>

    <!-- Loading state -->
    <div v-if="isInitialLoading" class="animate-pulse space-y-4">
      <div
        v-for="i in 6"
        :key="i"
        class="h-16 bg-linear-to-r from-slate-100 to-slate-50 dark:from-gray-800 dark:to-gray-850 rounded-xl"
      ></div>
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
} from '@heroicons/vue/24/solid'

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
const pollingInterval = ref<ReturnType<typeof setInterval> | null>(null)
const pollStartAt = Date.now()
const isInitialLoading = ref(true)

// Polling intervals
const FAST_POLL_MS = 2000
const SLOW_POLL_MS = 10000
const FAST_POLL_WINDOW_MS = 30000

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

const coreServiceNames = ['stream-api', 'stream-reader', 'stream-writer', 'nats']

const coreServicesHealthy = (): boolean => {
  return coreServiceNames.every((name) => {
    const status = commonStore.serviceStatuses.find(
      (service) => service.name.toLowerCase() === name.toLowerCase()
    )
    return status?.status === 'passing'
  })
}

const shouldSlowPoll = (): boolean => {
  if (!commonStore.isBackendConnected) {
    return false
  }
  if (coreServicesHealthy()) {
    return true
  }
  return Date.now() - pollStartAt >= FAST_POLL_WINDOW_MS
}

// Track current polling speed to know when to switch
let currentPollMs = FAST_POLL_MS

const startPolling = (intervalMs: number) => {
  if (pollingInterval.value) {
    clearInterval(pollingInterval.value)
  }
  currentPollMs = intervalMs
  pollingInterval.value = setInterval(async () => {
    if (!commonStore.isBackendConnected) {
      return
    }
    try {
      await commonStore.fetchServiceStatus()
      commonStore.clearError()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      if (!errorMessage.includes('Network Error') && !errorMessage.includes('connection')) {
        console.warn('Service status polling failed:', errorMessage)
      }
    }

    // Switch to slow polling once services are healthy or grace period ends
    if (currentPollMs !== SLOW_POLL_MS && shouldSlowPoll()) {
      startPolling(SLOW_POLL_MS)
    }
  }, intervalMs)
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
  } catch (error) {
    // Silently handle initial fetch failure - backend might not be available yet
    const errorMessage = error instanceof Error ? error.message : String(error)
    if (!errorMessage.includes('Network Error') && !errorMessage.includes('connection')) {
      console.warn('Failed to fetch initial service status:', errorMessage)
    }
  } finally {
    isInitialLoading.value = false
  }

  startPolling(FAST_POLL_MS)
})

onUnmounted(() => {
  if (pollingInterval.value) {
    clearInterval(pollingInterval.value)
  }
})
</script>
