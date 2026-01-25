<template>
  <div
    v-if="show"
    class="fixed top-0 left-0 right-0 bg-red-600 dark:bg-red-700 text-white px-4 py-3 z-30"
  >
    <div class="flex items-center justify-between max-w-7xl mx-auto">
      <div class="flex items-center space-x-3">
        <svg class="h-5 w-5 text-red-200" fill="currentColor" viewBox="0 0 20 20">
          <path
            fill-rule="evenodd"
            d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
            clip-rule="evenodd"
          />
        </svg>
        <span class="font-medium">API Key Expired</span>
        <span class="text-red-200"
          >Your API key has expired. Please enter a new one to continue.</span
        >
      </div>
      <button class="text-red-200 hover:text-white transition-colors" @click="dismiss">
        <X :class="iconSizes.modalClose" :stroke-width="iconStroke" />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { X } from 'lucide-vue-next'
import { useContextualIconSizes } from '@/composables/useIconSizes'
import { useLucideIcons } from '@/composables/useLucideIcons'

defineProps<{
  show: boolean
}>()

const emit = defineEmits<{
  (e: 'dismiss'): void
}>()

const dismiss = () => emit('dismiss')
const { strokeWidth: iconStroke } = useLucideIcons()
const iconSizes = useContextualIconSizes()
</script>
