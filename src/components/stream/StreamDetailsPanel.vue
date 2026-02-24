<template>
  <div class="h-[calc(100vh-140px)] flex flex-col bg-white dark:bg-gray-850">
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
            v-tooltip="'Edit using step-by-step wizard'"
            variant="secondary"
            @click="navigateToEdit"
          >
            Edit
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
            <Play class="h-4 w-4" :stroke-width="iconStroke" />
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
              <Play class="h-4 w-4" :stroke-width="iconStroke" />
              Run Stream
            </BaseButton>

            <!-- Run Again button (when finished) -->
            <BaseButton
              v-if="isStreamFinished"
              v-tooltip="'Run this configuration again'"
              variant="primary"
              @click="startStream"
            >
              <Play class="h-4 w-4" :stroke-width="iconStroke" />
              Run Again
            </BaseButton>

            <!-- Pause/Resume button (when running) -->
            <BaseButton
              v-if="isStreamRunning && !isStreamFinished"
              v-tooltip="isPaused ? 'Resume the stream' : 'Pause the stream'"
              variant="secondary"
              @click="isPaused ? resumeStream() : pauseStream()"
            >
              <Play v-if="isPaused" class="h-4 w-4" :stroke-width="iconStroke" />
              <Pause v-else class="h-4 w-4" :stroke-width="iconStroke" />
              {{ isPaused ? 'Resume' : 'Pause' }}
            </BaseButton>

            <!-- Stop button (when running) -->
            <BaseButton
              v-if="isStreamRunning && !isStreamFinished"
              v-tooltip="'Stop the stream'"
              variant="danger"
              @click="stopStream"
            >
              <Square class="h-4 w-4" :stroke-width="iconStroke" />
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
            <Play class="h-4 w-4" :stroke-width="iconStroke" />
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
            <Play class="h-4 w-4" :stroke-width="iconStroke" />
            Run New Stream
          </BaseButton>
        </div>
      </div>

      <!-- Evaluation Banner (always visible when user is near/over limits) -->
      <div
        v-if="evaluationBanner"
        class="mt-3 rounded-lg border border-amber-200 bg-amber-50/70 px-4 py-3 text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-100"
      >
        <div class="flex items-start gap-3">
          <AlertTriangle class="h-5 w-5 text-amber-600 dark:text-amber-300 mt-0.5" />
          <div class="space-y-1">
            <div class="text-sm font-semibold">
              {{ evaluationBannerTitle }}
            </div>
            <p class="text-sm text-amber-800 dark:text-amber-200">
              {{ evaluationBannerBody }}
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- Content -->
    <div class="flex-1 overflow-y-auto">
      <!-- Configuration Tab -->
      <div v-if="activeTab === 'configuration'" class="p-6 space-y-6">
        <StreamConfigurationView
          :stream="stream"
          :source="source"
          :target="target"
          :all-connections="allConnections"
          :db-types="dbTypes"
          :is-file-target="isFileTarget"
          @navigate-source="navigateToSourceExplorer"
          @navigate-target="navigateToTargetExplorer"
          @navigate-federated="navigateToConnectionExplorer"
        />
        <div class="pt-6 border-t border-gray-100 dark:border-gray-800">
          <StreamConfigJsonEditor
            v-if="!isStreamRunning || isStreamFinished"
            ref="jsonEditorRef"
            :config="stream"
            height="600px"
            @save="handleSaveConfig"
          />
          <div
            v-else
            class="rounded-lg border border-amber-200/80 dark:border-amber-700/60 bg-amber-50/70 dark:bg-amber-900/20 p-4 text-sm text-amber-800 dark:text-amber-200"
          >
            JSON configuration editing is disabled while the stream is running.
          </div>
        </div>
      </div>

      <!-- Monitor Tab -->
      <div v-else-if="activeTab === 'monitor'" class="p-6">
        <div v-if="hasActiveRun" class="space-y-6">
          <!-- Performance Stats -->
          <StatContainer
            :stream="stream"
            :is-running="isStreamRunning"
            :is-stream-finished="isStreamFinished"
            :is-stopped="isStopped"
            :is-paused="isPaused"
            :stream-status="streamStatus"
            @compare-table="handleCompareTable"
          />
        </div>
        <div
          v-else
          class="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/30 p-8 text-center"
        >
          <h4 class="text-base font-semibold text-gray-900 dark:text-gray-100">No data yet</h4>
          <p class="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Run the stream to see live statistics
          </p>
        </div>
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
import { Play, Pause, Square, AlertTriangle } from 'lucide-vue-next'
import { useLucideIcons } from '@/composables/useLucideIcons'
import { useStreamsStore } from '@/stores/streamConfig'
import { useConnectionsStore } from '@/stores/connections'
import { useCommonStore } from '@/stores/common'
import { useMonitoringStore } from '@/stores/monitoring'
import BaseButton from '@/components/base/BaseButton.vue'
import StatContainer from '@/components/monitoring/StatContainer.vue'
import ConfirmDialog from '@/components/common/ConfirmDialog.vue'
import StreamConfigJsonEditor from '@/components/stream/StreamConfigJsonEditor.vue'
import type { StreamConfig } from '@/types/streamConfig'
import type { Connection } from '@/types/connections'
import StreamConfigurationView from '@/components/stream/StreamConfigurationView.vue'
import { useStreamControls } from '@/composables/useStreamControls'
import { useStreamHistory, type StreamDetailsTab } from '@/composables/useStreamHistory'
import { useStreamExplorerNavigation } from '@/composables/useStreamExplorerNavigation'
import { updateStreamsViewState, setSelectedStreamInViewState } from '@/utils/streamsViewState'
import { formatDataSize, formatElapsedTimeWithUnit } from '@/utils/formats'

// Lazy load heavy components that use ag-grid
const StreamHistoryTableAGGrid = defineAsyncComponent(
  () => import('./StreamHistoryTableAGGrid.vue')
)
const StreamCompareView = defineAsyncComponent(() => import('./StreamCompareView.vue'))

const props = defineProps<{
  stream: StreamConfig
  source?: Connection
  target?: Connection
  initialTab?: StreamDetailsTab
}>()

const emit = defineEmits<{
  (e: 'stream-deleted'): void
}>()

const router = useRouter()
const streamsStore = useStreamsStore()
const connectionsStore = useConnectionsStore()
const commonStore = useCommonStore()
const monitoringStore = useMonitoringStore()
const { strokeWidth: iconStroke } = useLucideIcons()

const showDeleteConfirm = ref(false)
const jsonEditorRef = ref<InstanceType<typeof StreamConfigJsonEditor> | null>(null)
const activeTab = ref<StreamDetailsTab>(props.initialTab || 'configuration')

// Watch for initialTab prop changes (persisted in localStorage)
watch(
  () => props.initialTab,
  (newTab) => {
    if (newTab) {
      activeTab.value = newTab
    }
  }
)

watch(
  () => activeTab.value,
  (newTab) => {
    updateStreamsViewState({
      selectedStreamId: props.stream.id,
      tab: newTab
    })
  },
  { immediate: true }
)

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

const dbTypes = computed(() => connectionsStore.dbTypes)
const allConnections = computed(() => connectionsStore.connections)

const {
  isFileTarget,
  navigateToSourceExplorer,
  navigateToTargetExplorer,
  navigateToConnectionExplorer
} = useStreamExplorerNavigation({
  stream: streamRef,
  source: sourceRef,
  target: targetRef,
  allConnections
})

const streamIdRef = computed(() => streamRef.value.id || '')
const hasActiveRun = computed(() => {
  return monitoringStore.streamConfig?.id === props.stream.id && monitoringStore.streamID !== ''
})

const evaluationBanner = computed(() => {
  const mode = props.stream.mode

  const subscriptionStatus = (commonStore.userData?.subscriptionStatus || '').toLowerCase()
  if (subscriptionStatus === 'active') return null

  const streamID = monitoringStore.streamID

  const liveWarning = monitoringStore.evaluationWarning
  if (
    isStreamRunning.value &&
    liveWarning &&
    liveWarning.streamId === streamID &&
    liveWarning.mode === mode &&
    liveWarning.threshold >= 90
  ) {
    return liveWarning
  }

  const evaluation = commonStore.userData?.evaluation
  if (!evaluation) return null

  const warnedPercent =
    mode === 'convert' ? evaluation.convert_warned_percent || 0 : evaluation.cdc_warned_percent || 0
  if (warnedPercent < 90) return null

  const used = mode === 'convert' ? evaluation.convert_bytes : evaluation.cdc_seconds
  const limit = mode === 'convert' ? evaluation.convert_limit_bytes : evaluation.cdc_limit_seconds
  if (!limit) return null

  const percent = Math.min(100, Math.floor((used / limit) * 100))
  return {
    streamId: streamID,
    mode,
    threshold: warnedPercent,
    percent,
    used,
    limit,
    message: '',
    updatedAt: Date.now()
  }
})

const evaluationBannerTitle = computed(() => {
  if (!evaluationBanner.value) return ''
  return evaluationBanner.value.percent >= 100
    ? 'Evaluation limit reached'
    : 'Evaluation limit almost reached'
})

const evaluationBannerBody = computed(() => {
  const warning = evaluationBanner.value
  if (!warning) return ''
  const modeLabel = warning.mode === 'convert' ? 'Convert usage' : 'CDC runtime'
  const usedLabel =
    warning.mode === 'convert' ? formatDataSize(warning.used) : formatDurationSeconds(warning.used)
  const limitLabel =
    warning.mode === 'convert'
      ? formatDataSize(warning.limit)
      : formatDurationSeconds(warning.limit)
  const percent = warning.percent || warning.threshold
  const suffix =
    percent >= 100
      ? 'New streams will not start until you subscribe.'
      : 'Subscribe soon to continue without interruption.'
  return `${modeLabel} at ${percent}% (${usedLabel} of ${limitLabel}). ${suffix}`
})

function formatDurationSeconds(seconds: number) {
  const formatted = formatElapsedTimeWithUnit(seconds * 1e9)
  return `${formatted.value}${formatted.unit}`
}

const { historyRuns, handleDeleteRun, handleClearAll } = useStreamHistory({
  streamId: streamIdRef,
  activeTab,
  isStreamFinished
})

interface StreamTab {
  id: StreamDetailsTab
  label: string
  visible: boolean
}

const tabs = computed<StreamTab[]>(() => [
  { id: 'configuration', label: 'Configuration', visible: true },
  { id: 'monitor', label: 'Monitor', visible: true },
  { id: 'compare', label: 'Compare', visible: Boolean(sourceRef.value && targetRef.value) },
  { id: 'history', label: 'History', visible: true }
])

const visibleTabs = computed(() => tabs.value.filter((tab) => tab.visible))

function navigateToEdit() {
  router.push({ name: 'EditStream', params: { id: props.stream.id } })
}

async function handleSaveConfig(config: StreamConfig) {
  const configID = props.stream.id
  if (!configID) {
    jsonEditorRef.value?.onSaveError('Stream ID is missing')
    return
  }

  try {
    await streamsStore.updateStreamConfig(configID, config)
    jsonEditorRef.value?.onSaveSuccess()
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to save configuration'
    jsonEditorRef.value?.onSaveError(errorMessage)
  }
}

function handleCompareTable(tableName: string) {
  // Switch to Compare tab and pass the table name
  activeTab.value = 'compare'
  // Note: The StreamCompareView component will need to handle table selection
  // This could be done via URL query params or by passing a prop
  // For now, just switching to the Compare tab
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

    // Ensure we don't persist a deleted stream as the last selection.
    setSelectedStreamInViewState()

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
