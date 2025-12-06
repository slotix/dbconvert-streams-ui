<template>
  <div class="h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
    <!-- Page Header -->
    <div class="bg-white dark:bg-gray-850 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
      <div class="flex items-center justify-between">
        <div class="flex items-center space-x-3">
          <div
            class="flex items-center justify-center w-10 h-10 rounded-lg bg-teal-100 dark:bg-teal-900/30"
          >
            <GlobeAltIcon class="h-6 w-6 text-teal-600 dark:text-teal-400" />
          </div>
          <div>
            <h1 class="text-xl font-semibold text-gray-900 dark:text-gray-100">
              Federated Query Console
            </h1>
            <p class="text-sm text-gray-500 dark:text-gray-400">
              Query across multiple database connections with a single SQL statement
            </p>
          </div>
        </div>

        <!-- Back to Explorer Button -->
        <RouterLink
          to="/explorer"
          class="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500"
        >
          <ArrowLeftIcon class="h-4 w-4 mr-2" />
          Back to Explorer
        </RouterLink>
      </div>
    </div>

    <!-- Main Content -->
    <div class="flex-1 overflow-hidden">
      <FederatedConsoleTab />
    </div>
  </div>
</template>

<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { GlobeAltIcon, ArrowLeftIcon } from '@heroicons/vue/24/outline'
import { FederatedConsoleTab } from '@/components/console'
</script>
