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
              class="mr-4 p-2 rounded-md text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
              @click="goBack"
            >
              <ArrowLeftIcon class="h-5 w-5" />
            </button>
            <div>
              <h1 class="text-2xl font-bold text-gray-900 dark:text-gray-100">Edit Connection</h1>
              <p v-if="connection" class="text-sm text-gray-600 dark:text-gray-400">
                Update {{ connection.name }} settings
              </p>
              <p v-else class="text-sm text-gray-600 dark:text-gray-400">Loading connection...</p>
            </div>
          </div>
          <!-- JSON View Toggle -->
          <div class="flex items-center gap-2">
            <span class="text-xs text-gray-600 dark:text-gray-400">JSON</span>
            <Switch
              v-model="isJsonView"
              class="relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-gray-600 dark:focus:ring-teal-400 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
              :class="[
                isJsonView ? 'bg-gray-600 dark:bg-teal-500' : 'bg-gray-400 dark:bg-gray-600'
              ]"
            >
              <span class="sr-only">Toggle JSON view</span>
              <span
                aria-hidden="true"
                class="pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white dark:bg-gray-200 shadow-md ring-0 transition duration-200 ease-in-out"
                :class="[
                  isJsonView ? 'translate-x-5' : 'translate-x-0',
                  'shadow-[0_1px_4px_rgba(0,0,0,0.15)]'
                ]"
              />
            </Switch>
          </div>
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <main class="bg-gray-50 dark:bg-gray-900 pt-8 pb-8">
      <!-- JSON Editor View -->
      <div v-if="isJsonView" class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <ConnectionConfigJsonEditor
          ref="jsonEditorRef"
          :config="connection"
          height="600px"
          @save="handleSaveConfig"
        />
      </div>
      <!-- Wizard View -->
      <EditConnectionWizard
        v-else
        :connectionId="connectionId"
        @connection-updated="handleConnectionUpdated"
      />
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowLeftIcon } from '@heroicons/vue/24/outline'
import { Switch } from '@headlessui/vue'
import EditConnectionWizard from '@/components/connection/wizard/EditConnectionWizard.vue'
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
const connectionsStore = useConnectionsStore()
const commonStore = useCommonStore()

const connectionId = computed(() => props.id)
const connection = computed(() => connectionsStore.currentConnection)
const isJsonView = ref(false)
const jsonEditorRef = ref<InstanceType<typeof ConnectionConfigJsonEditor>>()

// Load connection on mount if not already loaded
onMounted(async () => {
  if (!connection.value || connection.value.id !== props.id) {
    const existingConnection = connectionsStore.connectionByID(props.id)
    if (existingConnection) {
      connectionsStore.setCurrentConnection(props.id)
    } else {
      await connectionsStore.refreshConnections()
      connectionsStore.setCurrentConnection(props.id)
    }
  }
})

function goBack() {
  router.push('/explorer')
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

function handleConnectionUpdated() {
  // Refresh the connection after wizard update
  connectionsStore.setCurrentConnection(connectionId.value)
}
</script>
