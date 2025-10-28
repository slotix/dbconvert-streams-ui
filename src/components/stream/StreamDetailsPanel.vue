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
            class="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            @click="navigateToEdit"
          >
            Edit
          </button>
          <button
            v-if="!isStreamRunning || isStreamFinished"
            v-tooltip="'Clone stream configuration'"
            type="button"
            class="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            @click="cloneStream"
          >
            Clone
          </button>
          <button
            v-if="!isStreamRunning || isStreamFinished"
            v-tooltip="historyRuns.length > 0 ? 'Run the stream again' : 'Start the stream'"
            type="button"
            class="px-3 py-1.5 text-sm font-medium text-white bg-cyan-600 rounded-md hover:bg-cyan-700 transition-colors"
            @click="startStream"
          >
            {{ historyRuns.length > 0 ? 'Run again' : 'Start' }}
          </button>
          <button
            v-if="!isStreamRunning || isStreamFinished"
            v-tooltip="'Delete stream configuration'"
            type="button"
            class="px-3 py-1.5 text-sm font-medium text-red-600 bg-white border border-gray-300 rounded-md hover:bg-red-50 transition-colors"
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
                ? 'border-cyan-600 text-cyan-600'
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
                ? 'border-cyan-600 text-cyan-600'
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
                ? 'border-cyan-600 text-cyan-600'
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
            class="rounded-md bg-gray-50 p-4 border border-gray-200 overflow-auto custom-scrollbar"
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
            <div class="bg-gray-50 rounded-md p-4 border border-gray-200">
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
            <div class="bg-gray-50 rounded-md p-4 border border-gray-200">
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

          <!-- Tables Section -->
          <div>
            <label class="block text-xs font-medium uppercase text-gray-500 mb-2">Tables</label>
            <div class="bg-gray-50 rounded-md p-3 border border-gray-200">
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
        <!-- Stream Not Running State -->
        <div v-if="!isStreamRunning" class="text-center py-12">
          <div
            class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4"
          >
            <PlayIcon class="h-8 w-8 text-gray-400" />
          </div>
          <p class="text-gray-500 text-sm mb-4">Stream is not currently running</p>
          <p class="text-gray-400 text-xs">Start the stream to view monitoring data</p>
        </div>

        <!-- Stream Running State -->
        <div v-else>
          <!-- Status Summary Bar -->
          <div
            class="bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200 rounded-lg p-4 mb-6"
          >
            <div class="flex items-center justify-between flex-wrap gap-4">
              <!-- Status -->
              <div class="flex items-center gap-3">
                <div
                  :class="[
                    'flex items-center justify-center w-10 h-10 rounded-full',
                    isStreamFinished ? 'bg-green-100' : isPaused ? 'bg-yellow-100' : 'bg-blue-100'
                  ]"
                >
                  <span
                    v-if="!isStreamFinished && !isPaused"
                    class="inline-block w-3 h-3 rounded-full bg-blue-600 animate-pulse"
                  ></span>
                  <svg
                    v-else-if="isStreamFinished"
                    class="h-6 w-6 text-green-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  <PauseIcon v-else class="h-6 w-6 text-yellow-600" />
                </div>
                <div>
                  <p class="text-xs font-medium uppercase text-gray-500">Status</p>
                  <p
                    :class="[
                      'text-lg font-semibold',
                      isStreamFinished
                        ? 'text-green-700'
                        : isPaused
                          ? 'text-yellow-700'
                          : 'text-blue-700'
                    ]"
                  >
                    {{ streamStatus }}
                  </p>
                </div>
              </div>

              <!-- Stream Controls -->
              <div class="flex gap-2">
                <button
                  v-if="!isPaused && !isStreamFinished"
                  class="px-4 py-2 bg-white text-cyan-600 font-medium rounded-md hover:bg-gray-50 border border-cyan-300 focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-colors flex items-center gap-2 text-sm"
                  @click="pauseStream"
                >
                  <PauseIcon class="h-4 w-4" />
                  Pause
                </button>
                <button
                  v-else-if="isPaused"
                  class="px-4 py-2 bg-white text-cyan-600 font-medium rounded-md hover:bg-gray-50 border border-cyan-300 focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-colors flex items-center gap-2 text-sm"
                  @click="resumeStream"
                >
                  <PlayIcon class="h-4 w-4" />
                  Resume
                </button>
                <button
                  v-if="!isStreamFinished"
                  class="px-4 py-2 bg-white text-red-600 font-medium rounded-md hover:bg-red-50 border border-red-300 focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors flex items-center gap-2 text-sm"
                  @click="stopStream"
                >
                  <StopIcon class="h-4 w-4" />
                  Stop
                </button>
              </div>
            </div>
          </div>

          <!-- Progress and Stats -->
          <ProgressContainer />
          <StatContainer />
        </div>
      </div>

      <!-- History Tab -->
      <div v-else-if="activeTab === 'history'" class="p-6">
        <StreamHistoryTable :runs="historyRuns" />
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
import {
  ClipboardIcon,
  CalendarIcon,
  ExclamationCircleIcon,
  PauseIcon,
  PlayIcon,
  StopIcon
} from '@heroicons/vue/24/outline'
import { Switch } from '@headlessui/vue'
import { useStreamsStore } from '@/stores/streamConfig'
import { useConnectionsStore } from '@/stores/connections'
import { useCommonStore } from '@/stores/common'
import { useMonitoringStore, statusEnum } from '@/stores/monitoring'
import ConnectionStringDisplay from '@/components/common/ConnectionStringDisplay.vue'
import CloudProviderBadge from '@/components/common/CloudProviderBadge.vue'
import ProgressContainer from '@/components/monitoring/ProgressContainer.vue'
import StatContainer from '@/components/monitoring/StatContainer.vue'
import StreamHistoryTable from './StreamHistoryTable.vue'
import ConfirmDialog from '@/components/common/ConfirmDialog.vue'
import { normalizeConnectionType } from '@/utils/connectionUtils'
import { formatDateTime } from '@/utils/formats'
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

const isJsonView = ref(false)
const showDeleteConfirm = ref(false)
const activeTab = ref<'monitor' | 'configuration' | 'history'>('configuration')

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
  return monitoringStore.stats.some((stat) => stat.status === 'PAUSED')
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

const historyRuns = computed(() => {
  // Return history from backend (stored in stream config)
  return props.stream.history || []
})

// Watch for stream finish to refresh config and get updated history
watch(isStreamFinished, async (finished, wasFinished) => {
  // Only trigger when transitioning from not-finished to finished
  if (finished && !wasFinished) {
    // Wait a bit for backend to save history
    setTimeout(async () => {
      await streamsStore.refreshStreams()
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
  const normalizedType = normalizeConnectionType(dbType?.toLowerCase() || '')
  const styles: Record<string, string> = {
    postgresql: 'bg-blue-100 ring-2 ring-blue-200/50',
    postgres: 'bg-blue-100 ring-2 ring-blue-200/50',
    mysql: 'bg-orange-100 ring-2 ring-orange-200/50',
    mongodb: 'bg-green-100 ring-2 ring-green-200/50',
    mongo: 'bg-green-100 ring-2 ring-green-200/50',
    redis: 'bg-red-100 ring-2 ring-red-200/50',
    sqlite: 'bg-gray-100 ring-2 ring-gray-200/50',
    mariadb: 'bg-orange-100 ring-2 ring-orange-200/50',
    mssql: 'bg-blue-100 ring-2 ring-blue-200/50',
    sqlserver: 'bg-blue-100 ring-2 ring-blue-200/50',
    oracle: 'bg-red-100 ring-2 ring-red-200/50',
    cassandra: 'bg-purple-100 ring-2 ring-purple-200/50',
    elasticsearch: 'bg-yellow-100 ring-2 ring-yellow-200/50',
    clickhouse: 'bg-yellow-100 ring-2 ring-yellow-200/50'
  }
  return styles[normalizedType] || 'bg-gray-100 ring-2 ring-gray-200/50'
}

function copyConfig() {
  navigator.clipboard.writeText(prettyConfig.value)
  commonStore.showNotification('Configuration copied to clipboard', 'success')
}

function navigateToEdit() {
  router.push({ name: 'EditStream', params: { id: props.stream.id } })
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
    if (error instanceof Error) {
      commonStore.showNotification(error.message, 'error')
    }
  }
}

async function resumeStream() {
  try {
    await streamsStore.resumeStream(monitoringStore.streamID)
    commonStore.showNotification('Stream resumed', 'success')
    // Request to show monitor tab
    monitoringStore.requestShowMonitorTab()
  } catch (error) {
    if (error instanceof Error) {
      commonStore.showNotification(error.message, 'error')
    }
  }
}

async function stopStream() {
  try {
    await streamsStore.stopStream(monitoringStore.streamID)
    commonStore.showNotification('Stream stopped', 'success')
    // Request to show monitor tab
    monitoringStore.requestShowMonitorTab()
  } catch (error) {
    if (error instanceof Error) {
      commonStore.showNotification(error.message, 'error')
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
