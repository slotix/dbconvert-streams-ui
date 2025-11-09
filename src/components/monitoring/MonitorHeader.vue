<template>
  <div class="space-y-4">
    <!-- Unified Status and Progress Header -->
    <div
      :class="[
        'border rounded-lg p-6',
        'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700'
      ]"
    >
      <div class="space-y-4">
        <!-- Status Display - Centered -->
        <div class="flex items-start gap-4">
          <div
            :class="[
              'flex items-center justify-center w-12 h-12 rounded-full shrink-0 mt-0.5',
              isRunning
                ? isStreamFinished
                  ? 'bg-green-100 dark:bg-green-900/30'
                  : isPaused
                    ? 'bg-yellow-100 dark:bg-yellow-900/30'
                    : 'bg-blue-100 dark:bg-blue-900/30'
                : 'bg-gray-100 dark:bg-gray-800'
            ]"
          >
            <span
              v-if="isRunning && !isStreamFinished && !isPaused"
              class="inline-block w-3 h-3 rounded-full bg-blue-600 animate-pulse"
            ></span>
            <svg
              v-else-if="isStreamFinished"
              class="h-6 w-6 text-green-600 dark:text-green-300"
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
            <PauseIcon v-else-if="isPaused" class="h-6 w-6 text-yellow-600 dark:text-yellow-300" />
            <PlayIcon v-else class="h-6 w-6 text-gray-400 dark:text-gray-500" />
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

        <!-- Progress Bar and Stage Indicators -->
        <div v-if="isRunning" class="pt-4 border-t border-gray-300/50 dark:border-gray-700">
          <!-- Progress Bar -->
          <div class="mb-4">
            <div class="overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700 shadow-inner">
              <div
                class="rounded-full h-2 transition-all duration-500"
                :class="
                  isRunning
                    ? 'bg-linear-to-r from-blue-500 to-cyan-500 dark:from-blue-400 dark:to-cyan-400'
                    : 'bg-gray-400 dark:bg-gray-600'
                "
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
                class="text-xs mt-0.5 text-gray-500 dark:text-gray-400 whitespace-nowrap"
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
import { PauseIcon, PlayIcon } from '@heroicons/vue/24/outline'
import { useMonitoringStore } from '@/stores/monitoring'
import type { StreamConfig } from '@/types/streamConfig'

interface Props {
  streamConfig?: StreamConfig
  isRunning: boolean
  isStreamFinished: boolean
  isPaused: boolean
  streamStatus: string
}

const props = withDefaults(defineProps<Props>(), {
  streamStatus: 'Not Running'
})

const store = useMonitoringStore()

function stageClass(index: number): string {
  if (!props.isRunning) return 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500'
  if (!store.currentStage) return 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500'
  if (index < store.currentStageID - 1) {
    return 'bg-green-500 dark:bg-green-400 text-white dark:text-gray-900'
  } else if (index === store.currentStageID - 1) {
    return 'bg-green-600 dark:bg-green-500 text-white dark:text-gray-900'
  } else {
    return 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500'
  }
}

function textClass(index: number): string {
  if (!props.isRunning) return 'text-gray-400 dark:text-gray-500'
  if (!store.currentStage) return 'text-gray-400 dark:text-gray-500'
  if (index < store.currentStageID - 1) {
    return 'text-green-500 dark:text-green-300'
  } else if (index === store.currentStageID - 1) {
    return 'text-green-600 dark:text-green-300'
  } else {
    return 'text-gray-400 dark:text-gray-500'
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
