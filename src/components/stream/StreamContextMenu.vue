<script setup lang="ts">
import { computed } from 'vue'
import { Copy, Pencil, Play, Pause, RotateCcw, Trash2 } from 'lucide-vue-next'

// Get current zoom factor for position adjustment
const getZoomFactor = () => {
  const zoomValue = getComputedStyle(document.documentElement).getPropertyValue('--app-zoom')
  return parseFloat(zoomValue) || 1
}

type ContextTarget = {
  kind: 'stream'
  streamId: string
  streamName: string
  isRunning: boolean
  isPaused: boolean
  isFinished: boolean
}

const props = defineProps<{
  visible: boolean
  x: number
  y: number
  target: ContextTarget | null
}>()

const emit = defineEmits<{
  (e: 'menu-action', payload: { action: string; target: ContextTarget }): void
  (e: 'close'): void
}>()

const hasMenu = computed(() => props.visible && !!props.target)
const target = computed(() => props.target as ContextTarget)

// Adjust position for CSS zoom
const adjustedX = computed(() => props.x / getZoomFactor())
const adjustedY = computed(() => props.y / getZoomFactor())

// Determine which actions are available based on stream state
const canStart = computed(() => {
  if (!props.target) return false
  return !props.target.isRunning || props.target.isFinished
})

const canPause = computed(() => {
  if (!props.target) return false
  return props.target.isRunning && !props.target.isPaused && !props.target.isFinished
})

const canResume = computed(() => {
  if (!props.target) return false
  return props.target.isPaused && !props.target.isFinished
})

function click(action: string) {
  if (!props.target) return
  emit('menu-action', { action, target: props.target })
}
</script>

<template>
  <teleport to="body">
    <div v-if="hasMenu">
      <!-- Backdrop -->
      <div class="fixed inset-0 z-40" @click="emit('close')"></div>
      <!-- Menu -->
      <div
        class="fixed z-50 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg dark:shadow-gray-900/40 py-1 text-sm text-gray-900 dark:text-gray-100"
        :style="{ left: adjustedX + 'px', top: adjustedY + 'px', minWidth: '180px' }"
      >
        <!-- Start/Run Again -->
        <button
          v-if="canStart"
          class="w-full text-left px-3 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 text-teal-600 dark:text-teal-300 flex items-center gap-2"
          @click="click('start-stream')"
        >
          <component :is="target.isFinished ? RotateCcw : Play" class="w-4 h-4 shrink-0" />
          <span>{{ target.isFinished ? 'Run again' : 'Start' }}</span>
        </button>

        <!-- Pause -->
        <button
          v-if="canPause"
          class="w-full text-left px-3 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 text-yellow-600 dark:text-yellow-300 flex items-center gap-2"
          @click="click('pause-stream')"
        >
          <Pause class="w-4 h-4 shrink-0" />
          <span>Pause</span>
        </button>

        <!-- Resume -->
        <button
          v-if="canResume"
          class="w-full text-left px-3 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 text-teal-600 dark:text-teal-300 flex items-center gap-2"
          @click="click('resume-stream')"
        >
          <Play class="w-4 h-4 shrink-0" />
          <span>Resume</span>
        </button>

        <div
          v-if="canStart || canPause || canResume"
          class="my-1 border-t border-gray-100 dark:border-gray-800"
        ></div>

        <!-- Edit -->
        <button
          class="w-full text-left px-3 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200 flex items-center gap-2"
          @click="click('edit-stream')"
        >
          <Pencil class="w-4 h-4 shrink-0 text-gray-500 dark:text-gray-400" />
          <span>Edit</span>
        </button>

        <!-- Clone -->
        <button
          class="w-full text-left px-3 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200 flex items-center gap-2"
          @click="click('clone-stream')"
        >
          <Copy class="w-4 h-4 shrink-0 text-gray-500 dark:text-gray-400" />
          <span>Clone</span>
        </button>

        <div class="my-1 border-t border-gray-100 dark:border-gray-800"></div>

        <!-- Delete -->
        <button
          class="w-full text-left px-3 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 text-red-600 dark:text-red-400 flex items-center gap-2"
          @click="click('delete-stream')"
        >
          <Trash2 class="w-4 h-4 shrink-0" />
          <span>Delete</span>
        </button>
      </div>
    </div>
  </teleport>
</template>
