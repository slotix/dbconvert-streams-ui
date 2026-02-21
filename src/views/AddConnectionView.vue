<template>
  <div class="h-screen flex flex-col overflow-hidden">
    <!-- Header -->
    <header
      class="sticky top-0 z-30 bg-white dark:bg-gray-900 border-b border-slate-200 dark:border-gray-700"
    >
      <div class="px-4 py-2 flex items-center gap-3">
        <h1 class="text-base font-semibold text-gray-900 dark:text-gray-100">New Connection</h1>
        <div class="flex-1"></div>
        <button
          type="button"
          class="px-3 py-1.5 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors"
          @click="goBack"
        >
          Cancel
        </button>
      </div>
    </header>

    <main class="flex-1 overflow-y-auto">
      <AddConnectionWizard @cancel="goBack" />
    </main>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
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
