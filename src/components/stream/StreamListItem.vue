<template>
  <div
    :class="[
      'px-3 py-2.5 cursor-pointer transition-all duration-200 ease-out group relative',
      'rounded-lg',
      isSelected
        ? 'bg-linear-to-r from-gray-200 to-gray-300 dark:from-gray-800 dark:to-gray-700 shadow-md ring-2 ring-gray-300/50 dark:ring-gray-700/50'
        : 'hover:bg-linear-to-r hover:from-gray-100 hover:to-gray-200 dark:hover:from-gray-850 dark:hover:to-gray-800 hover:shadow-sm hover:scale-[1.01] active:scale-[0.98]'
    ]"
    @click="selectStream"
    @contextmenu="handleContextMenu"
  >
    <!-- Stream Info - Full Width -->
    <div class="w-full min-w-0 pr-8">
      <!-- Stream Name - Full Width with Truncation -->
      <div class="mb-1.5 min-w-0">
        <h3
          class="text-sm font-semibold text-slate-800 dark:text-gray-100 group-hover:text-teal-900 dark:group-hover:text-teal-400 truncate leading-tight"
          :title="stream.name"
        >
          {{ stream.name }}
        </h3>
      </div>

      <!-- Badges Row - Wrap freely -->
      <div class="flex items-center gap-1.5 mb-1.5 flex-wrap">
        <!-- Mode Badge -->
        <span
          :class="[
            'inline-flex items-center rounded-full px-1.5 py-0.5 text-xs font-medium ring-1 ring-inset shrink-0',
            stream.mode === 'cdc'
              ? 'bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 ring-orange-600/20 dark:ring-orange-500/30'
              : 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 ring-blue-600/20 dark:ring-blue-500/30'
          ]"
        >
          {{ stream.mode }}
        </span>
      </div>

      <!-- Connection Info - Separate Row with Better Truncation -->
      <div class="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400 min-w-0 mb-1">
        <span v-if="source" class="truncate font-medium" :title="source.name">{{
          source.name
        }}</span>
        <span v-else class="text-gray-400 dark:text-gray-600 shrink-0 text-xs">Unknown</span>
        <ArrowRight class="h-3 w-3 shrink-0 text-gray-400 dark:text-gray-600" />
        <span v-if="target" class="truncate font-medium" :title="target.name">{{
          target.name
        }}</span>
        <span v-else class="text-gray-400 dark:text-gray-600 shrink-0 text-xs">Unknown</span>
      </div>

      <!-- Table/Query count -->
      <div class="text-xs text-gray-400 dark:text-gray-600">
        <span v-if="stream.source?.tables && stream.source.tables.length > 0">
          {{ stream.source.tables.length }} table{{ stream.source.tables.length !== 1 ? 's' : '' }}
        </span>
        <span
          v-if="
            stream.source?.tables?.length &&
            stream.source?.queries?.length &&
            stream.source.queries.length > 0
          "
        >
          ,
        </span>
        <span v-if="stream.source?.queries && stream.source.queries.length > 0">
          {{ stream.source.queries.length }} quer{{
            stream.source.queries.length !== 1 ? 'ies' : 'y'
          }}
        </span>
      </div>
    </div>

    <!-- Action Buttons - Positioned Absolutely on Right -->
    <div
      class="absolute right-2 top-2 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity bg-white/95 dark:bg-gray-850/95 backdrop-blur-sm rounded-md shadow-sm border border-gray-200 dark:border-gray-700 p-0.5"
      @click.stop
    >
      <!-- Start/Run Again/Pause/Resume Button -->
      <!-- Show Resume button when paused (and not finished) -->
      <button
        v-if="isPaused && !isFinished"
        v-tooltip="'Resume the stream'"
        type="button"
        class="p-1.5 rounded-md hover:bg-teal-100 dark:hover:bg-teal-900/30 text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300 transition-colors"
        @click.stop="resumeStream"
      >
        <Play class="h-4 w-4" />
      </button>
      <!-- Show Pause button when running (not paused, not finished) -->
      <button
        v-else-if="isRunning && !isPaused && !isFinished"
        v-tooltip="'Pause the stream'"
        type="button"
        class="p-1.5 rounded-md hover:bg-yellow-100 dark:hover:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400 hover:text-yellow-700 dark:hover:text-yellow-300 transition-colors"
        @click.stop="pauseStream"
      >
        <Pause class="h-4 w-4" />
      </button>
      <!-- Show Play button when not running or finished -->
      <button
        v-else
        v-tooltip="hasHistory ? 'Run the stream again' : 'Start the stream'"
        type="button"
        class="p-1.5 rounded-md hover:bg-teal-100 dark:hover:bg-teal-900/30 text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300 transition-colors"
        @click.stop="startStream"
      >
        <Play class="h-4 w-4" />
      </button>

      <!-- Edit Button -->
      <router-link :to="{ name: 'EditStream', params: { id: stream.id } }">
        <button
          v-tooltip="'Edit stream configuration'"
          type="button"
          class="p-1.5 rounded-md hover:bg-gray-200 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
        >
          <Pencil class="h-4 w-4" />
        </button>
      </router-link>

      <!-- Clone Button -->
      <button
        v-tooltip="'Clone stream configuration'"
        type="button"
        class="p-1.5 rounded-md hover:bg-gray-200 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
        @click.stop="cloneStream"
      >
        <Copy class="h-4 w-4" />
      </button>

      <!-- Delete Button -->
      <button
        v-tooltip="'Delete stream configuration'"
        type="button"
        class="p-1.5 rounded-md hover:bg-red-100 dark:hover:bg-red-900/30 text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
        @click.stop="deleteStream"
      >
        <Trash class="h-4 w-4" />
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
import { ArrowRight, Copy, Pause, Pencil, Play, Trash } from 'lucide-vue-next'
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
  (
    e: 'contextmenu',
    payload: {
      event: MouseEvent
      streamId: string
      streamName: string
      isRunning: boolean
      isPaused: boolean
      isFinished: boolean
    }
  ): void
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

// History is now stored separately in the API, so we can't check it here
// Always allow starting the stream (users can run it multiple times)
const hasHistory = computed(() => {
  return true // Always show "Run the stream again" option
})

function selectStream() {
  emit('select', { streamId: props.stream.id! })
}

function startStream() {
  emit('start', { streamId: props.stream.id! })
}

function pauseStream() {
  emit('pause', { streamId: props.stream.id! })
}

function resumeStream() {
  emit('resume', { streamId: props.stream.id! })
}

function cloneStream() {
  emit('clone', { streamId: props.stream.id! })
}

function deleteStream() {
  emit('delete', { streamId: props.stream.id! })
}

function handleContextMenu(event: MouseEvent) {
  emit('contextmenu', {
    event,
    streamId: props.stream.id!,
    streamName: props.stream.name,
    isRunning: isRunning.value,
    isPaused: isPaused.value,
    isFinished: isFinished.value
  })
}
</script>
