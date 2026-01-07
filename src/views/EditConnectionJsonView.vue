<template>
  <div class="min-h-full">
    <!-- Header - matches StreamsView/CreateStreamView style -->
    <header
      class="sticky top-0 z-30 bg-linear-to-r from-slate-50 via-white to-slate-50 dark:from-gray-900 dark:via-gray-850 dark:to-gray-900 border-b border-slate-200 dark:border-gray-700 shadow-sm dark:shadow-gray-900/30 lg:-ml-[var(--sidebar-width)] lg:w-[calc(100%+var(--sidebar-width))]"
    >
      <div class="px-6 py-4 flex items-center gap-4">
        <div class="flex items-center gap-3">
          <!-- Mobile sidebar toggle -->
          <button
            v-if="sidebarMenuToggle"
            type="button"
            class="group flex items-center justify-center p-2 -ml-1 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-200 dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-700 lg:hidden"
            @click="sidebarMenuToggle.openSidebar"
          >
            <Menu class="h-5 w-5" :stroke-width="iconStroke" aria-hidden="true" />
            <span class="sr-only">Open sidebar</span>
          </button>

          <!-- Desktop sidebar toggle -->
          <button
            v-if="sidebarWidthToggle"
            type="button"
            class="group hidden lg:flex items-center justify-center p-2 -ml-1 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-200 dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-700"
            @click="sidebarWidthToggle.toggleSidebarWidth"
          >
            <Menu class="h-5 w-5" :stroke-width="iconStroke" aria-hidden="true" />
            <span class="sr-only">Toggle sidebar width</span>
          </button>

          <!-- Back -->
          <button
            type="button"
            class="group flex items-center justify-center p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-200 dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-700"
            @click="goBack"
          >
            <ArrowLeft class="h-5 w-5" :stroke-width="iconStroke" aria-hidden="true" />
            <span class="sr-only">Back</span>
          </button>

          <img
            v-if="!isDesktop"
            class="h-5 w-5 shrink-0"
            src="/images/logo.svg"
            alt="DBConvert Streams"
          />

          <div class="flex flex-col">
            <h1 class="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Edit Connection JSON
            </h1>
            <p v-if="connection" class="text-xs text-gray-500 dark:text-gray-400">
              {{ connection.name }}
            </p>
            <p v-else class="text-xs text-gray-500 dark:text-gray-400">Loading connection...</p>
          </div>
        </div>

        <div class="flex-1"></div>
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
import { useLucideIcons } from '@/composables/useLucideIcons'
import { ArrowLeft, Menu } from 'lucide-vue-next'
import { useDesktopMode } from '@/composables/useDesktopMode'
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
const { isDesktop } = useDesktopMode()
const sidebarWidthToggle = inject<{
  isSidebarExpanded: { value: boolean }
  toggleSidebarWidth: () => void
}>('sidebarWidthToggle')
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
