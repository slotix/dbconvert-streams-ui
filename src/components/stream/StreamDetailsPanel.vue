<template>
  <div class="h-full flex flex-col bg-white dark:bg-gray-850">
    <!-- Top Level Tabs (always visible) -->
    <div
      class="px-6 pt-4 pb-0 bg-white dark:bg-gray-850 shrink-0 border-b border-gray-200 dark:border-gray-700"
    >
      <nav class="flex gap-4" aria-label="Tabs">
        <button
          v-for="tab in visibleTabs"
          :key="tab.id"
          :class="[
            activeTab === tab.id
              ? 'border-teal-600 dark:border-teal-400 text-teal-600 dark:text-teal-400'
              : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-700',
            'whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm transition-colors'
          ]"
          @click="activeTab = tab.id"
        >
          {{ tab.label }}
        </button>
      </nav>
    </div>

    <!-- Context-Aware Header Per Tab -->
    <div class="px-6 py-4 bg-white dark:bg-gray-850 shrink-0">
      <!-- Configuration Tab Header -->
      <div v-if="activeTab === 'configuration'" class="flex items-center justify-between">
        <div class="flex items-center min-w-0 flex-1 gap-3">
          <h2 class="text-xl font-semibold text-gray-900 dark:text-gray-100 truncate">
            {{ stream.name }}
          </h2>
        </div>
        <div class="flex items-center gap-2 ml-4">
          <BaseButton
            v-if="!isStreamRunning || isStreamFinished"
            v-tooltip="'Edit stream configuration'"
            variant="secondary"
            @click="navigateToEdit"
          >
            Edit Config
          </BaseButton>
          <BaseButton
            v-if="!isStreamRunning || isStreamFinished"
            v-tooltip="'Clone stream configuration'"
            variant="secondary"
            @click="cloneStream"
          >
            Clone Config
          </BaseButton>
          <BaseButton
            v-tooltip="
              isStreamRunning && !isStreamFinished
                ? 'Stream is currently running'
                : historyRuns.length > 0
                  ? 'Run a new stream'
                  : 'Start the stream'
            "
            :disabled="isStreamRunning && !isStreamFinished"
            variant="primary"
            @click="startStream"
          >
            <PlayIcon class="h-4 w-4" />
            {{ historyRuns.length > 0 ? 'Run New Stream' : 'Start' }}
          </BaseButton>
          <BaseButton
            v-if="!isStreamRunning || isStreamFinished"
            v-tooltip="'Delete stream configuration'"
            variant="danger"
            @click="requestDelete"
          >
            Delete Config
          </BaseButton>
        </div>
      </div>

      <!-- Monitor Tab Header -->
      <div v-else-if="activeTab === 'monitor'" class="space-y-2">
        <div class="flex items-center justify-between">
          <div class="flex items-center min-w-0 flex-1 gap-3">
            <span class="text-xs text-gray-500 dark:text-gray-400 shrink-0">Stream Run:</span>
            <h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100 font-mono truncate">
              {{ monitoringStore.streamID || 'Not running' }}
            </h2>
          </div>
          <div class="flex items-center gap-2 ml-4">
            <!-- Run Stream button (when not running) -->
            <BaseButton
              v-if="!isStreamRunning"
              v-tooltip="'Start the stream'"
              variant="primary"
              @click="startStream"
            >
              <PlayIcon class="h-4 w-4" />
              Run Stream
            </BaseButton>

            <!-- Run Again button (when finished) -->
            <BaseButton
              v-if="isStreamFinished"
              v-tooltip="'Run this configuration again'"
              variant="primary"
              @click="startStream"
            >
              <PlayIcon class="h-4 w-4" />
              Run Again
            </BaseButton>

            <!-- Pause/Resume button (when running) -->
            <BaseButton
              v-if="isStreamRunning && !isStreamFinished"
              v-tooltip="isPaused ? 'Resume the stream' : 'Pause the stream'"
              variant="secondary"
              @click="isPaused ? resumeStream() : pauseStream()"
            >
              <PlayIcon v-if="isPaused" class="h-4 w-4" />
              <PauseIcon v-else class="h-4 w-4" />
              {{ isPaused ? 'Resume' : 'Pause' }}
            </BaseButton>

            <!-- Stop button (when running) -->
            <BaseButton
              v-if="isStreamRunning && !isStreamFinished"
              v-tooltip="'Stop the stream'"
              variant="danger"
              @click="stopStream"
            >
              <StopIcon class="h-4 w-4" />
              Stop
            </BaseButton>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <span class="text-xs text-gray-500 dark:text-gray-400">Config:</span>
          <span class="text-sm text-gray-700 dark:text-gray-300 font-medium">{{
            stream.name
          }}</span>
        </div>
      </div>

      <!-- History Tab Header -->
      <div v-else-if="activeTab === 'history'" class="flex items-center justify-between">
        <div class="flex items-center min-w-0 flex-1 gap-3">
          <h2 class="text-xl font-semibold text-gray-900 dark:text-gray-100 truncate">
            {{ stream.name }}
          </h2>
        </div>
        <div class="flex items-center gap-2 ml-4">
          <BaseButton
            v-tooltip="'Run a new stream from this configuration'"
            variant="primary"
            :disabled="isStreamRunning && !isStreamFinished"
            @click="startStream"
          >
            <PlayIcon class="h-4 w-4" />
            Run New Stream
          </BaseButton>
        </div>
      </div>

      <!-- Compare Tab Header -->
      <div v-else-if="activeTab === 'compare'" class="flex items-center justify-between">
        <div class="flex items-center min-w-0 flex-1 gap-3">
          <h2 class="text-xl font-semibold text-gray-900 dark:text-gray-100 truncate">
            Compare: {{ stream.name }}
          </h2>
        </div>
        <div class="flex items-center gap-2 ml-4">
          <BaseButton
            v-tooltip="'Run a new stream from this configuration'"
            variant="primary"
            :disabled="isStreamRunning && !isStreamFinished"
            @click="startStream"
          >
            <PlayIcon class="h-4 w-4" />
            Run New Stream
          </BaseButton>
        </div>
      </div>
    </div>

    <!-- Content -->
    <div class="flex-1 overflow-y-auto">
      <!-- Configuration Tab -->
      <div v-if="activeTab === 'configuration'" class="p-6">
        <StreamConfigurationView
          v-model:is-json-view="isJsonView"
          :stream="stream"
          :source="source"
          :target="target"
          :db-types="dbTypes"
          :is-file-target="isFileTarget"
          @navigate-source="navigateToSourceExplorer"
          @navigate-target="navigateToTargetExplorer"
          @stream-updated="handleStreamUpdated"
        />
      </div>

      <!-- Monitor Tab -->
      <div v-else-if="activeTab === 'monitor'" class="p-6 space-y-6">
        <!-- Performance Stats -->
        <StatContainer
          :is-running="isStreamRunning"
          :is-stream-finished="isStreamFinished"
          :is-stopped="isStopped"
          :is-paused="isPaused"
          :stream-status="streamStatus"
          @compare-table="handleCompareTable"
        />
      </div>

      <!-- History Tab -->
      <div v-else-if="activeTab === 'history'" class="p-6">
        <StreamHistoryTableAGGrid
          :config-id="stream.id || ''"
          :runs="historyRuns"
          @delete-run="handleDeleteRun"
          @clear-all="handleClearAll"
        />
      </div>

      <!-- Compare Tab -->
      <div v-else-if="activeTab === 'compare'" class="h-full">
        <StreamCompareView
          v-if="source && target"
          :stream="stream"
          :source="source"
          :target="target"
        />
        <div v-else class="p-6">
          <div class="text-center text-gray-500 dark:text-gray-400 py-8">
            <p>Source or target connection not available</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Delete Confirmation Dialog -->
    <ConfirmDialog
      v-model:is-open="showDeleteConfirm"
      title="Delete stream configuration?"
      description="This action cannot be undone. The stream configuration will be permanently removed."
      confirm-label="Delete"
      cancel-label="Cancel"
      :danger="true"
      @confirm="deleteStream"
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
import { ref, computed, watch, defineAsyncComponent, toRef } from 'vue'
import { useRouter } from 'vue-router'
import { PlayIcon, PauseIcon, StopIcon } from '@heroicons/vue/24/outline'
import { useStreamsStore } from '@/stores/streamConfig'
import { useConnectionsStore } from '@/stores/connections'
import { useCommonStore } from '@/stores/common'
import { useMonitoringStore } from '@/stores/monitoring'
import BaseButton from '@/components/base/BaseButton.vue'
import StatContainer from '@/components/monitoring/StatContainer.vue'
import ConfirmDialog from '@/components/common/ConfirmDialog.vue'
import type { StreamConfig } from '@/types/streamConfig'
import type { Connection } from '@/types/connections'
import StreamConfigurationView from '@/components/stream/StreamConfigurationView.vue'
import { useStreamControls } from '@/composables/useStreamControls'
import { useStreamHistory, type StreamDetailsTab } from '@/composables/useStreamHistory'
import { useStreamExplorerNavigation } from '@/composables/useStreamExplorerNavigation'

// Lazy load heavy components that use ag-grid
const StreamHistoryTableAGGrid = defineAsyncComponent(
  () => import('./StreamHistoryTableAGGrid.vue')
)
const StreamCompareView = defineAsyncComponent(() => import('./StreamCompareView.vue'))

const props = defineProps<{
  stream: StreamConfig
  source?: Connection
  target?: Connection
}>()

const emit = defineEmits<{
  (e: 'stream-deleted'): void
}>()

const router = useRouter()
const streamsStore = useStreamsStore()
const connectionsStore = useConnectionsStore()
const commonStore = useCommonStore()
const monitoringStore = useMonitoringStore()

const isJsonView = ref(false)
const showDeleteConfirm = ref(false)
const activeTab = ref<StreamDetailsTab>('configuration')

const streamRef = toRef(props, 'stream')
const sourceRef = toRef(props, 'source')
const targetRef = toRef(props, 'target')

const {
  isStreamRunning,
  isPaused,
  isStreamFinished,
  isStopped,
  streamStatus,
  startStream,
  pauseStream,
  resumeStream,
  stopStream
} = useStreamControls(streamRef)

const { isFileTarget, navigateToSourceExplorer, navigateToTargetExplorer } =
  useStreamExplorerNavigation({
    stream: streamRef,
    source: sourceRef,
    target: targetRef
  })

const streamIdRef = computed(() => streamRef.value.id || '')

const { historyRuns, handleDeleteRun, handleClearAll } = useStreamHistory({
  streamId: streamIdRef,
  activeTab,
  isStreamFinished
})

const dbTypes = computed(() => connectionsStore.dbTypes)

interface StreamTab {
  id: StreamDetailsTab
  label: string
  visible: boolean
}

const tabs = computed<StreamTab[]>(() => [
  { id: 'configuration', label: 'Configuration', visible: true },
  { id: 'monitor', label: 'Monitor', visible: true },
  { id: 'history', label: 'History', visible: true },
  { id: 'compare', label: 'Compare', visible: isStreamFinished.value }
])

const visibleTabs = computed(() => tabs.value.filter((tab) => tab.visible))

function navigateToEdit() {
  router.push({ name: 'EditStream', params: { id: props.stream.id } })
}

function handleCompareTable(tableName: string) {
  // Switch to Compare tab and pass the table name
  activeTab.value = 'compare'
  // Note: The StreamCompareView component will need to handle table selection
  // This could be done via URL query params or by passing a prop
  // For now, just switching to the Compare tab
}

function handleStreamUpdated(updatedConfig: StreamConfig) {
  // Update the stream in the store - this will trigger reactivity
  if (updatedConfig.id) {
    const index = streamsStore.streamConfigs.findIndex((c) => c.id === updatedConfig.id)
    if (index !== -1) {
      streamsStore.streamConfigs[index] = updatedConfig
    }
  }
}

async function cloneStream() {
  if (!props.stream.id) return
  try {
    await streamsStore.cloneStreamConfig(props.stream.id)
    commonStore.showNotification('Stream cloned successfully', 'success')
  } catch (err: unknown) {
    if (err instanceof Error) {
      commonStore.showNotification(err.message, 'error')
    } else {
      commonStore.showNotification('Failed to clone stream', 'error')
    }
  }
}

function requestDelete() {
  showDeleteConfirm.value = true
}

function cancelDelete() {
  showDeleteConfirm.value = false
}

async function deleteStream() {
  if (!props.stream.id) return
  try {
    await streamsStore.deleteStreamConfig(props.stream.id)
    commonStore.showNotification('Stream deleted', 'success')
    showDeleteConfirm.value = false
    emit('stream-deleted')
  } catch (e: unknown) {
    if (e instanceof Error) {
      commonStore.showNotification(e.message, 'error')
    } else {
      commonStore.showNotification('An unknown error occurred', 'error')
    }
  }
}

// Auto-switch to monitor tab when requested
watch(
  () => monitoringStore.shouldShowMonitorTab,
  (shouldShow) => {
    if (shouldShow && monitoringStore.streamConfig?.id === props.stream.id) {
      activeTab.value = 'monitor'
      // Reset the flag after switching
      monitoringStore.resetShowMonitorTab()
    }
  }
)
</script>
