<template>
  <div>
    <!-- Header -->
    <header
      class="bg-white dark:bg-gray-850 shadow-sm dark:shadow-gray-900/30 border-b border-gray-100 dark:border-gray-700"
    >
      <div class="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8">
        <div class="flex items-center justify-between">
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
                <h1 class="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  Edit Connection JSON
                </h1>
                <p v-if="connection" class="text-sm text-gray-600 dark:text-gray-400">
                  {{ connection.name }}
                </p>
                <p v-else class="text-sm text-gray-600 dark:text-gray-400">Loading connection...</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <main class="bg-gray-50 dark:bg-gray-900 pt-8 pb-8">
      <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <ConnectionConfigJsonEditor
          v-if="connection"
          ref="jsonEditorRef"
          :config="connection"
          height="600px"
          @save="handleSaveConfig"
        />
        <div v-else class="flex items-center justify-center py-12">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500"></div>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, inject } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ArrowLeftIcon, Bars3Icon } from '@heroicons/vue/24/solid'
import { useDesktopMode } from '@/composables/useDesktopMode'
import ConnectionConfigJsonEditor from '@/components/connection/ConnectionConfigJsonEditor.vue'
import { useConnectionsStore } from '@/stores/connections'
import { useCommonStore } from '@/stores/common'
import connectionsApi from '@/api/connections'
import type { Connection } from '@/types/connections'

interface Props {
  id: string
}

const props = defineProps<Props>()
const router = useRouter()
const route = useRoute()
const connectionsStore = useConnectionsStore()
const commonStore = useCommonStore()
const { isDesktop } = useDesktopMode()
const sidebarMenuToggle = inject<{ openSidebar: () => void }>('sidebarMenuToggle')

const jsonEditorRef = ref<InstanceType<typeof ConnectionConfigJsonEditor>>()

const connectionId = computed(() => props.id || (route.params.id as string))

const connection = computed(() => connectionsStore.currentConnection)

onMounted(async () => {
  if (!connection.value || connection.value.id !== connectionId.value) {
    const existingConnection = connectionsStore.connectionByID(connectionId.value)
    if (existingConnection) {
      connectionsStore.setCurrentConnection(connectionId.value)
    } else {
      await connectionsStore.refreshConnections()
      connectionsStore.setCurrentConnection(connectionId.value)
    }
  }
})

function goBack() {
  // Navigate back to explorer with the connection details view
  if (connectionId.value) {
    router.push({ path: `/explorer/${connectionId.value}`, query: { details: 'true' } })
  } else {
    router.push('/explorer')
  }
}

async function handleSaveConfig(config: Connection) {
  if (!connectionId.value) {
    jsonEditorRef.value?.onSaveError('Connection ID is missing')
    return
  }

  try {
    await connectionsApi.updateConnectionById(connectionId.value, config)
    jsonEditorRef.value?.onSaveSuccess()
    // Update the store with the new connection data
    await connectionsStore.refreshConnections()
    connectionsStore.setCurrentConnection(connectionId.value)
    commonStore.showNotification('Connection updated successfully', 'success')
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to save connection'
    jsonEditorRef.value?.onSaveError(errorMessage)
  }
}
</script>
