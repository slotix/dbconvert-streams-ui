<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Header -->
    <header class="bg-white border-b border-gray-200">
      <div class="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <h1 class="text-3xl font-bold tracking-tight text-gray-900">
          <span v-if="isBackendConnected">User Dashboard</span>
          <span v-else>User Information Unavailable</span>
        </h1>
      </div>
    </header>

    <!-- Main Content -->
    <main class="py-10">
      <div v-if="isBackendConnected" class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <!-- Usage Dashboard Section -->
        <section class="bg-white rounded-2xl shadow-sm ring-1 ring-gray-900/5 overflow-hidden">
          <div class="p-8">
            <h2 class="text-xl font-semibold text-gray-900 mb-6">
              Usage Overview
            </h2>
            <UsageView />
          </div>
        </section>

        <!-- API Key Management Section -->
        <section class="bg-white rounded-2xl shadow-sm ring-1 ring-gray-900/5 overflow-hidden">
          <div class="p-8">
            <div class="flex items-center justify-between mb-6">
              <h2 class="text-xl font-semibold text-gray-900">
                API Key Management
              </h2>
              <span class="inline-flex items-center rounded-full bg-blue-50 px-3 py-1 text-sm font-medium text-blue-700 ring-1 ring-inset ring-blue-600/20">
                Secure Access
              </span>
            </div>
            <ApiKeyView />
          </div>
        </section>
      </div>

      <!-- Error State -->
      <div v-else class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="bg-white rounded-2xl shadow-sm ring-1 ring-gray-900/5 overflow-hidden">
          <div class="p-8">
            <div class="flex items-start gap-4">
              <div class="flex-shrink-0">
                <ExclamationTriangleIcon class="h-6 w-6 text-amber-500" aria-hidden="true" />
              </div>
              <div class="flex-1">
                <h3 class="text-lg font-medium text-gray-900 mb-2">
                  Connection Error
                </h3>
                <p class="text-gray-600">
                  Unable to connect to the server. Retrying automatically...
                </p>
                <div class="mt-4 flex items-center text-sm text-gray-500">
                  <ArrowPathIcon class="h-4 w-4 mr-2 animate-spin" />
                  <span>Attempting to reconnect</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import ApiKeyView from './ApiKeyView.vue'
import UsageView from './UsageView.vue'
import { useCommonStore } from '@/stores/common'
import { ExclamationTriangleIcon, ArrowPathIcon } from '@heroicons/vue/24/outline'

const commonStore = useCommonStore()
const isBackendConnected = computed(() => commonStore.isBackendConnected)
</script>

<style scoped>
/* Smooth transitions */
.bg-white {
  @apply transition-all duration-300 ease-in-out;
}

/* Hover effects */
.bg-white:hover {
  @apply shadow-lg;
}

/* Responsive padding adjustments */
@screen sm {
  .p-6 {
    @apply p-8;
  }
}

/* Card animations */
.rounded-xl {
  @apply transform transition-transform duration-300;
}

.rounded-xl:hover {
  @apply scale-[1.002];
}
</style>
