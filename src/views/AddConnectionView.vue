<template>
  <div>
    <!-- Header -->
    <header class="bg-white shadow-sm">
      <div class="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8">
        <div class="flex items-center">
          <button
            class="mr-4 p-2 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100"
            @click="goBack"
          >
            <ArrowLeftIcon class="h-5 w-5" />
          </button>
          <div>
            <h1 class="text-2xl font-bold text-gray-900">Add New Connection</h1>
            <p class="text-sm text-gray-600">Create a new database connection</p>
          </div>
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <main class="bg-gray-50 min-h-screen">
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
  router.push('/connections')
}
</script>
