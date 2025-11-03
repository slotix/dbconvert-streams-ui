<template>
  <div class="h-full flex flex-col bg-white">
    <!-- Header -->
    <div class="px-6 py-4 bg-white flex-shrink-0">
      <div class="flex items-center justify-between mb-3">
        <div class="flex items-center min-w-0 flex-1 gap-3">
          <h2 class="text-xl font-semibold text-gray-900 truncate">{{ stream.name }}</h2>
        </div>
        <div class="flex items-center gap-2 ml-4">
          <button
            v-if="!isStreamRunning || isStreamFinished"
            v-tooltip="'Edit stream configuration'"
            type="button"
            class="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-warm-50 hover:border-gray-400 transition-all duration-200"
            @click="navigateToEdit"
          >
            Edit
          </button>
          <button
            v-if="!isStreamRunning || isStreamFinished"
            v-tooltip="'Clone stream configuration'"
            type="button"
            class="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-warm-50 hover:border-gray-400 transition-all duration-200"
            @click="cloneStream"
          >
            Clone
          </button>
          <button
            v-tooltip="
              isStreamRunning && !isStreamFinished
                ? 'Stream is currently running'
                : paginationData?.total > 0
                  ? 'Run the stream again'
                  : 'Start the stream'
            "
            :disabled="isStreamRunning && !isStreamFinished"
            type="button"
            :class="[
              'px-3 py-1.5 text-sm font-medium rounded-md transition-all duration-200',
              isStreamRunning && !isStreamFinished
                ? 'text-gray-500 bg-gray-300 cursor-not-allowed'
                : 'text-white bg-linear-to-b from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800 hover:shadow-md'
            ]"
            @click="startStream"
          >
            {{ paginationData?.total > 0 ? 'Run again' : 'Start' }}
          </button>
          <button
            v-if="!isStreamRunning || isStreamFinished"
            v-tooltip="'Delete stream configuration'"
            type="button"
            class="px-3 py-1.5 text-sm font-medium text-red-600 bg-white border border-red-200 rounded-lg hover:border-red-300 hover:bg-red-50 transition-all duration-200"
            @click="requestDelete"
          >
            Delete
          </button>
        </div>
      </div>

      <!-- Tabs (always visible) -->
      <div class="mt-3">
        <nav class="-mb-px flex gap-4" aria-label="Tabs">
          <button
            :class="[
              activeTab === 'configuration'
                ? 'border-teal-600 text-teal-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
              'whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm transition-colors'
            ]"
            @click="activeTab = 'configuration'"
          >
            Configuration
          </button>
          <button
            :class="[
              activeTab === 'monitor'
                ? 'border-teal-600 text-teal-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
              'whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm transition-colors'
            ]"
            @click="activeTab = 'monitor'"
          >
            Monitor
          </button>
          <button
            :class="[
              activeTab === 'history'
                ? 'border-teal-600 text-teal-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
              'whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm transition-colors'
            ]"
            @click="activeTab = 'history'"
          >
            History
          </button>
        </nav>
      </div>
    </div>

    <!-- Content -->
    <div class="flex-1 overflow-y-auto">
      <!-- Configuration Tab -->
      <div v-if="activeTab === 'configuration'" class="p-6 space-y-6">
        <!-- JSON Toggle (Always visible) -->
        <div class="flex items-center justify-end">
          <div class="flex items-center gap-2">
            <span class="text-xs text-gray-600">JSON</span>
            <Switch
              v-model="isJsonView"
              class="relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-gray-600 focus:ring-offset-2"
              :class="[isJsonView ? 'bg-gray-600' : 'bg-gray-400']"
            >
              <span class="sr-only">Toggle JSON view</span>
              <span
                aria-hidden="true"
                class="pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out"
                :class="[
                  isJsonView ? 'translate-x-5' : 'translate-x-0',
                  'shadow-[0_1px_4px_rgba(0,0,0,0.15)]'
                ]"
              />
            </Switch>
            <button
              v-if="isJsonView"
              v-tooltip="'Copy configuration'"
              class="p-1.5 text-gray-500 hover:text-gray-700 rounded-md hover:bg-gray-100"
              @click="copyConfig"
            >
              <ClipboardIcon class="h-4 w-4" />
            </button>
          </div>
        </div>

        <!-- JSON View -->
        <div v-if="isJsonView">
          <div
            class="rounded-md bg-gray-50 p-4 border border-gray-300 overflow-auto custom-scrollbar"
          >
            <pre
              v-highlightjs
              class="text-sm"
            ><code class="language-json block text-sm leading-6 select-text">{{ prettyConfig }}</code></pre>
          </div>
        </div>

        <!-- Connection Details (Normal View) -->
        <div v-else class="space-y-4">
          <!-- Mode -->
          <div class="pb-4 border-b border-gray-100">
            <div class="flex items-center gap-2">
              <span class="text-sm text-gray-500">Mode:</span>
              <span
                :class="[
                  'inline-flex items-center rounded-md px-2.5 py-1 text-xs font-medium ring-1 ring-inset',
                  stream.mode === 'cdc'
                    ? 'bg-orange-50 text-orange-700 ring-orange-600/20'
                    : 'bg-green-50 text-green-700 ring-green-600/20'
                ]"
              >
                {{ stream.mode.toUpperCase() }}
              </span>
            </div>
          </div>

          <!-- Source Connection -->
          <div>
            <label class="block text-xs font-medium uppercase text-gray-500 mb-2">
              Source Connection
            </label>
            <div class="bg-gray-50 rounded-md p-4 border border-gray-300">
              <div class="flex items-center gap-2 mb-2">
                <div
                  v-if="source && source.type"
                  :class="getDatabaseIconStyle(source.type)"
                  class="shrink-0 rounded-lg p-1.5 transition-all duration-200 hover:shadow-md"
                >
                  <img
                    class="h-5 w-5 object-contain"
                    :src="logoSrc(source.type)"
                    :alt="source.type + ' logo'"
                  />
                </div>
                <span
                  class="font-medium text-gray-900 truncate"
                  :class="{ 'text-red-500': !source || !source.name }"
                >
                  {{ source?.name || 'N/A' }}
                </span>
                <CloudProviderBadge
                  v-if="source"
                  :cloud-provider="source.cloud_provider"
                  :db-type="source.type"
                />
                <ExclamationCircleIcon
                  v-if="!source || !source.name"
                  class="h-4 w-4 text-red-500 shrink-0"
                  aria-hidden="true"
                />
              </div>
              <div class="text-sm text-gray-600">
                <ConnectionStringDisplay v-if="source" :connection="source" />
                <span v-else class="text-red-500 text-xs">Connection not found</span>
              </div>
            </div>
          </div>

          <!-- Target Connection -->
          <div>
            <label class="block text-xs font-medium uppercase text-gray-500 mb-2">
              Target Connection
            </label>
            <div class="bg-gray-50 rounded-md p-4 border border-gray-300">
              <div class="flex items-center gap-2 mb-2">
                <div
                  v-if="target && target.type"
                  :class="getDatabaseIconStyle(target.type)"
                  class="shrink-0 rounded-lg p-1.5 transition-all duration-200 hover:shadow-md"
                >
                  <img
                    class="h-5 w-5 object-contain"
                    :src="logoSrc(target.type)"
                    :alt="target.type + ' logo'"
                  />
                </div>
                <span
                  class="font-medium text-gray-900 truncate"
                  :class="{ 'text-red-500': !target || !target.name }"
                >
                  {{ target?.name || 'N/A' }}
                </span>
                <CloudProviderBadge
                  v-if="target"
                  :cloud-provider="target.cloud_provider"
                  :db-type="target.type"
                />
                <ExclamationCircleIcon
                  v-if="!target || !target.name"
                  class="h-4 w-4 text-red-500 shrink-0"
                  aria-hidden="true"
                />
              </div>
              <div class="text-sm text-gray-600">
                <ConnectionStringDisplay v-if="target" :connection="target" />
                <span v-else class="text-red-500 text-xs">Connection not found</span>
              </div>
            </div>
          </div>

          <!-- Output Format (for file-based targets) -->
          <div v-if="isFileTarget && stream.targetFileFormat">
            <label class="block text-xs font-medium uppercase text-gray-500 mb-2">
              Output Format
            </label>
            <div class="bg-gray-50 rounded-md p-4 border border-gray-300">
              <span
                :class="[
                  'inline-flex items-center rounded-md px-2.5 py-1 text-xs font-medium ring-1 ring-inset',
                  'bg-blue-50 text-blue-700 ring-blue-600/20'
                ]"
              >
                {{ stream.targetFileFormat.toUpperCase() }}
              </span>
            </div>
          </div>

          <!-- Tables Section -->
          <div>
            <label class="block text-xs font-medium uppercase text-gray-500 mb-2">Tables</label>
            <div class="bg-gray-50 rounded-md p-3 border border-gray-300">
              <p class="text-sm text-gray-900">
                {{ displayedTables.join(', ') }}{{ remainingTablesCount > 0 ? ', ...' : '' }}
                <span v-if="remainingTablesCount > 0" class="text-xs text-gray-500 italic ml-1">
                  ({{ remainingTablesCount }} more)
                </span>
              </p>
            </div>
          </div>

          <!-- Creation Date -->
          <div class="pt-4 border-t border-gray-100">
            <div class="flex items-center gap-2">
              <CalendarIcon class="h-4 w-4 text-gray-500" />
              <span class="text-sm text-gray-500">Created: {{ streamCreated }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Monitor Tab -->
      <div v-else-if="activeTab === 'monitor'" class="p-6 space-y-6">
        <!-- Unified Monitor Header (Status + Progress) -->
        <MonitorHeader
          :stream-config="stream"
          :is-running="isStreamRunning"
          :is-stream-finished="isStreamFinished"
          :is-paused="isPaused"
          :stream-status="streamStatus"
          :stream-i-d="monitoringStore.streamID"
          @pause="pauseStream"
          @resume="resumeStream"
          @stop="stopStream"
        />

        <!-- Output Files (for completed file-based streams) -->
        <div
          v-if="isFileTarget && isStreamFinished && target"
          class="rounded-md p-3 border border-gray-300 bg-gray-50"
        >
          <div class="flex items-center justify-between gap-3">
            <div class="flex-1 min-w-0">
              <p class="text-xs text-gray-500 uppercase font-medium mb-1">Output Files</p>
              <div class="flex items-center gap-3">
                <code class="text-xs bg-white px-2 py-1 rounded border border-gray-300 truncate">
                  {{ target.path }}
                </code>
                <span
                  :class="[
                    'shrink-0 inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset',
                    'bg-blue-50 text-blue-700 ring-blue-600/20'
                  ]"
                >
                  {{ stream.targetFileFormat?.toUpperCase() }}
                </span>
              </div>
            </div>
            <button
              type="button"
              class="shrink-0 inline-flex items-center px-3 py-2 text-xs font-medium text-teal-600 bg-white border border-teal-200 rounded-md hover:bg-teal-50 transition-colors whitespace-nowrap"
              @click="navigateToExplorer"
            >
              <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
                />
              </svg>
              Browse
            </button>
          </div>
        </div>

        <!-- Target Tables (for completed database-based streams) -->
        <div
          v-else-if="!isFileTarget && isStreamFinished && target"
          class="rounded-md p-3 border border-gray-300 bg-gray-50"
        >
          <div class="flex items-center justify-between gap-3">
            <div class="flex-1 min-w-0">
              <p class="text-xs text-gray-500 uppercase font-medium mb-1">Target Tables</p>
              <div class="flex items-center gap-3">
                <span class="text-xs text-gray-600 font-medium">
                  {{ stream.tables?.length || 0 }} table{{ stream.tables?.length !== 1 ? 's' : '' }}
                </span>
                <span
                  :class="[
                    'shrink-0 inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset',
                    'bg-purple-50 text-purple-700 ring-purple-600/20'
                  ]"
                >
                  {{ target.type?.toUpperCase() }}
                </span>
              </div>
            </div>
            <button
              type="button"
              class="shrink-0 inline-flex items-center px-3 py-2 text-xs font-medium text-teal-600 bg-white border border-teal-200 rounded-md hover:bg-teal-50 transition-colors whitespace-nowrap"
              @click="navigateToExplorer"
            >
              <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
                />
              </svg>
              View in Explorer
            </button>
          </div>
        </div>

        <!-- Performance Stats -->
        <StatContainer :is-running="isStreamRunning" />
      </div>

      <!-- History Tab -->
      <div v-else-if="activeTab === 'history'" class="p-6">
        <StreamHistoryTable
          :config-id="stream.id"
          :pagination-data="paginationData"
          @page-change="handlePageChange"
          @delete-run="handleDeleteRun"
          @clear-all="handleClearAll"
        />
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
import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ClipboardIcon, CalendarIcon, ExclamationCircleIcon } from '@heroicons/vue/24/outline'
import { Switch } from '@headlessui/vue'
import { useStreamsStore } from '@/stores/streamConfig'
import { useConnectionsStore } from '@/stores/connections'
import { useCommonStore } from '@/stores/common'
import { useMonitoringStore, statusEnum } from '@/stores/monitoring'
import { useFileExplorerStore } from '@/stores/fileExplorer'
import { useExplorerNavigationStore } from '@/stores/explorerNavigation'
import { apiClient } from '@/api/apiClient'
import ConnectionStringDisplay from '@/components/common/ConnectionStringDisplay.vue'
import CloudProviderBadge from '@/components/common/CloudProviderBadge.vue'
import MonitorHeader from '@/components/monitoring/MonitorHeader.vue'
import StatContainer from '@/components/monitoring/StatContainer.vue'
import StreamHistoryTable from './StreamHistoryTable.vue'
import ConfirmDialog from '@/components/common/ConfirmDialog.vue'
import { normalizeConnectionType } from '@/utils/connectionUtils'
import { formatDateTime } from '@/utils/formats'
import { getDatabaseIconBgColor, getDatabaseIconTint } from '@/constants/databaseColors'
import type { StreamConfig } from '@/types/streamConfig'
import type { Connection, DbType } from '@/types/connections'

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
const fileExplorerStore = useFileExplorerStore()
const explorerNavigationStore = useExplorerNavigationStore()

const isJsonView = ref(false)
const showDeleteConfirm = ref(false)
const activeTab = ref<'monitor' | 'configuration' | 'history'>('configuration')
const paginationData = ref<any>(null)
const isLoadingHistory = ref(false)
const historyAbortController = ref<AbortController | null>(null)

const dbTypes = connectionsStore.dbTypes

const isStreamRunning = computed(() => {
  // Check if this stream config is the one currently running
  // We need to check the config ID, not the stream ID, since they're different
  const configIDMatches = monitoringStore.streamConfig?.id === props.stream.id
  const hasStreamID = monitoringStore.streamID !== ''
  return configIDMatches && hasStreamID
})

const isPaused = computed(() => {
  if (!isStreamRunning.value) return false
  // Check both: stats (when nodes exist and report) and overall stream status
  const statsHasPaused = monitoringStore.stats.some((stat) => stat.status === 'PAUSED')
  const streamStatusIsPaused = monitoringStore.status === statusEnum.PAUSED
  return statsHasPaused || streamStatusIsPaused
})

const isStreamFinished = computed(() => {
  if (!isStreamRunning.value) return false
  const areAllNodesFinished =
    monitoringStore.stats.length > 0 &&
    monitoringStore.stats.every((stat) => stat.status === 'FINISHED')

  // Check overall stream status
  const finishedStates: number[] = [
    statusEnum.FINISHED,
    statusEnum.STOPPED,
    statusEnum.FAILED,
    statusEnum.TIME_LIMIT_REACHED,
    statusEnum.EVENT_LIMIT_REACHED
  ]
  const isStreamStatusFinished = finishedStates.includes(
    monitoringStore.status as unknown as number
  )

  return areAllNodesFinished || isStreamStatusFinished
})

const streamStatus = computed(() => {
  if (!isStreamRunning.value) return 'Not Running'
  if (isStreamFinished.value) {
    const hasFailed = monitoringStore.stats.some((stat) => stat.status === 'FAILED')
    const isStopped = monitoringStore.stats.some((stat) => stat.status === 'STOPPED')
    if (hasFailed) return 'Failed'
    if (isStopped) return 'Stopped'
    return 'Finished'
  }
  if (isPaused.value) return 'Paused'
  return monitoringStore.currentStage?.description || 'Running'
})

const streamCreated = computed(() => {
  return formatDateTime(props.stream?.created || 0)
})

const prettyConfig = computed(() => {
  return JSON.stringify(props.stream, null, 2)
})

const displayedTables = computed(() => {
  const maxDisplayedTables = 5
  if (props.stream && props.stream.tables && props.stream.tables.length) {
    return props.stream.tables.slice(0, maxDisplayedTables).map((table) => table.name)
  }
  return []
})

const remainingTablesCount = computed(() => {
  if (props.stream && props.stream.tables) {
    return Math.max(0, props.stream.tables.length - displayedTables.value.length)
  }
  return 0
})

const isFileTarget = computed(() => {
  if (!props.target) return false
  const targetType = props.target.type?.toLowerCase() || ''
  return targetType.includes('file')
})

// Fetch stream history from API using apiClient
async function loadStreamHistory(page: number = 1) {
  try {
    // Cancel any previous in-flight request to prevent race conditions
    if (historyAbortController.value) {
      historyAbortController.value.abort()
    }
    historyAbortController.value = new AbortController()

    isLoadingHistory.value = true
    const response = await apiClient.get(`/stream-configs/${props.stream.id}/history`, {
      params: {
        page,
        pageSize: 50
      },
      signal: historyAbortController.value.signal
    })

    paginationData.value = response.data
  } catch (error: unknown) {
    // Ignore abort errors - they're expected when switching streams
    if (error instanceof Error && error.name === 'AbortError') {
      console.debug('History request was cancelled due to stream switch')
      return
    }

    let errorMsg = 'Failed to load history'
    if (error instanceof Error) {
      errorMsg = error.message
    }
    commonStore.showNotification(errorMsg, 'error')
    console.error('Failed to load stream history:', error)
  } finally {
    isLoadingHistory.value = false
  }
}

async function handlePageChange(newPage: number) {
  await loadStreamHistory(newPage)
}

async function handleDeleteRun(runId: string) {
  try {
    await apiClient.delete(`/stream-configs/${props.stream.id}/runs/${runId}`)

    commonStore.showNotification('Run deleted successfully', 'success')
    // Reload history to reflect deletion
    await loadStreamHistory(1)
  } catch (error: unknown) {
    let errorMsg = 'Failed to delete stream run'
    if (error instanceof Error) {
      errorMsg = error.message
    }
    commonStore.showNotification(errorMsg, 'error')
    console.error('Failed to delete run:', error)
  }
}

async function handleClearAll() {
  try {
    // Call the backend endpoint to delete all runs at once
    await apiClient.delete(`/stream-configs/${props.stream.id}/runs`)

    commonStore.showNotification('All runs deleted successfully', 'success')
    // Reload history to refresh the UI
    await loadStreamHistory(1)
  } catch (error: unknown) {
    let errorMsg = 'Failed to delete all runs'
    if (error instanceof Error) {
      errorMsg = error.message
    }
    commonStore.showNotification(errorMsg, 'error')
    console.error('Failed to delete all runs:', error)
  }
}

// Abort any pending requests and reload history when switching streams
watch(
  () => props.stream.id,
  async () => {
    // Cancel any in-flight requests for the previous stream
    if (historyAbortController.value) {
      historyAbortController.value.abort()
    }
    // Clear history data when switching streams
    paginationData.value = null

    // If currently viewing History tab, reload data for the new stream
    if (activeTab.value === 'history') {
      await loadStreamHistory(1)
    }
  }
)

// Load history when history tab is opened
watch(
  () => activeTab.value,
  async (newTab) => {
    if (newTab === 'history') {
      // Always load fresh data when switching to history tab
      // No frontend caching - data comes from backend on demand
      await loadStreamHistory(1)
    }
  }
)

// Watch for stream finish to refresh history
watch(isStreamFinished, async (finished, wasFinished) => {
  // Only trigger when transitioning from not-finished to finished
  if (finished && !wasFinished) {
    // Wait a bit for backend to save history
    setTimeout(async () => {
      // Reload history if currently viewing the history tab
      if (activeTab.value === 'history') {
        await loadStreamHistory(1)
      }
    }, 2000)
  }
})

const logoSrc = (dbType: string) => {
  const normalizedInput = normalizeConnectionType(dbType?.toLowerCase() || '')
  const type = dbTypes.find(
    (f: DbType) => normalizeConnectionType(f.type.toLowerCase()) === normalizedInput
  )
  return type ? type.logo : '/images/db-logos/all.svg'
}

const getDatabaseIconStyle = (dbType: string) => {
  // Use the same muted icon color system as ConnectionTreeItem
  const bgColor = getDatabaseIconBgColor(dbType || '')
  const tint = getDatabaseIconTint(dbType || '')
  return `${bgColor} ${tint || ''}`
}

function copyConfig() {
  navigator.clipboard.writeText(prettyConfig.value)
  commonStore.showNotification('Configuration copied to clipboard', 'success')
}

function navigateToEdit() {
  router.push({ name: 'EditStream', params: { id: props.stream.id } })
}

async function navigateToExplorer() {
  if (props.target?.id && props.stream?.targetDatabase) {
    // Set active connection in explorer navigation store
    explorerNavigationStore.setActiveConnectionId(props.target.id)

    // Also set in connections store to match handleSelectConnection behavior
    connectionsStore.setCurrentConnection(props.target.id)

    if (isFileTarget.value) {
      // For file-based targets, load file entries and select the connection
      await fileExplorerStore.loadEntries(props.target.id, true)
      explorerNavigationStore.selectConnection(props.target.id)

      // Use sessionStorage to pass focus connection ID
      window.sessionStorage.setItem('explorerFocusConnectionId', props.target.id)
    } else {
      // For database-based targets, select the database
      explorerNavigationStore.selectDatabase(props.target.id, props.stream.targetDatabase)
    }

    router.push({
      name: 'DatabaseMetadata',
      params: { id: props.target.id },
      query: {
        details: 'true',
        db: isFileTarget.value ? undefined : props.stream.targetDatabase
      }
    })
  }
}

async function cloneStream() {
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

async function startStream() {
  try {
    const streamID = await streamsStore.startStream(props.stream.id)
    commonStore.showNotification('Stream started', 'success')
    monitoringStore.setStream(streamID, props.stream)

    // Request to show monitor tab
    monitoringStore.requestShowMonitorTab()
  } catch (err: unknown) {
    if (err instanceof Error) {
      commonStore.showNotification(err.message, 'error')
    } else {
      commonStore.showNotification('An unknown error occurred', 'error')
    }
  }
}

async function pauseStream() {
  try {
    await streamsStore.pauseStream(monitoringStore.streamID)
    commonStore.showNotification('Stream paused', 'success')
    // Request to show monitor tab
    monitoringStore.requestShowMonitorTab()
  } catch (error) {
    console.error('Pause stream failed:', error)
    const errorMsg = error instanceof Error ? error.message : String(error)
    commonStore.showNotification(`Failed to pause: ${errorMsg}`, 'error')
  }
}

async function resumeStream() {
  try {
    await streamsStore.resumeStream(monitoringStore.streamID)
    commonStore.showNotification('Stream resumed', 'success')
    // Request to show monitor tab
    monitoringStore.requestShowMonitorTab()
  } catch (error) {
    console.error('Resume stream failed:', error)
    const errorMsg = error instanceof Error ? error.message : String(error)
    commonStore.showNotification(`Failed to resume: ${errorMsg}`, 'error')
  }
}

async function stopStream() {
  try {
    await streamsStore.stopStream(monitoringStore.streamID)
    commonStore.showNotification('Stream stopped', 'success')
    // Request to show monitor tab
    monitoringStore.requestShowMonitorTab()
  } catch (error) {
    console.error('Stop stream failed:', error)
    const errorMsg = error instanceof Error ? error.message : String(error)
    commonStore.showNotification(`Failed to stop: ${errorMsg}`, 'error')
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

<style scoped>
@reference '../../assets/style.css';

/* Scrollbar styles */
.custom-scrollbar {
  scrollbar-width: thin;
  scrollbar-color: #e5e7eb transparent;
}

.custom-scrollbar::-webkit-scrollbar {
  @apply h-2 w-2;
}

.custom-scrollbar::-webkit-scrollbar-track {
  @apply bg-gray-50;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
  @apply bg-gray-300 rounded-full hover:bg-gray-400 transition-colors;
}

/* Code block styles */
pre {
  tab-size: 2;
  user-select: text;
}

::selection {
  @apply bg-blue-100;
}

/* JSON syntax highlighting */
.hljs {
  @apply bg-gray-50 font-mono;
  color: #24292e;
  padding: 0;
}

.hljs-attr {
  @apply text-[#d73a49] font-semibold;
}

.hljs-string {
  @apply text-[#032f62];
}

.hljs-number {
  @apply text-[#005cc5];
}

.hljs-literal {
  @apply text-[#005cc5];
}

.hljs-punctuation {
  @apply text-[#24292e];
}

.hljs-comment {
  @apply text-[#6a737d] italic;
}
</style>
