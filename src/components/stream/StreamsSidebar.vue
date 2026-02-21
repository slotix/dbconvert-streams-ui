<template>
  <div class="overflow-hidden h-full flex flex-col">
    <!-- Toolbar row 1: count + New Stream Config -->
    <div class="px-3 pt-2.5 pb-1 flex items-center gap-2">
      <button
        type="button"
        class="lg:hidden flex items-center justify-center p-1.5 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-200 dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-700"
        @click="sidebarMenuToggle?.openSidebar()"
      >
        <Menu class="h-4 w-4" aria-hidden="true" />
        <span class="sr-only">Open sidebar</span>
      </button>
      <span class="text-xs font-medium text-gray-500 dark:text-gray-400 truncate flex-1">
        {{ streamCountLabel }}
      </span>
      <BaseButton variant="primary" size="sm" @click="router.push({ name: 'CreateStream' })">
        <Plus class="h-3.5 w-3.5" />
        <span>New Stream Config</span>
      </BaseButton>
    </div>

    <!-- Toolbar row 2: search -->
    <div class="px-2 pb-2 border-b border-slate-200/70 dark:border-gray-700/80">
      <SearchInput v-model="searchQuery" placeholder="Filter..." size="xs" class="w-full" />
    </div>

    <!-- Streams List -->
    <div class="flex-1 overflow-y-auto p-2 scrollbar-thin">
      <!-- Enhanced loading state with gradient spinner -->
      <div v-if="isLoading" class="flex flex-col items-center justify-center py-16">
        <div
          class="relative w-16 h-16 mb-4 animate-spin rounded-full bg-linear-to-tr from-blue-500 to-teal-500 p-1"
        >
          <div class="bg-white dark:bg-gray-850 rounded-full w-full h-full"></div>
        </div>
        <p class="text-sm font-medium text-slate-700 dark:text-gray-300">Loading streams...</p>
        <p class="text-xs text-slate-500 dark:text-gray-500 mt-1">Please wait</p>
      </div>

      <!-- Enhanced empty state -->
      <div
        v-else-if="filteredStreams.length === 0"
        class="flex flex-col items-center justify-center py-20 px-6"
      >
        <div
          class="bg-linear-to-br from-slate-100 to-slate-50 dark:from-gray-800 dark:to-gray-850 rounded-full p-6 mb-5 shadow-inner border border-slate-200 dark:border-gray-700"
        >
          <RefreshCw class="h-10 w-10 text-slate-400 dark:text-gray-600" />
        </div>
        <p class="text-base font-semibold text-slate-700 dark:text-gray-300 mb-2">
          {{ searchQuery ? 'No streams found' : 'No stream configurations yet' }}
        </p>
        <p class="text-sm text-slate-500 dark:text-gray-500 text-center">
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
          :source="connectionByID(stream.source?.connections?.[0]?.connectionId)"
          :target="connectionByID(stream.target?.id)"
          @select="handleSelectStream"
          @start="handleStartStream"
          @pause="handlePauseStream"
          @resume="handleResumeStream"
          @delete="handleDeleteStream"
          @edit="handleEditStream"
          @clone="handleCloneStream"
          @contextmenu="handleContextMenu"
        />
      </div>
    </div>

    <!-- Context Menu -->
    <StreamContextMenu
      :visible="contextMenu.contextMenuVisible.value"
      :x="contextMenu.contextMenuX.value"
      :y="contextMenu.contextMenuY.value"
      :target="contextMenu.contextTarget.value"
      @menu-action="onContextMenuAction"
      @close="contextMenu.closeContextMenu"
    />

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
import { ref, computed, inject } from 'vue'
import { useRouter } from 'vue-router'
import { Menu, Plus, RefreshCw } from 'lucide-vue-next'
import { useStreamsStore } from '@/stores/streamConfig'
import { useConnectionsStore } from '@/stores/connections'
import { useStreamActions } from '@/composables/useStreamActions'
import { useStreamContextMenu } from '@/composables/useStreamContextMenu'
import StreamListItem from './StreamListItem.vue'
import StreamContextMenu from './StreamContextMenu.vue'
import ConfirmDialog from '@/components/common/ConfirmDialog.vue'
import SearchInput from '@/components/common/SearchInput.vue'
import BaseButton from '@/components/base/BaseButton.vue'
import type { StreamConfig } from '@/types/streamConfig'
import type { Connection } from '@/types/connections'

const props = defineProps<{
  selectedStreamId?: string
}>()

const emit = defineEmits<{
  (e: 'select-stream', payload: { streamId: string }): void
  (e: 'delete-stream', payload: { streamId: string }): void
}>()

const sidebarMenuToggle = inject<{ openSidebar: () => void }>('sidebarMenuToggle')
const router = useRouter()
const streamsStore = useStreamsStore()
const connectionsStore = useConnectionsStore()
const streamActions = useStreamActions()
const contextMenu = useStreamContextMenu()

const isLoading = ref(false)
const showDeleteConfirm = ref(false)
const pendingDeleteStream = ref<StreamConfig | null>(null)
const searchQuery = ref('')

const selectedStreamId = computed(() => props.selectedStreamId || '')

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

const streamCountLabel = computed(() => {
  const filtered = filteredStreams.value.length
  const total = streamsStore.countStreams
  if (searchQuery.value && filtered !== total) {
    return `${filtered} of ${total} stream config${total === 1 ? '' : 's'}`
  }
  return `${total} stream config${total === 1 ? '' : 's'}`
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

    const streamID = await streamActions.startStream(stream)

    // Select the stream that was started
    if (streamID) {
      emit('select-stream', { streamId: payload.streamId })
    }
  } catch (error) {
    console.error('Failed to start stream:', error)
  }
}

async function handlePauseStream() {
  try {
    await streamActions.pauseStream()
  } catch (error) {
    console.error('Failed to pause stream:', error)
  }
}

async function handleResumeStream() {
  try {
    await streamActions.resumeStream()
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
  if (!pendingDeleteStream.value?.id) return

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

function handleContextMenu(payload: {
  event: MouseEvent
  streamId: string
  streamName: string
  isRunning: boolean
  isPaused: boolean
  isFinished: boolean
}) {
  contextMenu.showContextMenu(
    payload.event,
    payload.streamId,
    payload.streamName,
    payload.isRunning,
    payload.isPaused,
    payload.isFinished
  )
}

async function onContextMenuAction(payload: {
  action: string
  target: { streamId: string; streamName: string }
}) {
  contextMenu.closeContextMenu()

  switch (payload.action) {
    case 'start-stream':
      await handleStartStream({ streamId: payload.target.streamId })
      break
    case 'pause-stream':
      await handlePauseStream()
      break
    case 'resume-stream':
      await handleResumeStream()
      break
    case 'edit-stream':
      router.push({ name: 'EditStream', params: { id: payload.target.streamId } })
      break
    case 'clone-stream':
      await handleCloneStream({ streamId: payload.target.streamId })
      break
    case 'delete-stream':
      handleDeleteStream({ streamId: payload.target.streamId })
      break
  }
}

// Streams are loaded by StreamsView; sidebar only renders them.
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
