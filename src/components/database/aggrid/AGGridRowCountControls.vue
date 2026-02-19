<script setup lang="ts">
import { AlertCircle, Calculator, Info, Loader2 } from 'lucide-vue-next'
defineProps<{
  isView: boolean
  totalRowCount: number
  isCountExact: boolean
  countError: string | null
  isCounting: boolean
}>()

const emit = defineEmits<{
  (e: 'calculate'): void
}>()

function formatCount(n: number): string {
  try {
    return n.toLocaleString()
  } catch {
    return String(n)
  }
}
</script>

<template>
  <div class="mt-3 flex items-center justify-between">
    <div class="flex items-center gap-3">
      <span
        v-if="!isView && totalRowCount > 0 && !isCountExact"
        class="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1"
      >
        <Info class="w-3 h-3" />
        <span>Count (~{{ formatCount(totalRowCount) }}) is approximate</span>
      </span>

      <span
        v-if="countError"
        class="text-sm text-red-600 dark:text-red-300 flex items-center gap-1"
      >
        <AlertCircle class="w-4 h-4" />
        {{ countError }}
      </span>
    </div>

    <button
      v-if="!isCountExact"
      type="button"
      :disabled="isCounting"
      class="text-xs text-teal-600 dark:text-teal-400 hover:text-teal-800 dark:hover:text-teal-300 bg-teal-50 dark:bg-teal-900/20 hover:bg-teal-100 dark:hover:bg-teal-800/30 rounded-full px-3 py-1 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5 w-fit"
      :title="`Execute COUNT(*) query to get exact ${isView ? 'row' : 'total'} count`"
      @click="emit('calculate')"
    >
      <Calculator v-if="!isCounting" class="w-3.5 h-3.5" />
      <Loader2 v-else class="animate-spin w-3.5 h-3.5" />
      <span>{{ isCounting ? 'Counting...' : 'Calculate exact count' }}</span>
    </button>
  </div>
</template>
