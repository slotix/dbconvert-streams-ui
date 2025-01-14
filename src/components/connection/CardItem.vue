<template>
  <div class="w-full py-2">
    <div
      class="bg-white shadow-lg rounded-xl overflow-hidden cursor-pointer transform hover:scale-[1.02] hover:shadow-xl duration-300 ease-in-out flex flex-col border"
      :class="{
        'border-yellow-500 ring-2 ring-yellow-400': selected && currentStep?.name === 'source',
        'border-green-500 ring-2 ring-green-400': selected && currentStep?.name === 'target',
        'border-gray-200/75': !selected
      }" @click="selectConnection">
      <div class="flex items-center justify-between p-3 " :class="{
        'bg-yellow-50': selected && currentStep?.name === 'source',
        'bg-green-50': selected && currentStep?.name === 'target',
        'bg-gray-50': !selected
      }">
        <div class="flex items-center gap-4 min-w-0">
          <img
            class="h-8 w-8 flex-shrink-0 rounded-full shadow-sm bg-white object-contain p-0.5 transition-all duration-300"
            :class="{
              'ring-2 ring-offset-2 ring-yellow-400 shadow-yellow-200/50': selected && currentStep?.name === 'source',
              'ring-2 ring-offset-2 ring-green-400 shadow-green-200/50': selected && currentStep?.name === 'target',
              'ring-1 ring-gray-200': !selected
            }" :src="logoSrc" :alt="connection.type + ' logo'" />
          <div class="flex flex-col min-w-0">
            <span class="uppercase tracking-wide text-sm font-bold truncate" :class="{
              'text-yellow-900': selected && currentStep?.name === 'source',
              'text-green-900': selected && currentStep?.name === 'target',
              'text-gray-900': !selected
            }">
              {{ connection.name }}
            </span>
            <span class="text-xs text-gray-500 truncate">ID: {{ connection.id }}</span>
          </div>
        </div>
      </div>
      <div class="bg-white p-4 space-y-3">
        <div class="rounded-lg p-3 bg-opacity-50" :class="{
          'bg-yellow-50': selected && currentStep?.name === 'source',
          'bg-green-50': selected && currentStep?.name === 'target',
          'bg-gray-50': !selected
        }">
          <span class="font-semibold text-gray-900">
            Host:
            <span class="font-normal text-gray-700 pl-2">{{ concatenateValues }}</span>
          </span>
        </div>
        <div class="rounded-lg p-3 bg-opacity-50" :class="{
          'bg-yellow-50': selected && currentStep?.name === 'source',
          'bg-green-50': selected && currentStep?.name === 'target',
          'bg-gray-50': !selected
        }">
          <span class="font-semibold text-gray-900">
            Database:
            <span class="font-normal text-gray-700 pl-2">{{ connection.database }}</span>
          </span>
        </div>
        <div v-if="connection.schema" class="rounded-lg p-3 bg-opacity-50" :class="{
          'bg-yellow-50': selected && currentStep?.name === 'source',
          'bg-green-50': selected && currentStep?.name === 'target',
          'bg-gray-50': !selected
        }">
          <span class="font-semibold text-gray-900">
            Schema:
            <span class="font-normal text-gray-700 pl-2">{{ connection.schema }}</span>
          </span>
        </div>
        <div class="rounded-lg p-3 bg-opacity-50" :class="{
          'bg-yellow-50': selected && currentStep?.name === 'source',
          'bg-green-50': selected && currentStep?.name === 'target',
          'bg-gray-50': !selected
        }">
          <span class="font-semibold text-gray-900">
            Connection String:
            <ConnectionStringDisplay :connection="connection" />
          </span>
        </div>
        <div class="flex items-center text-gray-500 pt-1">
          <CalendarIcon class="h-4 w-4" aria-hidden="true" />
          <span class="text-sm pl-2">{{ connectionCreated }}</span>
        </div>
      </div>
      <div v-show="!isStreamsPage" class="mt-auto flex divide-x divide-gray-200" :class="{
        'bg-yellow-50': selected && currentStep?.name === 'source',
        'bg-green-50': selected && currentStep?.name === 'target',
        'bg-gray-50': !selected
      }">
        <div class="flex w-0 flex-1">
          <button v-tooltip="'Edit the connection'" type="button"
            class="relative -mr-px inline-flex w-0 flex-1 items-center justify-center gap-x-2 rounded-bl-lg border border-gray-200 py-2.5 text-sm text-gray-700 font-semibold bg-gray-50 hover:bg-gray-100"
            @click="editConnection">
            <PencilIcon class="h-4 w-4" aria-hidden="true" />
            Edit
          </button>
        </div>
        <div class="-ml-px flex w-0 flex-1">
          <button v-tooltip="'Clone the connection'" type="button"
            class="relative inline-flex w-0 flex-1 items-center justify-center gap-x-2 border border-gray-200 py-2.5 text-gray-700 text-sm font-semibold bg-gray-50 hover:bg-gray-100"
            @click.stop="cloneConnection">
            <Square2StackIcon class="h-4 w-4" aria-hidden="true" />
            Clone
          </button>
        </div>
        <div class="-ml-px flex w-0 flex-1">
          <button v-tooltip="'Delete the connection'" type="button"
            class="relative inline-flex w-0 flex-1 items-center justify-center gap-x-2 rounded-br-lg border border-gray-200 py-2.5 text-sm font-semibold text-red-600 bg-gray-50 hover:bg-gray-100"
            @click.stop="deleteConn(connection.id)">
            <TrashIcon class="h-4 w-4 text-red-600" aria-hidden="true" />
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
