<template>
  <div v-if="isPaginatorVisible" class="mt-4 mt-4 flex items-center">
    <button
      type="button"
      class="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-700 shadow-sm dark:shadow-gray-900/30 px-4 py-2 bg-white dark:bg-gray-850 text-base font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-900 focus:ring-gray-500 dark:focus:ring-gray-600 sm:mt-0 sm:ml-3 sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed"
      :disabled="previousPageDisabled"
      @click="previousPage"
    >
      <ChevronLeftIcon class="h-6 w-6" aria-hidden="true" />
      Prev
    </button>
    <span class="mx-3 text-gray-900 dark:text-gray-100"
      >Page {{ currentPage }} of {{ maxPage }}
    </span>
    <button
      type="button"
      class="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-700 shadow-sm dark:shadow-gray-900/30 px-4 py-2 bg-white dark:bg-gray-850 text-base font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-900 focus:ring-gray-500 dark:focus:ring-gray-600 sm:mt-0 sm:ml-3 sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed"
      :disabled="nextPageDisabled"
      @click="nextPage"
    >
      Next
      <ChevronRightIcon class="h-6 w-6" aria-hidden="true" />
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/vue/20/solid'

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
