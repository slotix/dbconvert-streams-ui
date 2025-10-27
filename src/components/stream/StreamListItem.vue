<template>
  <div
    :class="[
      'px-3 py-3 cursor-pointer hover:bg-gray-50 transition-colors flex items-center justify-between group',
      isSelected ? 'bg-blue-50 border-l-2 border-l-blue-600' : 'border-l-2 border-l-transparent'
    ]"
    @click="selectStream"
  >
    <!-- Stream Info -->
    <div class="flex-1 min-w-0">
      <div class="flex items-center gap-2 mb-1">
        <h3 class="text-sm font-medium text-gray-900 truncate">{{ stream.name }}</h3>

        <!-- Running Status Badge -->
        <span
          v-if="isRunning"
          :class="[
            'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset flex-shrink-0',
            statusBadgeClass
          ]"
        >
          <span
            v-if="isRunning && !isPaused && !isFinished"
            class="inline-block w-1.5 h-1.5 rounded-full bg-current mr-1 animate-pulse"
          ></span>
          {{ statusText }}
        </span>

        <!-- Mode Badge -->
        <span
          :class="[
            'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset flex-shrink-0',
            stream.mode === 'cdc'
              ? 'bg-orange-50 text-orange-700 ring-orange-600/20'
              : 'bg-green-50 text-green-700 ring-green-600/20'
          ]"
        >
          {{ stream.mode }}
        </span>
      </div>

      <!-- Connection Info -->
      <div class="flex items-center gap-1 text-xs text-gray-500">
        <span v-if="source" class="truncate" :title="source.name">{{ source.name }}</span>
        <span v-else class="text-gray-400">Unknown source</span>
        <ArrowRightIcon class="h-3 w-3 flex-shrink-0 text-gray-400" />
        <span v-if="target" class="truncate" :title="target.name">{{ target.name }}</span>
        <span v-else class="text-gray-400">Unknown target</span>
      </div>

      <!-- Table count -->
      <div v-if="stream.tables && stream.tables.length > 0" class="mt-1 text-xs text-gray-400">
        {{ stream.tables.length }} table{{ stream.tables.length !== 1 ? 's' : '' }}
      </div>
    </div>

    <!-- Action Buttons -->
    <div
      class="flex items-center gap-1 ml-2 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
      @click.stop
    >
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
  DocumentDuplicateIcon
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
}>()

const monitoringStore = useMonitoringStore()

const isRunning = computed(() => {
  // Check if this stream config is the one currently running
  // Compare config IDs since streamID and config ID are different
  return monitoringStore.streamConfig?.id === props.stream.id && monitoringStore.streamID !== ''
})

const isPaused = computed(() => {
  if (!isRunning.value) return false
  const isStatsPaused = monitoringStore.stats.some((stat) => stat.status === 'PAUSED')
  const isStreamStatsPaused =
    monitoringStore.streamStats?.nodes.some((node) => node.stat?.status === 'PAUSED') ?? false
  return isStatsPaused || isStreamStatsPaused
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
    return 'bg-green-50 text-green-700 ring-green-600/20'
  }
  if (isPaused.value) return 'bg-yellow-50 text-yellow-700 ring-yellow-600/20'
  return 'bg-blue-50 text-blue-700 ring-blue-600/20'
})

const tableCount = computed(() => {
  return props.stream.tables?.length || 0
})

function selectStream() {
  emit('select', { streamId: props.stream.id })
}

function cloneStream() {
  emit('clone', { streamId: props.stream.id })
}

function deleteStream() {
  emit('delete', { streamId: props.stream.id })
}
</script>
