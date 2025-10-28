<template>
  <div class="flex flex-col h-full bg-white border-r border-gray-200">
    <!-- Header -->
    <div class="p-4 border-b border-gray-200 flex-shrink-0">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-sm font-semibold text-gray-900">Stream Configurations</h2>
        <router-link :to="{ name: 'CreateStream' }">
          <button
            v-tooltip="'Create new stream configuration'"
            type="button"
            class="p-1.5 rounded-md hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
          >
            <PlusIcon class="h-5 w-5" />
          </button>
        </router-link>
      </div>

      <!-- Search Input -->
      <div class="relative">
        <MagnifyingGlassIcon class="absolute left-3 top-3 h-4 w-4 text-gray-400" />
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Search streams..."
          class="w-full pl-9 pr-3 py-2 rounded-md border border-gray-300 text-sm focus:outline-none focus:ring-1 focus:ring-gray-500 focus:border-transparent"
        />
      </div>
    </div>

    <!-- Streams List -->
    <div class="flex-1 overflow-y-auto">
      <div v-if="isLoading" class="p-4 text-center">
        <div class="inline-block animate-spin">
          <ArrowPathIcon class="h-5 w-5 text-gray-400" />
        </div>
      </div>

      <div v-else-if="filteredStreams.length === 0" class="p-4 text-center text-sm text-gray-500">
        <div v-if="searchQuery">No stream configurations match your search</div>
        <div v-else>No configurations yet. Create one to get started.</div>
      </div>

      <div v-else class="divide-y divide-gray-100">
        <StreamListItem
          v-for="stream in filteredStreams"
          :key="stream.id"
          :stream="stream"
          :is-selected="selectedStreamId === stream.id"
          :source="connectionByID(stream.source)"
          :target="connectionByID(stream.target)"
          @select="handleSelectStream"
          @start="handleStartStream"
          @pause="handlePauseStream"
          @resume="handleResumeStream"
          @delete="handleDeleteStream"
          @edit="handleEditStream"
          @clone="handleCloneStream"
        />
      </div>
    </div>

    <!-- Delete Confirmation Dialog -->
    <ConfirmDialog
      v-model:is-open="showDeleteConfirm"
      :title="`Delete Stream: ${pendingDeleteStream?.name}`"
      :description="deleteConfirmMessage"
      confirm-label="Delete"
      :danger="true"
      @confirm="confirmDelete"
      @cancel="cancelDelete"
    />
  </div>
</template>

<script lang="ts">
import { vTooltip } from '@/directives/tooltip'

export default {
  directives: {
    tooltip: vTooltip
  }
}
</script>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { PlusIcon, MagnifyingGlassIcon, ArrowPathIcon } from '@heroicons/vue/24/outline'
import { useStreamsStore } from '@/stores/streamConfig'
import { useConnectionsStore } from '@/stores/connections'
import { useMonitoringStore } from '@/stores/monitoring'
import StreamListItem from './StreamListItem.vue'
import ConfirmDialog from '@/components/common/ConfirmDialog.vue'
import type { StreamConfig } from '@/types/streamConfig'
import type { Connection } from '@/types/connections'

const props = defineProps<{
  selectedStreamId?: string
}>()

const emit = defineEmits<{
  (e: 'select-stream', payload: { streamId: string }): void
  (e: 'delete-stream', payload: { streamId: string }): void
}>()

const streamsStore = useStreamsStore()
const connectionsStore = useConnectionsStore()
const monitoringStore = useMonitoringStore()

const searchQuery = ref('')
const isLoading = ref(false)
const showDeleteConfirm = ref(false)
const pendingDeleteStream = ref<StreamConfig | null>(null)

const selectedStreamId = computed(() => props.selectedStreamId || '')

const runningStreamsCount = computed(() => {
  // Count streams that are currently running
  return monitoringStore.streamID ? 1 : 0
})

const filteredStreams = computed<StreamConfig[]>(() => {
  const query = searchQuery.value.toLowerCase()
  let streams = streamsStore.streamConfigs || []

  // Filter by search query if present
  if (query) {
    streams = streams.filter((stream) => {
      return stream.name.toLowerCase().includes(query) || stream.mode.toLowerCase().includes(query)
    })
  }

  // Sort by creation date (newest first)
  return [...streams].sort((a, b) => {
    const timeA = a.created || 0
    const timeB = b.created || 0
    return timeB - timeA // Descending order (newest first)
  })
})

function connectionByID(id?: string): Connection | undefined {
  if (!id) return undefined
  return connectionsStore.connections.find((conn) => conn.id === id)
}

function handleSelectStream(payload: { streamId: string }) {
  emit('select-stream', payload)
}

async function handleStartStream(payload: { streamId: string }) {
  try {
    const stream = streamsStore.streamConfigs.find((s) => s.id === payload.streamId)
    if (!stream) return

    const streamID = await streamsStore.startStream(payload.streamId)
    monitoringStore.setStream(streamID, stream)

    // Request to show monitor tab
    monitoringStore.requestShowMonitorTab()

    // Select the stream that was started
    emit('select-stream', { streamId: payload.streamId })
  } catch (error) {
    console.error('Failed to start stream:', error)
  }
}

async function handlePauseStream() {
  try {
    await streamsStore.pauseStream(monitoringStore.streamID)
    // Request to show monitor tab
    monitoringStore.requestShowMonitorTab()
  } catch (error) {
    console.error('Failed to pause stream:', error)
  }
}

async function handleResumeStream() {
  try {
    await streamsStore.resumeStream(monitoringStore.streamID)
    // Request to show monitor tab
    monitoringStore.requestShowMonitorTab()
  } catch (error) {
    console.error('Failed to resume stream:', error)
  }
}

function handleDeleteStream(payload: { streamId: string }) {
  const stream = streamsStore.streamConfigs.find((s) => s.id === payload.streamId)
  if (stream) {
    pendingDeleteStream.value = stream
    showDeleteConfirm.value = true
  }
}

function handleEditStream(payload: { streamId: string }) {
  // Navigation is handled by the router-link in StreamListItem
}

async function handleCloneStream(payload: { streamId: string }) {
  try {
    await streamsStore.cloneStreamConfig(payload.streamId)
    // Notification will be shown by the API call
  } catch (error) {
    console.error('Failed to clone stream:', error)
  }
}

async function confirmDelete() {
  if (!pendingDeleteStream.value) return

  try {
    isLoading.value = true
    await streamsStore.deleteStreamConfig(pendingDeleteStream.value.id)
    emit('delete-stream', { streamId: pendingDeleteStream.value.id })
    showDeleteConfirm.value = false
    pendingDeleteStream.value = null
  } catch (error) {
    console.error('Failed to delete stream:', error)
  } finally {
    isLoading.value = false
  }
}

function cancelDelete() {
  showDeleteConfirm.value = false
  pendingDeleteStream.value = null
}

const deleteConfirmMessage = computed(() => {
  if (!pendingDeleteStream.value) return ''
  return `Are you sure you want to delete "${pendingDeleteStream.value.name}"? This action cannot be undone.`
})

// Fetch streams on mount
watch(
  () => streamsStore.streamConfigs,
  async () => {
    if (!streamsStore.streamConfigs || streamsStore.streamConfigs.length === 0) {
      isLoading.value = true
      try {
        await streamsStore.refreshStreams()
      } finally {
        isLoading.value = false
      }
    }
  },
  { immediate: true }
)
</script>
