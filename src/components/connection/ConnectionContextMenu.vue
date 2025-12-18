<script setup lang="ts">
import { computed } from 'vue'

type ContextTarget = {
  kind: 'connection'
  connectionId: string
  connectionName: string
  connectionType: string
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
        :style="{ left: x + 'px', top: y + 'px', minWidth: '180px' }"
      >
        <!-- Explore -->
        <button
          class="w-full text-left px-3 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 text-teal-600 dark:text-teal-300"
          @click="click('explore-connection')"
        >
          Explore
        </button>

        <!-- Test Connection -->
        <button
          class="w-full text-left px-3 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200"
          @click="click('test-connection')"
        >
          Test Connection
        </button>

        <div class="my-1 border-t border-gray-100 dark:border-gray-800"></div>

        <!-- Edit -->
        <button
          class="w-full text-left px-3 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200"
          @click="click('edit-connection')"
        >
          Edit
        </button>

        <!-- Duplicate -->
        <button
          class="w-full text-left px-3 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200"
          @click="click('duplicate-connection')"
        >
          Duplicate
        </button>

        <div class="my-1 border-t border-gray-100 dark:border-gray-800"></div>

        <!-- Create Stream -->
        <button
          class="w-full text-left px-3 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200"
          @click="click('create-stream-from-connection')"
        >
          Create Stream...
        </button>

        <div class="my-1 border-t border-gray-100 dark:border-gray-800"></div>

        <!-- Delete -->
        <button
          class="w-full text-left px-3 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 text-red-600 dark:text-red-400"
          @click="click('delete-connection')"
        >
          Delete
        </button>
      </div>
    </div>
  </teleport>
</template>
