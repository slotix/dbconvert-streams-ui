<template>
  <div class="p-6 space-y-6">
    <h2 class="text-xl font-semibold text-gray-900">System Status</h2>

    <!-- Error Display only for connection errors -->
    <ErrorDisplay v-if="shouldShowError" class="mb-6">
      <template #default="{ error }">
        <div class="rounded-lg border p-4" :class="[
          error.isRetrying ? 'bg-yellow-50 border-yellow-200' : 'bg-red-50 border-red-200'
        ]">
          <div class="flex items-center">
            <div class="flex-shrink-0">
              <!-- Spinner for retry state -->
              <svg v-if="error.isRetrying" class="animate-spin h-5 w-5 text-yellow-600"
                xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z">
                </path>
              </svg>
              <!-- Error icon for final error state -->
              <svg v-else class="h-5 w-5 text-red-600" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"
                fill="currentColor">
                <path fill-rule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
                  clip-rule="evenodd" />
              </svg>
            </div>
            <div class="ml-3">
              <h3 class="text-sm font-medium" :class="error.isRetrying ? 'text-yellow-800' : 'text-red-800'">
                {{ error.message }}
              </h3>
            </div>
          </div>
        </div>
      </template>
    </ErrorDisplay>

    <!-- Loading state -->
    <div v-if="isInitialLoading" class="animate-pulse space-y-4">
      <div v-for="i in 6" :key="i" class="h-16 bg-gray-100 rounded-lg"></div>
    </div>

    <!-- Service Status Cards -->
    <div v-else class="grid gap-3">
      <div v-for="service in services" :key="service.id"
        class="flex items-center justify-between p-3 rounded-lg border bg-white transition-colors" :class="[
          getServiceStatus(service.id) === 'passing'
            ? 'border-emerald-100 hover:bg-emerald-50/50'
            : getServiceStatus(service.id) === 'warning'
              ? 'border-yellow-100 hover:bg-yellow-50/50'
              : getServiceStatus(service.id) === 'critical'
                ? 'border-red-100 hover:bg-red-50/50'
                : 'border-gray-100 hover:bg-gray-50/50'
        ]">
        <div class="flex items-center space-x-3">
          <div class="rounded-lg p-2" :class="[service.bgColor]">
            <component :is="service.icon" class="h-5 w-5" :class="[service.iconColor]" />
          </div>
          <div>
            <h3 class="text-sm font-medium text-gray-900">{{ service.name }}</h3>
            <p class="text-xs text-gray-500">{{ service.description }}</p>
          </div>
        </div>
        <span class="px-2 py-1 rounded-full text-xs font-medium"
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
  KeyIcon,
  ChartBarIcon
} from '@heroicons/vue/24/outline'
import ErrorDisplay from '@/components/common/ErrorDisplay.vue'

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

// Check if all services are healthy
const areAllServicesHealthy = computed(() => {
  return services.every((service) => {
    const status = getServiceStatus(service.id)
    return status === 'passing'
  })
})

// Only show errors if we're not in initialization and have actual connection issues
const shouldShowError = computed(() => {
  return (
    commonStore.error &&
    !isInitialLoading.value &&
    commonStore.isBackendConnected &&
    // Only show error if services are actually failing
    !areAllServicesHealthy.value
  )
})

const getServiceStatus = (serviceId: string): string => {
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
  'bg-gray-100 text-gray-700': status === 'unknown'
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

  // Start polling after initial load
  pollingInterval.value = window.setInterval(() => {
    commonStore.fetchServiceStatus().then(() => {
      commonStore.clearError()
    })
  }, 30000)
})

onUnmounted(() => {
  if (pollingInterval.value) {
    clearInterval(pollingInterval.value)
  }
})
</script>
