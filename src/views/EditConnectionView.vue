<template>
  <div>
    <!-- Header -->
    <header class="bg-white shadow-sm">
      <div class="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8">
        <div class="flex items-center">
          <button
            @click="goBack"
            class="mr-4 p-2 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100"
          >
            <ArrowLeftIcon class="h-5 w-5" />
          </button>
          <div>
            <h1 class="text-2xl font-bold text-gray-900">Edit Connection</h1>
            <p v-if="connection" class="text-sm text-gray-600">
              Modify {{ connection.name }} ({{ connection.type }})
            </p>
            <p v-else class="text-sm text-gray-600">Loading connection...</p>
          </div>
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <main class="bg-gray-50 min-h-screen">
      <EditConnectionWizard :connectionId="connectionId" />
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowLeftIcon } from '@heroicons/vue/24/outline'
import EditConnectionWizard from '@/components/connection/wizard/EditConnectionWizard.vue'
import { useConnectionsStore } from '@/stores/connections'

interface Props {
  id: string
}

const props = defineProps<Props>()
const router = useRouter()
const connectionsStore = useConnectionsStore()

const connectionId = computed(() => props.id)
const connection = computed(() => connectionsStore.currentConnection)

function goBack() {
  router.push('/connections')
}
</script>