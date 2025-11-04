<script setup lang="ts">
import { computed } from 'vue'

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
        class="fixed z-50 bg-white border border-gray-200 rounded-md shadow-lg py-1 text-sm"
        :style="{ left: x + 'px', top: y + 'px', minWidth: '180px' }"
      >
        <!-- Start/Run Again -->
        <button
          v-if="canStart"
          class="w-full text-left px-3 py-1.5 hover:bg-gray-100 text-teal-600"
          @click="click('start-stream')"
        >
          {{ target.isFinished ? 'Run again' : 'Start' }}
        </button>

        <!-- Pause -->
        <button
          v-if="canPause"
          class="w-full text-left px-3 py-1.5 hover:bg-gray-100 text-yellow-600"
          @click="click('pause-stream')"
        >
          Pause
        </button>

        <!-- Resume -->
        <button
          v-if="canResume"
          class="w-full text-left px-3 py-1.5 hover:bg-gray-100 text-teal-600"
          @click="click('resume-stream')"
        >
          Resume
        </button>

        <div v-if="canStart || canPause || canResume" class="my-1 border-t border-gray-100"></div>

        <!-- Edit -->
        <button
          class="w-full text-left px-3 py-1.5 hover:bg-gray-100"
          @click="click('edit-stream')"
        >
          Edit
        </button>

        <!-- Clone -->
        <button
          class="w-full text-left px-3 py-1.5 hover:bg-gray-100"
          @click="click('clone-stream')"
        >
          Clone
        </button>

        <div class="my-1 border-t border-gray-100"></div>

        <!-- Delete -->
        <button
          class="w-full text-left px-3 py-1.5 hover:bg-gray-100 text-red-600"
          @click="click('delete-stream')"
        >
          Delete
        </button>
      </div>
    </div>
  </teleport>
</template>
