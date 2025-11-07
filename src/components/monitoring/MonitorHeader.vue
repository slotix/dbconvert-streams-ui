<template>
  <div class="space-y-4">
    <!-- Unified Status and Progress Header -->
    <div
      :class="[
        'border rounded-lg p-6',
        isRunning
          ? 'bg-linear-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 border-blue-200 dark:border-blue-700'
          : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700'
      ]"
    >
      <div class="space-y-4">
        <!-- Top Row: Status Info + Controls -->
        <div class="flex items-start justify-between gap-4">
          <!-- Status Display - Left side -->
          <div class="flex items-start gap-4 flex-1 min-w-0">
            <div
              :class="[
                'flex items-center justify-center w-12 h-12 rounded-full shrink-0 mt-0.5',
                isRunning
                  ? isStreamFinished
                    ? 'bg-green-100'
                    : isPaused
                      ? 'bg-yellow-100'
                      : 'bg-blue-100'
                  : 'bg-gray-100'
              ]"
            >
              <span
                v-if="isRunning && !isStreamFinished && !isPaused"
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
              <PauseIcon v-else-if="isPaused" class="h-6 w-6 text-yellow-600" />
              <PlayIcon v-else class="h-6 w-6 text-gray-400" />
            </div>
            <div class="min-w-0 flex-1">
              <p class="text-xs font-medium uppercase text-gray-500 dark:text-gray-400 mb-1">
                Status
              </p>
              <p
                :class="[
                  'text-base font-semibold wrap-break-word',
                  isRunning
                    ? isStreamFinished
                      ? 'text-green-700 dark:text-green-400'
                      : isPaused
                        ? 'text-yellow-700 dark:text-yellow-400'
                        : 'text-blue-700 dark:text-blue-400'
                    : 'text-gray-600 dark:text-gray-400'
                ]"
              >
                {{ streamStatus }}
              </p>
            </div>
          </div>

          <!-- Stream Controls - Right side, always visible and compact -->
          <div class="flex gap-2 shrink-0">
            <!-- Pause/Resume Button -->
            <button
              :disabled="!isRunning || isStreamFinished"
              :class="[
                'px-3 py-2 font-medium rounded-md transition-colors flex items-center gap-2 text-sm',
                isRunning && !isStreamFinished
                  ? isPaused
                    ? 'bg-white text-cyan-600 border border-cyan-300 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-cyan-500'
                    : 'bg-white text-cyan-600 border border-cyan-300 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-cyan-500'
                  : 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed'
              ]"
              @click="isPaused ? emit('resume') : emit('pause')"
            >
              <PauseIcon v-if="!isPaused" class="h-4 w-4" />
              <PlayIcon v-else class="h-4 w-4" />
              {{ isPaused ? 'Resume' : 'Pause' }}
            </button>

            <!-- Stop Button -->
            <button
              :disabled="!isRunning || isStreamFinished"
              :class="[
                'px-3 py-2 font-medium rounded-md transition-colors flex items-center gap-2 text-sm',
                isRunning && !isStreamFinished
                  ? 'bg-white text-red-600 border border-red-300 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500'
                  : 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed'
              ]"
              @click="emit('stop')"
            >
              <StopIcon class="h-4 w-4" />
              Stop
            </button>
          </div>
        </div>

        <!-- Stream ID Display - Full width below status -->
        <div v-if="isRunning" class="flex items-center gap-2">
          <p
            class="text-xs font-medium uppercase text-gray-500 dark:text-gray-400 whitespace-nowrap"
          >
            Stream ID:
          </p>
          <code
            class="text-sm font-mono bg-white dark:bg-gray-850 border border-gray-300 dark:border-gray-700 px-3 py-1.5 rounded text-gray-700 dark:text-gray-300 flex-1 min-w-0 truncate"
          >
            {{ streamID }}
          </code>
        </div>

        <!-- Progress Bar and Stage Indicators -->
        <div v-if="isRunning" class="pt-4 border-t border-gray-300/50">
          <!-- Progress Bar -->
          <div class="mb-4">
            <div class="overflow-hidden rounded-full bg-gray-200 shadow-inner">
              <div
                class="rounded-full h-2 transition-all duration-500"
                :class="isRunning ? 'bg-linear-to-r from-blue-500 to-cyan-500' : 'bg-gray-400'"
                :style="{ width: isRunning ? store.stagesBarWidth : '0%' }"
              ></div>
            </div>
          </div>

          <!-- Stage Icons -->
          <div class="flex justify-between gap-2 px-1">
            <div
              v-for="(stage, index) in store.stages"
              :key="stage.id"
              class="flex flex-col items-center flex-1 min-w-0"
            >
              <div
                :class="[
                  'w-7 h-7 rounded-full flex items-center justify-center shrink-0',
                  stageClass(index)
                ]"
              >
                <span class="text-xs font-semibold">{{ index + 1 }}</span>
              </div>
              <span
                :class="[
                  'text-xs mt-1 text-center truncate',
                  textClass(index),
                  isRunning && index === store.currentStageID - 1 ? 'font-bold' : 'font-medium'
                ]"
                :title="stage.title"
              >
                {{ stage.title }}
              </span>
              <span
                v-if="isRunning && stage.timestamp"
                class="text-xs mt-0.5 text-gray-500 whitespace-nowrap"
              >
                {{ formatTimestamp(stage.timestamp) }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { PauseIcon, PlayIcon, StopIcon } from '@heroicons/vue/24/outline'
import { useMonitoringStore } from '@/stores/monitoring'
import type { StreamConfig } from '@/types/streamConfig'

interface Props {
  streamConfig?: StreamConfig
  isRunning: boolean
  isStreamFinished: boolean
  isPaused: boolean
  streamStatus: string
  streamID: string
}

const props = withDefaults(defineProps<Props>(), {
  streamStatus: 'Not Running',
  streamID: ''
})

const emit = defineEmits<{
  (e: 'pause'): void
  (e: 'resume'): void
  (e: 'stop'): void
}>()

const store = useMonitoringStore()

function stageClass(index: number): string {
  if (!props.isRunning) return 'bg-gray-200 text-gray-400'
  if (!store.currentStage) return 'bg-gray-200 text-gray-400'
  if (index < store.currentStageID - 1) {
    return 'bg-green-500 text-white'
  } else if (index === store.currentStageID - 1) {
    return 'bg-green-600 text-white'
  } else {
    return 'bg-gray-200 text-gray-400'
  }
}

function textClass(index: number): string {
  if (!props.isRunning) return 'text-gray-400'
  if (!store.currentStage) return 'text-gray-400'
  if (index < store.currentStageID - 1) {
    return 'text-green-500'
  } else if (index === store.currentStageID - 1) {
    return 'text-green-600'
  } else {
    return 'text-gray-400'
  }
}

function formatTimestamp(timestamp: number | null): string {
  if (!timestamp) return ''
  const timestampInMs = timestamp < 1e12 ? timestamp * 1000 : timestamp
  const date = new Date(timestampInMs)
  return date.toLocaleTimeString([], {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}
</script>

<style scoped>
/* Smooth transitions for stage progress */
div {
  transition: background-color 0.3s ease;
}
</style>
