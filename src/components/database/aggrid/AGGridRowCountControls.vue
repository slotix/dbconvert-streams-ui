<script setup lang="ts">
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
        <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
          <path
            fill-rule="evenodd"
            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
            clip-rule="evenodd"
          />
        </svg>
        <span>Count (~{{ formatCount(totalRowCount) }}) is approximate</span>
      </span>

      <span
        v-if="countError"
        class="text-sm text-red-600 dark:text-red-400 flex items-center gap-1"
      >
        <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path
            fill-rule="evenodd"
            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
            clip-rule="evenodd"
          />
        </svg>
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
      <svg
        v-if="!isCounting"
        class="w-3.5 h-3.5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
        />
      </svg>
      <svg v-else class="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
        <circle
          class="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          stroke-width="4"
        ></circle>
        <path
          class="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        ></path>
      </svg>
      <span>{{ isCounting ? 'Counting...' : 'Calculate exact count' }}</span>
    </button>
  </div>
</template>
