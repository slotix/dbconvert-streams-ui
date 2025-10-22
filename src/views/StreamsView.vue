<template>
  <div class="flex flex-col h-screen">
    <!-- Header -->
    <header>
      <div class="bg-white border-b border-gray-200 px-8 py-6">
        <h1 class="text-3xl font-bold text-gray-900">
          <span v-if="isBackendConnected">
            <span v-if="streamsCount() > 0">{{ streamsCount() }} Stream configurations</span>
            <span v-else>No Stream configurations</span>
          </span>
          <span v-else>Stream Configurations Unavailable</span>
        </h1>
      </div>
    </header>

    <!-- Main Content -->
    <main class="flex-1 overflow-hidden bg-gray-50">
      <div v-if="!isBackendConnected" class="p-8">
        <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <strong class="font-bold">Connection Error:</strong>
          <span class="block sm:inline"
            >Unable to connect to the server. Please check your backend services.</span
          >
        </div>
      </div>

      <div v-else-if="streamsCount() === 0" class="flex items-center justify-center h-full">
        <div class="text-center">
          <p class="mt-1 text-lg text-gray-700">
            You haven't created any streams yet.<br />
            Click the button below to create your first stream.
          </p>
          <router-link :to="{ name: 'CreateStream' }" class="mt-6 inline-block">
            <button
              type="button"
              class="py-2 px-6 flex items-center justify-center rounded-md bg-gray-600 text-center text-sm font-semibold text-white shadow-sm hover:bg-gray-500"
            >
              <PlusIcon class="mr-2 h-5 w-5" />
              New stream
            </button>
          </router-link>
        </div>
      </div>

      <div v-else class="h-full flex gap-4 px-4 py-4">
        <!-- Sidebar -->
        <div class="w-80 flex-shrink-0 rounded-lg border border-gray-200">
          <StreamsSidebar
            :selected-stream-id="selectedStreamId"
            @select-stream="handleSelectStream"
            @delete-stream="handleDeleteStream"
          />
        </div>

        <!-- Details Panel -->
        <div class="flex-1 rounded-lg border border-gray-200 overflow-hidden">
          <div v-if="selectedStreamId && selectedStream" class="h-full">
            <StreamDetailsPanel
              :stream="selectedStream"
              :source="connectionByID(selectedStream.source)"
              :target="connectionByID(selectedStream.target)"
              @stream-deleted="handleStreamDeletedFromPanel"
            />
          </div>
          <div v-else class="h-full flex items-center justify-center text-gray-500">
            <p>Select a stream from the list to view details</p>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { PlusIcon } from '@heroicons/vue/24/solid'
import { useStreamsStore } from '@/stores/streamConfig'
import { useConnectionsStore } from '@/stores/connections'
import { useCommonStore } from '@/stores/common'
import StreamsSidebar from '@/components/stream/StreamsSidebar.vue'
import StreamDetailsPanel from '@/components/stream/StreamDetailsPanel.vue'
import type { StreamConfig } from '@/types/streamConfig'
import type { Connection } from '@/types/connections'

const streamsStore = useStreamsStore()
const connectionsStore = useConnectionsStore()
const commonStore = useCommonStore()

const selectedStreamId = ref<string>('')

function streamsCount() {
  return streamsStore.countStreams
}

const isBackendConnected = computed(() => commonStore.isBackendConnected)

const selectedStream = computed<StreamConfig | undefined>(() => {
  if (!selectedStreamId.value) return undefined
  return streamsStore.streamConfigs.find((s) => s.id === selectedStreamId.value)
})

function connectionByID(id?: string): Connection | undefined {
  if (!id) return undefined
  return connectionsStore.connections.find((conn) => conn.id === id)
}

function handleSelectStream(payload: { streamId: string }) {
  selectedStreamId.value = payload.streamId
}

function handleDeleteStream(payload: { streamId: string }) {
  if (selectedStreamId.value === payload.streamId) {
    selectedStreamId.value = ''
  }
}

function handleStreamDeletedFromPanel() {
  selectedStreamId.value = ''
}

// Fetch streams on mount
watch(
  () => streamsStore.streamConfigs,
  async () => {
    if (!streamsStore.streamConfigs || streamsStore.streamConfigs.length === 0) {
      try {
        await streamsStore.refreshStreams()
      } catch (error) {
        console.error('Failed to fetch streams:', error)
      }
    }
  },
  { immediate: true }
)
</script>
