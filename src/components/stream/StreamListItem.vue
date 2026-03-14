<template>
  <div
    :class="[
      'px-3 py-2.5 cursor-pointer transition-colors duration-150 ease-out group relative',
      isSelected
        ? 'bg-slate-100/55 dark:bg-gray-800/45'
        : 'hover:bg-slate-100/45 dark:hover:bg-gray-850/65'
    ]"
    :data-selected="isSelected ? 'true' : undefined"
    @click="selectStream"
    @contextmenu="handleContextMenu"
  >
    <span
      v-if="isSelected"
      class="ui-tab-indicator absolute left-0 top-2 bottom-2 w-0.5 rounded-r"
    ></span>

    <!-- Stream Info - Full Width -->
    <div class="w-full min-w-0 pr-8">
      <!-- Stream Name - Full Width with Truncation -->
      <div class="mb-1.5 min-w-0">
        <h3
          class="text-sm font-semibold text-slate-800 dark:text-gray-100 truncate leading-tight"
          :title="stream.name"
        >
          <HighlightedText class="truncate" :text="stream.name" :query="searchQuery" />
        </h3>
      </div>

      <!-- Route + Mode Row -->
      <div class="flex items-center gap-1 text-xs min-w-0 mb-1">
        <HighlightedText :class="modeLabelClass" :text="stream.mode" :query="searchQuery" />
        <span class="shrink-0 text-slate-500/70 dark:text-gray-600">•</span>
        <HighlightedText
          class="truncate font-medium text-slate-700 dark:text-gray-300"
          :title="sourceDisplayName"
          :text="sourceDisplayName"
          :query="searchQuery"
        />
        <ArrowRight class="h-3 w-3 shrink-0 text-slate-500/70 dark:text-gray-600" />
        <HighlightedText
          class="truncate font-medium text-slate-700 dark:text-gray-300"
          :title="targetDisplayName"
          :text="targetDisplayName"
          :query="searchQuery"
        />
      </div>

      <!-- Optional table/query summary -->
      <div v-if="objectsSummaryLabel" class="text-xs text-slate-500 dark:text-gray-500 truncate">
        <HighlightedText :text="objectsSummaryLabel" :query="searchQuery" />
      </div>
    </div>

    <!-- Action Buttons -->
    <QuickActions :actions="quickActions" @action="onQuickAction">
      <template #prepend>
        <!-- Resume button when paused (and not finished) -->
        <button
          v-if="isPaused && !isFinished"
          v-tooltip="'Resume the stream'"
          type="button"
          class="ui-accent-action ui-accent-text p-1.5 rounded-md transition-colors"
          @click.stop="resumeStream"
        >
          <Play class="h-4 w-4" />
        </button>
        <!-- Pause button when running (not paused, not finished) -->
        <button
          v-else-if="isRunning && !isPaused && !isFinished"
          v-tooltip="'Pause the stream'"
          type="button"
          class="p-1.5 rounded-md hover:bg-yellow-100 dark:hover:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400 hover:text-yellow-700 dark:hover:text-yellow-300 transition-colors"
          @click.stop="pauseStream"
        >
          <Pause class="h-4 w-4" />
        </button>
        <!-- Play button when not running or finished -->
        <button
          v-else
          v-tooltip="hasHistory ? 'Run the stream again' : 'Start the stream'"
          type="button"
          class="ui-accent-action ui-accent-text p-1.5 rounded-md transition-colors"
          @click.stop="startStream"
        >
          <Play class="h-4 w-4" />
        </button>
      </template>
    </QuickActions>
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
import { useMonitoringStore } from '@/stores/monitoring'
import type { StreamConfig } from '@/types/streamConfig'
import type { Connection } from '@/types/connections'
import { STATUS } from '@/constants'
import HighlightedText from '@/components/common/HighlightedText.vue'
import QuickActions, { type QuickAction } from '@/components/common/QuickActions.vue'

const props = defineProps<{
  stream: StreamConfig
  isSelected: boolean
  source?: Connection
  target?: Connection
  searchQuery?: string
}>()

const searchQuery = computed(() => props.searchQuery || '')

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

const sourceConnections = computed(() => props.stream.source?.connections || [])
const sourceCount = computed(() => sourceConnections.value.length)

const isRunning = computed(() => {
  // Check if this stream config is the one currently running
  // Compare config IDs since streamID and config ID are different
  return monitoringStore.streamConfig?.id === props.stream.id && monitoringStore.streamID !== ''
})

const isPaused = computed(() => {
  if (!isRunning.value) return false
  // Check both: stats (when nodes exist and report) and overall stream status
  const statsHasPaused = monitoringStore.stats.some((stat) => stat.status === 'PAUSED')
  const streamStatusIsPaused = monitoringStore.status === STATUS.PAUSED
  return statsHasPaused || streamStatusIsPaused
})

const isFinished = computed(() => {
  if (!isRunning.value) return false
  const areAllNodesFinished =
    monitoringStore.stats.length > 0 &&
    monitoringStore.stats.every((stat) => stat.status === 'FINISHED')

  const finishedStates: string[] = [
    STATUS.FINISHED,
    STATUS.STOPPED,
    STATUS.FAILED,
    STATUS.TIME_LIMIT_REACHED,
    STATUS.EVENT_LIMIT_REACHED
  ]
  const isStreamStatusFinished = finishedStates.includes(monitoringStore.status)

  return areAllNodesFinished || isStreamStatusFinished
})

// History is now stored separately in the API, so we can't check it here
// Always allow starting the stream (users can run it multiple times)
const hasHistory = computed(() => {
  return true // Always show "Run the stream again" option
})

// Count tables from all connections
const totalTablesCount = computed(() => {
  return sourceConnections.value.reduce((sum, conn) => sum + (conn.tables?.length || 0), 0)
})

// Count queries from all connections
const totalQueriesCount = computed(() => {
  return sourceConnections.value.reduce((sum, conn) => sum + (conn.queries?.length || 0), 0)
})

const modeLabelClass = computed(() =>
  props.stream.mode === 'cdc'
    ? 'shrink-0 font-semibold text-orange-700 dark:text-orange-400'
    : 'shrink-0 font-semibold text-blue-700 dark:text-blue-400'
)

const sourceDisplayName = computed(() => {
  if (sourceCount.value > 1) {
    return `${sourceCount.value} sources`
  }
  if (props.source?.name) return props.source.name
  if (sourceConnections.value[0]?.alias) return sourceConnections.value[0].alias
  return 'Unknown'
})

const targetDisplayName = computed(() => props.target?.name || 'Unknown')

const objectsSummaryLabel = computed(() => {
  const parts: string[] = []
  if (totalTablesCount.value > 0) {
    parts.push(`${totalTablesCount.value} table${totalTablesCount.value === 1 ? '' : 's'}`)
  }
  if (totalQueriesCount.value > 0) {
    parts.push(`${totalQueriesCount.value} quer${totalQueriesCount.value === 1 ? 'y' : 'ies'}`)
  }
  return parts.join(', ')
})

const quickActions = computed<QuickAction[]>(() => [
  {
    key: 'edit',
    icon: Pencil,
    tooltip: 'Edit stream configuration',
    to: { name: 'EditStream', params: { id: props.stream.id } }
  },
  { key: 'clone', icon: Copy, tooltip: 'Clone stream configuration' },
  { key: 'delete', icon: Trash, tooltip: 'Delete stream configuration', variant: 'danger' }
])

function onQuickAction(key: string) {
  if (key === 'clone') cloneStream()
  else if (key === 'delete') deleteStream()
}

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
