<template>
  <div>
    <!-- Header -->
    <header
      class="bg-white dark:bg-gray-850 shadow-sm dark:shadow-gray-900/30 border-b border-gray-100 dark:border-gray-700"
    >
      <div class="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8">
        <div class="flex items-center">
          <button
            class="mr-4 p-2 rounded-lg text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-linear-to-r hover:from-blue-50 hover:to-teal-50 dark:hover:from-blue-900/20 dark:hover:to-teal-900/20 transition-all duration-200"
            @click="goBack"
          >
            <ArrowLeftIcon class="h-5 w-5" />
          </button>
          <div>
            <h1
              class="text-2xl font-bold bg-linear-to-r from-slate-900 to-slate-700 dark:from-gray-100 dark:to-gray-300 bg-clip-text text-transparent"
            >
              New Connection
            </h1>
            <p class="text-sm text-gray-600 dark:text-gray-400">Create a new data connection</p>
          </div>
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <main
      class="bg-linear-to-br from-slate-50 via-white to-slate-50 dark:from-gray-900 dark:via-gray-850 dark:to-gray-900 pt-8 pb-8"
    >
      <AddConnectionWizard />
    </main>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { ArrowLeftIcon } from '@heroicons/vue/24/outline'
import AddConnectionWizard from '@/components/connection/wizard/AddConnectionWizard.vue'

const router = useRouter()

function goBack() {
  // Check if we came from stream wizard
  const streamId = sessionStorage.getItem('streamWizardId')
  if (streamId !== null) {
    // Return to stream wizard
    sessionStorage.removeItem('streamWizardReturnPane')
    sessionStorage.removeItem('streamWizardId')
    if (streamId) {
      router.push(`/streams/edit/${streamId}`)
    } else {
      router.push('/streams/create')
    }
  } else {
    // Return to explorer
    router.push('/explorer')
  }
}
</script>
