<template>
  <div v-if="isPaginatorVisible" class="mt-4 mt-4 flex items-center">
    <button
      type="button"
      class="mt-3 inline-flex w-full justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-base font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus-visible:border-gray-400 focus-visible:bg-gray-50 dark:border-gray-700 dark:bg-gray-850 dark:text-gray-300 dark:shadow-gray-900/30 dark:hover:bg-gray-800 dark:focus-visible:border-gray-500 dark:focus-visible:bg-gray-800 sm:mt-0 sm:ml-3 sm:w-auto disabled:cursor-not-allowed disabled:opacity-50"
      :disabled="previousPageDisabled"
      @click="previousPage"
    >
      <ChevronLeft class="h-6 w-6" aria-hidden="true" />
      Prev
    </button>
    <span class="mx-3 text-gray-900 dark:text-gray-100"
      >Page {{ currentPage }} of {{ maxPage }}
    </span>
    <button
      type="button"
      class="mt-3 inline-flex w-full justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-base font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus-visible:border-gray-400 focus-visible:bg-gray-50 dark:border-gray-700 dark:bg-gray-850 dark:text-gray-300 dark:shadow-gray-900/30 dark:hover:bg-gray-800 dark:focus-visible:border-gray-500 dark:focus-visible:bg-gray-800 sm:mt-0 sm:ml-3 sm:w-auto disabled:cursor-not-allowed disabled:opacity-50"
      :disabled="nextPageDisabled"
      @click="nextPage"
    >
      Next
      <ChevronRight class="h-6 w-6" aria-hidden="true" />
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { ChevronLeft, ChevronRight } from 'lucide-vue-next'

interface Props {
  totalItems: number
  itemsPerPage: number
  currentPage: number
}

const props = defineProps<Props>()
const emits = defineEmits(['update:currentPage'])

const maxPage = computed(() =>
  props.itemsPerPage > 0 ? Math.max(1, Math.ceil(props.totalItems / props.itemsPerPage)) : 1
)
const isPaginatorVisible = computed(() => props.totalItems > props.itemsPerPage)

const previousPageDisabled = computed(() => props.currentPage <= 1)
const nextPageDisabled = computed(() => props.currentPage >= maxPage.value)

const previousPage = () => {
  if (!previousPageDisabled.value) {
    emits('update:currentPage', Math.max(1, props.currentPage - 1))
  }
}

const nextPage = () => {
  if (!nextPageDisabled.value) {
    emits('update:currentPage', Math.min(maxPage.value, props.currentPage + 1))
  }
}
</script>
