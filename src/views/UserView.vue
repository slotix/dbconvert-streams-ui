<template>
  <header>
    <div
      class="bg-white flex flex-wrap justify-between space-y-4 sm:space-y-0 max-w-7xl mx-auto py-6 px-8"
    >
      <h1 class="flex-auto text-3xl font-bold text-gray-900 dark:text-white;">
        <span v-if="isBackendConnected">User Dashboard</span>
        <span v-else>User Information Unavailable</span>
      </h1>
    </div>
  </header>
  <main class="bg-gray-100 min-h-screen">
    <div v-if="isBackendConnected" class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div class="bg-white shadow rounded-lg p-6">
          <h2 class="text-xl font-semibold mb-4">Manage API Key</h2>
          <ApiKeyView />
        </div>
        <div class="bg-white shadow rounded-lg p-6">
          <h2 class="text-xl font-semibold mb-4">Usage Dashboard</h2>
          <UsageView />
        </div>
      </div>
    </div>
    <div v-else class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
        <strong class="font-bold">Connection Error: </strong>
        <span class="block sm:inline">Unable to connect to the server. Please try again later.</span>
      </div>
    </div>
  </main>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import ApiKeyView from './ApiKeyView.vue'
import UsageView from './UsageView.vue'
import { useCommonStore } from '@/stores/common'

const commonStore = useCommonStore()
const isBackendConnected = computed(() => commonStore.isBackendConnected)
</script>
