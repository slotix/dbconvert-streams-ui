<template>
  <div class="max-w-sm w-full py-6">
    <div
      class="bg-white shadow-md rounded-lg overflow-hidden cursor-pointer transform hover:scale-105 duration-300 ease-in-out"
      @click="selectConnection"
    >
      <div
        class="flex flex-wrap items-center bg-gray-100 p-4"
        :class="{
          'bg-gradient-to-r from-white via-yellow-200 to-yellow-500':
            highlightSelected === 'source',
          'bg-gradient-to-r from-white via-green-200 to-green-500': highlightSelected === 'target'
        }"
      >
        <div class="item w-1/5 flex">
          <img class="h-10 w-10 rounded-full" :src="logoSrc" :alt="connection.type + ' logo'" />
        </div>
        <span class="item w-3/5 uppercase truncate tracking-wide text-sm font-medium text-gray-800">
          {{ connection.name }}
        </span>
        <span v-show="isSelectable && selected" class="justify-end item w-1/5 flex text-gray-700">
          <!-- check mark -->

          <CheckCircleIcon class="h-8 w-8" aria-hidden="true" />
        </span>
      </div>

      <div class="flex-auto px-4 pt-4 md:text-left w-full space-y-2 text-gray-500">
        <span class="mx-auto font-semibold text-gray-800">
          Host:
          <span class="font-normal pl-3">{{ concatenateValues }} </span>
        </span>
      </div>
      <div class="flex-auto px-4 pt-2 md:text-left w-full space-y-2 text-gray-500">
        <span class="mx-auto font-semibold text-gray-800">
          Database:
          <span class="font-normal pl-3"> {{ connection.database }}</span>
        </span>
      </div>
      <div class="px-4 pt-4 pb-4">
        <div class="flex items-center pt-2">
          <span class="inline-flex font-bold text-gray-600">
            <CalendarIcon class="h-6 w-6" aria-hidden="true" />
            <span class="font-normal pl-3"> {{ connectionCreated }}</span>
          </span>
        </div>
      </div>

      <div class="-mt-px flex divide-x divide-gray-200">
        <div class="flex w-0 flex-1">
          <button
            type="button"
            class="relative -mr-px inline-flex w-0 flex-1 items-center justify-center gap-x-3 rounded-bl-lg border border-gray-500 py-4 text-sm font-semibold text-gray-200 bg-gray-600"
            @click="editConnection"
          >
            <PencilIcon class="h-5 w-5 text-gray-200" aria-hidden="true" />
            Edit
          </button>
        </div>
        <div class="-ml-px flex w-0 flex-1">
          <button
            type="button"
            class="relative inline-flex w-0 flex-1 items-center justify-center gap-x-3 border border-gray-500 py-4 text-sm font-semibold text-gray-200 bg-gray-600"
            @click="cloneConnection"
          >
            <Square2StackIcon class="h-5 w-5 text-gray-200" aria-hidden="true" />
            Clone
          </button>
        </div>
        <div class="-ml-px flex w-0 flex-1">
          <button
            type="button"
            class="relative inline-flex w-0 flex-1 items-center justify-center gap-x-3 rounded-br-lg border border-transparent py-4 text-sm font-semibold text-red-600 bg-gray-200"
            @click="deleteConn(connection.id)"
          >
            <TrashIcon class="h-5 w-5 text-red-600" aria-hidden="true" />
            Delete
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import shared from './shared.js'
import {
  PencilIcon,
  Square2StackIcon,
  TrashIcon,
  CalendarIcon,
  CheckCircleIcon
} from '@heroicons/vue/24/outline'
export default Object.assign({}, shared, {
  components: {
    PencilIcon,
    Square2StackIcon,
    TrashIcon,
    CalendarIcon,
    CheckCircleIcon
  },
  props: {
    connection: {
      type: Object,
      required: true
    },
    isSelectable: {
      type: Boolean,
      required: true,
      default: true
    }
  }
})
</script>

<style></style>
