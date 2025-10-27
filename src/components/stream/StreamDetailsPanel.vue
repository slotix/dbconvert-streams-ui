<template>
  <div class="h-full flex flex-col bg-white">
    <!-- Header -->
    <div class="border-b border-gray-200 px-6 py-4 bg-gray-50 flex-shrink-0">
      <div class="flex items-center justify-between">
        <div class="flex items-center min-w-0 flex-1">
          <h2 class="text-2xl font-bold text-gray-900 truncate">{{ stream.name }}</h2>
          <span
            :class="[
              'ml-3 inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset',
              stream.mode === 'cdc'
                ? 'bg-orange-50 text-orange-700 ring-orange-600/20'
                : 'bg-green-50 text-green-700 ring-green-600/20'
            ]"
          >
            {{ stream.mode }}
          </span>
        </div>
        <div class="flex items-center gap-2 ml-4">
          <Switch
            v-model="isJsonView"
            class="relative inline-flex h-5 w-10 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-gray-600 focus:ring-offset-2"
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
          <span class="text-sm text-gray-600">JSON</span>
          <button
            v-if="isJsonView"
            v-tooltip="'Copy configuration'"
            class="p-1 text-gray-500 hover:text-gray-700 rounded-md hover:bg-gray-100"
            @click="copyConfig"
          >
            <ClipboardIcon class="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>

    <!-- Content -->
    <div class="flex-1 overflow-y-auto">
      <!-- JSON View -->
      <div v-if="isJsonView" class="p-6">
        <div
          class="rounded-md bg-gray-50 p-4 border border-gray-200 overflow-auto custom-scrollbar"
        >
          <pre
            v-highlightjs
            class="text-sm"
          ><code class="language-json block text-sm leading-6 select-text">{{ prettyConfig }}</code></pre>
        </div>
      </div>

      <!-- Details View -->
      <div v-else class="p-6 space-y-6">
        <!-- Stream Controls (if running) -->
        <div v-if="isStreamRunning" class="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 class="text-sm font-semibold text-blue-900 mb-3">Stream Controls</h3>
          <div class="flex gap-2">
            <button
              v-if="!isPaused"
              :disabled="isStreamFinished"
              class="px-3 py-2 bg-white text-cyan-600 font-semibold rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 transition-colors duration-200 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              @click="pauseStream"
            >
              <PauseIcon class="h-4 w-4" />
              Pause
            </button>
            <button
              v-else
              :disabled="isStreamFinished"
              class="px-3 py-2 bg-white text-cyan-600 font-semibold rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 transition-colors duration-200 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              @click="resumeStream"
            >
              <PlayIcon class="h-4 w-4" />
              Resume
            </button>
            <button
              :disabled="isStreamFinished"
              class="px-3 py-2 bg-white text-red-600 font-semibold rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors duration-200 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              @click="stopStream"
            >
              <StopIcon class="h-4 w-4" />
              Stop
            </button>
          </div>
        </div>

        <!-- Connection Details -->
        <div class="space-y-4">
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
                  class="flex-shrink-0 rounded-lg p-1.5 transition-all duration-200 hover:shadow-md"
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
                  class="h-4 w-4 text-red-500 flex-shrink-0"
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
                  class="flex-shrink-0 rounded-lg p-1.5 transition-all duration-200 hover:shadow-md"
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
                  class="h-4 w-4 text-red-500 flex-shrink-0"
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
        </div>

        <!-- Monitoring Stats (if running) -->
        <div v-if="isStreamRunning" class="border-t border-gray-200 pt-6">
          <ProgressContainer />
          <div class="mt-6">
            <StatContainer />
          </div>
        </div>

        <!-- Creation Date -->
        <div class="mt-auto pt-4 border-t border-gray-100">
          <div class="flex items-center gap-2">
            <CalendarIcon class="h-4 w-4 text-gray-500" />
            <span class="text-sm text-gray-500">Created: {{ streamCreated }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Actions Footer -->
    <div class="border-t border-gray-200 bg-gray-50 p-4 flex-shrink-0">
      <div class="flex gap-2">
        <router-link :to="{ name: 'EditStream', params: { id: stream.id } }" class="flex-1">
          <button
            v-tooltip="'Edit stream configuration'"
            type="button"
            class="w-full px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 flex items-center justify-center gap-2 transition-colors"
          >
            <PencilIcon class="h-4 w-4" />
            Edit
          </button>
        </router-link>
        <button
          v-if="!isStreamRunning"
          v-tooltip="'Start the stream'"
          type="button"
          class="flex-1 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 flex items-center justify-center gap-2 transition-colors"
          @click="startStream"
        >
          <PlayIcon class="h-4 w-4" />
          Start
        </button>
        <button
          v-if="!isStreamRunning"
          v-tooltip="'Delete stream'"
          type="button"
          class="flex-1 px-4 py-2 text-sm font-medium text-red-600 bg-white border border-gray-300 rounded-md hover:bg-red-50 flex items-center justify-center gap-2 transition-colors"
          @click="requestDelete"
        >
          <TrashIcon class="h-4 w-4" />
          Delete
        </button>
      </div>
    </div>

    <!-- Delete Confirmation Dialog -->
    <ConfirmDialog
      v-model:is-open="showDeleteConfirm"
      title="Delete stream?"
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
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import {
  ClipboardIcon,
  PencilIcon,
  TrashIcon,
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
import ConfirmDialog from '@/components/common/ConfirmDialog.vue'
import { normalizeConnectionType } from '@/utils/connectionUtils'
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

const dbTypes = connectionsStore.dbTypes

const isStreamRunning = computed(() => {
  return monitoringStore.streamID === props.stream.id && monitoringStore.streamID !== ''
})

const isPaused = computed(() => {
  if (!isStreamRunning.value) return false
  const isStatsPaused = monitoringStore.stats.some((stat) => stat.status === 'PAUSED')
  const isStreamStatsPaused =
    monitoringStore.streamStats?.nodes.some((node) => node.stat?.status === 'PAUSED') ?? false
  return isStatsPaused || isStreamStatsPaused
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

const streamCreated = computed(() => {
  if (!props.stream || typeof props.stream.created !== 'number') return ''
  const date = new Date(props.stream.created * 1000)
  return date
    .toLocaleString('en-GB', {
      month: 'short',
      day: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    })
    .replace(',', ' -')
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
    await router.push({ name: 'MonitorStream' })
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
  } catch (error) {
    if (error instanceof Error) {
      commonStore.showNotification(error.message, 'error')
    }
  }
}
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
