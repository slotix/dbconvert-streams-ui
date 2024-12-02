<template>
  <div class="w-full py-6">
    <div
      class="bg-white shadow-md rounded-lg overflow-hidden cursor-pointer transform hover:scale-105 duration-300 ease-in-out flex flex-col"
      @click="selectConnection"
    >
      <div class="flex flex-wrap items-center bg-gray-100 p-4">
        <div class="item w-1/5 flex">
          <img class="h-8 w-8 rounded-full" :src="logoSrc" :alt="connection.type + ' logo'" />
        </div>
        <div class="item w-4/5 flex flex-col">
          <span class="uppercase truncate tracking-wide text-sm font-medium text-gray-800">
            {{ connection.name }}
          </span>
          <span class="text-xs text-gray-500"> ID: {{ connection.id }} </span>
        </div>
      </div>
      <div :class="bgRowClass(connection)">
        <div class="px-2 flex items-center justify-between">
          <div class="px-4 pt-4 md:text-left w-full space-y-2 text-gray-500">
            <span class="mx-auto font-semibold text-gray-800">
              Host:
              <span class="font-normal text-sm text-gray-600 pl-3">{{ concatenateValues }} </span>
            </span>
          </div>
          <div v-show="selected" class="mt-4 mr-4 items-center">
            <CheckCircleIcon
              class="h-8 w-8"
              aria-hidden="true"
              :class="{
                'text-yellow-600': currentStep != null && currentStep.name === 'source',
                'text-green-600': currentStep != null && currentStep.name === 'target'
              }"
            />
          </div>
        </div>
        <div class="flex-auto px-6 md:text-left w-full space-y-2 text-gray-500">
          <span class="mx-auto font-semibold text-gray-800">
            Database:
            <span class="font-normal text-sm text-gray-600 pl-3">{{ connection.database }}</span>
          </span>
        </div>
        <!-- Add schema information or placeholder -->
        <div
          v-if="connection.schema"
          class="flex-auto px-6 md:text-left w-full space-y-2 text-gray-500"
        >
          <span class="mx-auto font-semibold text-gray-800">
            Schema:
            <span class="font-normal text-sm text-gray-600 pl-3">{{ connection.schema }}</span>
          </span>
        </div>
        <div v-else class="flex-auto px-6 md:text-left w-full space-y-2 text-gray-500 h-[24px]">
          <!-- Placeholder to maintain consistent height -->
        </div>
        <span class="px-6 pt-4 pb-4 inline-flex text-gray-600">
          <CalendarIcon class="h-4 w-4" aria-hidden="true" />
          <span class="text-sm pl-3">{{ connectionCreated }}</span>
        </span>
      </div>
      <div v-show="!isStreamsPage" class="mt-auto flex divide-x divide-gray-200">
        <div class="flex w-0 flex-1">
          <button
            v-tooltip="'Edit the connection'"
            type="button"
            class="relative -mr-px inline-flex w-0 flex-1 items-center justify-center gap-x-3 rounded-bl-lg border border-gray-300 py-4 text-sm text-gray-600 font-semibold bg-gray-100 hover:bg-gray-200 hover:text-gray-700"
            @click="editConnection"
          >
            <PencilIcon class="h-5 w-5" aria-hidden="true" />
            Edit
          </button>
        </div>
        <div class="-ml-px flex w-0 flex-1">
          <button
            v-tooltip="'Clone the connection'"
            type="button"
            class="relative inline-flex w-0 flex-1 items-center justify-center gap-x-3 border border-gray-300 py-4 text-gray-600 text-sm font-semibold bg-gray-100 hover:bg-gray-200 hover:text-gray-700"
            @click.stop="cloneConnection"
          >
            <Square2StackIcon class="h-5 w-5" aria-hidden="true" />
            Clone
          </button>
        </div>
        <div class="-ml-px flex w-0 flex-1">
          <button
            v-tooltip="'Delete the connection'"
            type="button"
            class="relative inline-flex w-0 flex-1 items-center justify-center gap-x-3 rounded-br-lg border border-gray-300 py-4 text-sm font-semibold text-red-600 bg-gray-100 hover:bg-gray-200 hover:text-red-700"
            @click.stop="deleteConn(connection.id)"
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
import shared from './shared.ts'
import { vTooltip } from '@/directives/tooltip'

export default {
  ...shared,
  directives: {
    tooltip: vTooltip
  },
  props: {
    connection: {
      type: Object,
      required: true
    }
  }
}
</script>
