<template>
  <div>
    <!-- Header -->
    <header
      class="bg-white dark:bg-gray-850 shadow-sm dark:shadow-gray-900/30 border-b border-gray-100 dark:border-gray-700"
    >
      <div class="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8">
        <div class="flex items-center">
          <button
            v-if="sidebarMenuToggle"
            type="button"
            class="mr-2 p-2 rounded-md text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 lg:hidden"
            @click="sidebarMenuToggle.openSidebar"
          >
            <Bars3Icon class="h-5 w-5" />
            <span class="sr-only">Open sidebar</span>
          </button>
          <button
            class="mr-4 p-2 rounded-md text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
            @click="goBack"
          >
            <ArrowLeftIcon class="h-5 w-5" />
          </button>
          <div class="flex items-start gap-3">
            <img
              v-if="!isDesktop"
              class="h-5 w-5 shrink-0 mt-1"
              src="/images/logo.svg"
              alt="DBConvert Streams"
            />
            <div>
              <h1 class="text-2xl font-bold text-gray-900 dark:text-gray-100">Edit Connection</h1>
              <p v-if="connection" class="text-sm text-gray-600 dark:text-gray-400">
                Update {{ connection.name }} settings
              </p>
              <p v-else class="text-sm text-gray-600 dark:text-gray-400">Loading connection...</p>
            </div>
          </div>
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <main class="bg-gray-50 dark:bg-gray-900 pt-8 pb-8">
      <EditConnectionWizard :connectionId="connectionId" />
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, inject } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowLeftIcon, Bars3Icon } from '@heroicons/vue/24/solid'
import { useDesktopMode } from '@/composables/useDesktopMode'
import EditConnectionWizard from '@/components/connection/wizard/EditConnectionWizard.vue'
import { useConnectionsStore } from '@/stores/connections'

interface Props {
  id: string
}

const props = defineProps<Props>()
const router = useRouter()
const connectionsStore = useConnectionsStore()
const { isDesktop } = useDesktopMode()
const sidebarMenuToggle = inject<{ openSidebar: () => void }>('sidebarMenuToggle')

const connectionId = computed(() => props.id)
const connection = computed(() => connectionsStore.currentConnection)

function goBack() {
  router.push('/explorer')
}
</script>
