<template>
  <div
    v-if="show"
    class="fixed top-0 left-0 right-0 bg-red-600 dark:bg-red-700 text-white px-4 py-3 z-30"
  >
    <div class="flex items-center justify-between max-w-7xl mx-auto">
      <div class="flex items-center space-x-3">
        <AlertTriangle class="h-5 w-5 text-red-200" />
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
import { AlertTriangle, X } from 'lucide-vue-next'
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
