<template>
  <div
    :class="[
      'px-4 py-3 cursor-pointer transition-all duration-200 ease-out flex items-center justify-between group',
      'rounded-lg',
      isSelected
        ? 'bg-linear-to-r from-blue-100 to-teal-100 shadow-md ring-2 ring-blue-200/50'
        : 'hover:bg-linear-to-r hover:from-blue-50 hover:to-teal-50 hover:shadow-sm hover:scale-[1.01] active:scale-[0.98]'
    ]"
    @click="selectStream"
  >
    <!-- Stream Info -->
    <div class="flex-1 min-w-0">
      <!-- Stream Name - Full Width with Truncation -->
      <div class="mb-1.5 min-w-0">
        <h3
          class="text-sm font-semibold text-slate-800 group-hover:text-teal-900 truncate"
          :title="stream.name"
        >
          {{ stream.name }}
        </h3>
      </div>

      <!-- Badges and Connection Info Row -->
      <div class="flex items-center gap-2 mb-1 flex-wrap min-w-0">
        <!-- Running Status Badge -->
        <span
          v-if="isRunning"
          :class="[
            'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset shrink-0',
            statusBadgeClass
          ]"
        >
          <component :is="statusIcon" class="h-3 w-3" />
          {{ statusText }}
        </span>

        <!-- Mode Badge -->
        <span
          :class="[
            'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset shrink-0',
            stream.mode === 'cdc'
              ? 'bg-orange-50 text-orange-700 ring-orange-600/20'
              : 'bg-green-50 text-green-700 ring-green-600/20'
          ]"
        >
          {{ stream.mode }}
        </span>

        <!-- Connection Info (inline with badges) - Truncate with min-w-0 -->
        <div class="flex items-center gap-1 text-xs text-gray-500 min-w-0 truncate">
          <span v-if="source" class="truncate" :title="source.name">{{ source.name }}</span>
          <span v-else class="text-gray-400 shrink-0">Unknown source</span>
          <ArrowRightIcon class="h-3 w-3 shrink-0 text-gray-400" />
          <span v-if="target" class="truncate" :title="target.name">{{ target.name }}</span>
          <span v-else class="text-gray-400 shrink-0">Unknown target</span>
        </div>
      </div>

      <!-- Table count -->
      <div v-if="stream.tables && stream.tables.length > 0" class="text-xs text-gray-400">
        {{ stream.tables.length }} table{{ stream.tables.length !== 1 ? 's' : '' }}
      </div>
    </div>

    <!-- Action Buttons -->
    <div
      class="flex items-center gap-1 ml-2 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
      @click.stop
    >
      <!-- Start/Run Again/Pause/Resume Button -->
      <!-- Show Resume button when paused (and not finished) -->
      <button
        v-if="isPaused && !isFinished"
        v-tooltip="'Resume the stream'"
        type="button"
        class="p-1.5 rounded-md hover:bg-teal-100 text-teal-600 hover:text-teal-700 transition-colors"
        @click.stop="resumeStream"
      >
        <PlayIcon class="h-4 w-4" />
      </button>
      <!-- Show Pause button when running (not paused, not finished) -->
      <button
        v-else-if="isRunning && !isPaused && !isFinished"
        v-tooltip="'Pause the stream'"
        type="button"
        class="p-1.5 rounded-md hover:bg-yellow-100 text-yellow-600 hover:text-yellow-700 transition-colors"
        @click.stop="pauseStream"
      >
        <PauseIcon class="h-4 w-4" />
      </button>
      <!-- Show Play button when not running or finished -->
      <button
        v-else
        v-tooltip="hasHistory ? 'Run the stream again' : 'Start the stream'"
        type="button"
        class="p-1.5 rounded-md hover:bg-teal-100 text-teal-600 hover:text-teal-700 transition-colors"
        @click.stop="startStream"
      >
        <PlayIcon class="h-4 w-4" />
      </button>

      <!-- Edit Button -->
      <router-link :to="{ name: 'EditStream', params: { id: stream.id } }">
        <button
          v-tooltip="'Edit stream configuration'"
          type="button"
          class="p-1.5 rounded-md hover:bg-gray-200 text-gray-500 hover:text-gray-700 transition-colors"
        >
          <PencilIcon class="h-4 w-4" />
        </button>
      </router-link>

      <!-- Clone Button -->
      <button
        v-tooltip="'Clone stream configuration'"
        type="button"
        class="p-1.5 rounded-md hover:bg-gray-200 text-gray-500 hover:text-gray-700 transition-colors"
        @click.stop="cloneStream"
      >
        <DocumentDuplicateIcon class="h-4 w-4" />
      </button>

      <!-- Delete Button -->
      <button
        v-tooltip="'Delete stream configuration'"
        type="button"
        class="p-1.5 rounded-md hover:bg-red-100 text-gray-500 hover:text-red-600 transition-colors"
        @click.stop="deleteStream"
      >
        <TrashIcon class="h-4 w-4" />
      </button>
    </div>
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
import { computed } from 'vue'
import {
  PencilIcon,
  TrashIcon,
  ArrowRightIcon,
  DocumentDuplicateIcon,
  ArrowPathIcon,
  PauseCircleIcon,
  CheckCircleIcon,
  XCircleIcon,
  PlayIcon,
  PauseIcon
} from '@heroicons/vue/24/outline'
import { useMonitoringStore, statusEnum } from '@/stores/monitoring'
import type { StreamConfig } from '@/types/streamConfig'
import type { Connection } from '@/types/connections'

const props = defineProps<{
  stream: StreamConfig
  isSelected: boolean
  source?: Connection
  target?: Connection
}>()

const emit = defineEmits<{
  (e: 'select', payload: { streamId: string }): void
  (e: 'delete', payload: { streamId: string }): void
  (e: 'edit', payload: { streamId: string }): void
  (e: 'clone', payload: { streamId: string }): void
  (e: 'start', payload: { streamId: string }): void
  (e: 'pause', payload: { streamId: string }): void
  (e: 'resume', payload: { streamId: string }): void
}>()

const monitoringStore = useMonitoringStore()

const isRunning = computed(() => {
  // Check if this stream config is the one currently running
  // Compare config IDs since streamID and config ID are different
  return monitoringStore.streamConfig?.id === props.stream.id && monitoringStore.streamID !== ''
})

const isPaused = computed(() => {
  if (!isRunning.value) return false
  // Check both: stats (when nodes exist and report) and overall stream status
  const statsHasPaused = monitoringStore.stats.some((stat) => stat.status === 'PAUSED')
  const streamStatusIsPaused = monitoringStore.status === statusEnum.PAUSED
  return statsHasPaused || streamStatusIsPaused
})

const isFinished = computed(() => {
  if (!isRunning.value) return false
  const areAllNodesFinished =
    monitoringStore.stats.length > 0 &&
    monitoringStore.stats.every((stat) => stat.status === 'FINISHED')

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

const statusText = computed(() => {
  if (!isRunning.value) return ''
  if (isFinished.value) {
    const hasFailed = monitoringStore.stats.some((stat) => stat.status === 'FAILED')
    const isStopped = monitoringStore.stats.some((stat) => stat.status === 'STOPPED')
    if (hasFailed) return 'Failed'
    if (isStopped) return 'Stopped'
    return 'Finished'
  }
  if (isPaused.value) return 'Paused'
  return 'Running'
})

const statusBadgeClass = computed(() => {
  if (!isRunning.value) return ''
  if (isFinished.value) {
    const hasFailed = monitoringStore.stats.some((stat) => stat.status === 'FAILED')
    if (hasFailed) return 'bg-red-50 text-red-700 ring-red-600/20'
    return 'bg-teal-50 text-teal-700 ring-teal-600/20'
  }
  if (isPaused.value) return 'bg-yellow-50 text-yellow-700 ring-yellow-600/20'
  return 'bg-blue-50 text-blue-700 ring-blue-600/20'
})

const statusIcon = computed(() => {
  if (!isRunning.value) return null
  if (isFinished.value) {
    const hasFailed = monitoringStore.stats.some((stat) => stat.status === 'FAILED')
    if (hasFailed) return XCircleIcon
    return CheckCircleIcon
  }
  if (isPaused.value) return PauseCircleIcon
  return ArrowPathIcon
})

const tableCount = computed(() => {
  return props.stream.tables?.length || 0
})

// History is now stored separately in the API, so we can't check it here
// Always allow starting the stream (users can run it multiple times)
const hasHistory = computed(() => {
  return true // Always show "Run the stream again" option
})

function selectStream() {
  emit('select', { streamId: props.stream.id })
}

function startStream() {
  emit('start', { streamId: props.stream.id })
}

function pauseStream() {
  emit('pause', { streamId: props.stream.id })
}

function resumeStream() {
  emit('resume', { streamId: props.stream.id })
}

function cloneStream() {
  emit('clone', { streamId: props.stream.id })
}

function deleteStream() {
  emit('delete', { streamId: props.stream.id })
}
</script>
