<template>
  <div class="h-screen flex flex-col overflow-hidden">
    <header class="sticky top-0 z-30 bg-white dark:bg-gray-900 border-b border-slate-200 dark:border-gray-700">
      <div class="px-4 py-2 flex items-center gap-3">
        <button
          type="button"
          class="flex items-center justify-center p-1.5 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-200 dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-700"
          @click="goBack"
        >
          <ArrowLeft class="h-5 w-5" :stroke-width="iconStroke" aria-hidden="true" />
          <span class="sr-only">Back</span>
        </button>
        <h1 class="text-base font-semibold text-gray-900 dark:text-gray-100">Edit Connection JSON</h1>
        <span v-if="connection" class="text-xs text-gray-500 dark:text-gray-400">— {{ connection.name }}</span>
      </div>
    </header>

    <main class="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900 py-8">
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
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useLucideIcons } from '@/composables/useLucideIcons'
import { ArrowLeft } from 'lucide-vue-next'
import ConnectionConfigJsonEditor from '@/components/connection/ConnectionConfigJsonEditor.vue'
import { useConnectionsStore } from '@/stores/connections'
import { useCommonStore } from '@/stores/common'
import connectionsApi from '@/api/connections'
import type { Connection } from '@/types/connections'

const { strokeWidth: iconStroke } = useLucideIcons()

interface Props {
  id: string
}

const props = defineProps<Props>()
const router = useRouter()
const route = useRoute()
const connectionsStore = useConnectionsStore()
const commonStore = useCommonStore()

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
  if (connectionId.value) {
    sessionStorage.setItem('explorerFocusConnectionId', connectionId.value)
    router.push('/explorer')
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
    await connectionsStore.refreshConnections()
    connectionsStore.setCurrentConnection(connectionId.value)
    commonStore.showNotification('Connection updated successfully', 'success')
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to save connection'
    jsonEditorRef.value?.onSaveError(errorMessage)
  }
}
</script>
