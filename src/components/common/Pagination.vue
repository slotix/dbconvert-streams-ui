<template>
  <div v-if="isPaginatorVisible" class="mt-4 mt-4 flex items-center">
    <button
      type="button"
      class="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 sm:mt-0 sm:ml-3 sm:w-auto"
      :disabled="previousPageDisabled"
      @click="previousPage"
    >
      <ChevronLeftIcon class="h-6 w-6" aria-hidden="true" />
      Prev
    </button>
    <span class="mx-3">Page {{ currentPage }} of {{ maxPage }} </span>
    <button
      type="button"
      class="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 sm:mt-0 sm:ml-3 sm:w-auto"
      :disabled="nextPageDisabled"
      @click="nextPage"
    >
      Next
      <ChevronRightIcon class="h-6 w-6" aria-hidden="true" />
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/vue/20/solid'

interface Props {
  totalPages: number
  itemsPerPage: number
}

const props = defineProps<Props>()
const emits = defineEmits(['update:currentPage'])
const currentPage = ref(1)
// const itemsPerPage = 20 // Set the number of items to display per page

const maxPage = computed(() => Math.ceil(props.totalPages / props.itemsPerPage))
const isPaginatorVisible = computed(() => maxPage.value > 1)

const previousPageDisabled = computed(() => currentPage.value <= 1)
const nextPageDisabled = computed(() => currentPage.value >= maxPage.value)

const previousPage = () => {
  if (currentPage.value > 1) {
    currentPage.value--
    emits('update:currentPage', currentPage.value)
  }
}

const nextPage = () => {
  if (currentPage.value < maxPage.value) {
    currentPage.value++
    emits('update:currentPage', currentPage.value)
  }
}
</script>
