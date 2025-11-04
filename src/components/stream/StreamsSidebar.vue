<template>
  <div
    class="flex flex-col h-full bg-linear-to-br from-white via-slate-50/50 to-white shadow-xl rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-2xl border border-slate-200/50"
  >
    <!-- Streams List -->
    <div class="flex-1 overflow-y-auto p-3 scrollbar-thin">
      <!-- Enhanced loading state with gradient spinner -->
      <div v-if="isLoading" class="flex flex-col items-center justify-center py-16">
        <div
          class="relative w-16 h-16 mb-4 animate-spin rounded-full bg-linear-to-tr from-blue-500 to-teal-500 p-1"
        >
          <div class="bg-white rounded-full w-full h-full"></div>
        </div>
        <p class="text-sm font-medium text-slate-700">Loading streams...</p>
        <p class="text-xs text-slate-500 mt-1">Please wait</p>
      </div>

      <!-- Enhanced empty state -->
      <div
        v-else-if="filteredStreams.length === 0"
        class="flex flex-col items-center justify-center py-20 px-6"
      >
        <div
          class="bg-linear-to-br from-slate-100 to-slate-50 rounded-full p-6 mb-5 shadow-inner border border-slate-200"
        >
          <ArrowPathIcon class="h-10 w-10 text-slate-400" />
        </div>
        <p class="text-base font-semibold text-slate-700 mb-2">
          {{ searchQuery ? 'No streams found' : 'No stream configurations yet' }}
        </p>
        <p class="text-sm text-slate-500 text-center">
          {{ searchQuery ? 'Try adjusting your search' : 'Create one to get started' }}
        </p>
      </div>

      <!-- Stream list with improved spacing -->
      <div v-else class="space-y-1">
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
import { ArrowPathIcon } from '@heroicons/vue/24/outline'
import { useStreamsStore } from '@/stores/streamConfig'
import { useConnectionsStore } from '@/stores/connections'
import { useMonitoringStore } from '@/stores/monitoring'
import StreamListItem from './StreamListItem.vue'
import ConfirmDialog from '@/components/common/ConfirmDialog.vue'
import type { StreamConfig } from '@/types/streamConfig'
import type { Connection } from '@/types/connections'

const props = defineProps<{
  selectedStreamId?: string
  searchQuery?: string
}>()

const emit = defineEmits<{
  (e: 'select-stream', payload: { streamId: string }): void
  (e: 'delete-stream', payload: { streamId: string }): void
}>()

const streamsStore = useStreamsStore()
const connectionsStore = useConnectionsStore()
const monitoringStore = useMonitoringStore()

const isLoading = ref(false)
const showDeleteConfirm = ref(false)
const pendingDeleteStream = ref<StreamConfig | null>(null)

const selectedStreamId = computed(() => props.selectedStreamId || '')
const searchQuery = computed(() => props.searchQuery || '')

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

<style scoped>
/* Custom scrollbar styling for webkit browsers */
.scrollbar-thin::-webkit-scrollbar {
  width: 8px;
}

.scrollbar-thin::-webkit-scrollbar-track {
  background: transparent;
}

.scrollbar-thin::-webkit-scrollbar-thumb {
  background-color: rgb(209, 213, 219);
  border-radius: 4px;
  transition: background-color 0.2s;
}

.scrollbar-thin::-webkit-scrollbar-thumb:hover {
  background-color: rgb(156, 163, 175);
}

/* For Firefox */
.scrollbar-thin {
  scrollbar-width: thin;
  scrollbar-color: rgb(209, 213, 219) transparent;
}
</style>
