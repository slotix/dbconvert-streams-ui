<template>
  <div class="w-full">
    <div
      class="bg-white shadow-lg rounded-xl overflow-hidden cursor-pointer transform hover:scale-[1.02] hover:shadow-xl duration-300 ease-in-out flex flex-col h-full max-w-4xl mx-auto border border-gray-200/75"
      @click="selectStream">
      <div class="flex items-center justify-between bg-gray-100/75 p-2.5 border-b border-gray-200">
        <div class="uppercase tracking-wide text-sm font-semibold text-gray-900 truncate">
          {{ stream.name }}
        </div>
        <div class="flex items-center gap-2">
          <Switch v-model="isJsonView"
            class="relative inline-flex h-5 w-10 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-gray-600 focus:ring-offset-2"
            :class="[isJsonView ? 'bg-gray-600' : 'bg-gray-400']">
            <span class="sr-only">Toggle JSON view</span>
            <span aria-hidden="true"
              class="pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out"
              :class="[
                isJsonView ? 'translate-x-5' : 'translate-x-0',
                'shadow-[0_1px_4px_rgba(0,0,0,0.15)]'
              ]" />
          </Switch> JSON
          <button v-if="isJsonView" v-tooltip="'Copy configuration'"
            class="p-1 text-gray-500 hover:text-gray-700 rounded-md hover:bg-gray-100" @click.stop="copyConfig">
            <ClipboardIcon class="h-4 w-4" />
          </button>
        </div>
      </div>
      <div v-if="isJsonView" class="flex-grow space-y-1.5 px-4 py-2">
        <div class="bg-gray-50 rounded-lg shadow-sm p-2 border border-gray-100">
          <pre class="text-sm text-gray-900 whitespace-pre-wrap">{{ prettyConfig }}</pre>
        </div>
      </div>
      <div v-else class="flex-grow space-y-2 px-4 py-3 bg-white">
        <div class="relative">
          <div class="grid grid-cols-2 gap-3">
            <div class="flex-auto space-y-1.5 text-gray-500 bg-gray-50/50 rounded-lg p-2.5 border border-gray-100">
              <span class="mx-auto font-semibold text-gray-900">
                <div class="flex items-center justify-center space-x-2 mb-2">
                  Source:
                  <img v-if="source && source.type" class="h-5 w-5 rounded-full ml-1.5" :src="logoSrc(source.type)"
                    :alt="source.type + ' logo'" />
                </div>
                <span class="font-normal text-sm break-all block mt-1.5 flex items-center gap-1"
                  :class="{ 'text-red-500': !source || !source.name, 'text-gray-600': source && source.name }">
                  {{ source?.name || 'N/A' }}
                  <ExclamationCircleIcon v-if="!source || !source.name" class="h-4 w-4 text-red-500"
                    aria-hidden="true" />
                </span>
                <div class="mt-1.5 pt-1.5 border-t border-gray-200">
                  <div class="text-sm text-gray-500">
                    <ConnectionStringDisplay v-if="source" :connection="source" />
                    <span v-else class="text-red-500 text-xs">Connection not found</span>
                  </div>
                </div>
              </span>
            </div>
            <div class="absolute left-1/2 top-1/2 -translate-y-1/2 -ml-px border-l-2 border-gray-300 h-4/5"></div>
            <div class="absolute left-1/2 top-0 -translate-x-1/2 z-10 bg-white px-2">
              <span
                class="whitespace-nowrap inline-block rounded-md bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20 shadow-sm">
                {{ stream.mode }}
              </span>
            </div>
            <div class="flex-auto space-y-1.5 text-gray-500 bg-gray-50/50 rounded-lg p-2.5 border border-gray-100">
              <span class="mx-auto font-semibold text-gray-900">
                <div class="flex items-center justify-center space-x-2 mb-2">
                  Target:
                  <img v-if="target && target.type" class="h-5 w-5 rounded-full ml-1.5" :src="logoSrc(target.type)"
                    :alt="target.type + ' logo'" />
                </div>
                <span class="font-normal text-sm break-all block mt-1.5 flex items-center gap-1"
                  :class="{ 'text-red-500': !target || !target.name, 'text-gray-600': target && target.name }">
                  {{ target?.name || 'N/A' }}
                  <ExclamationCircleIcon v-if="!target || !target.name" class="h-4 w-4 text-red-500"
                    aria-hidden="true" />
                </span>
                <div class="mt-1.5 pt-1.5 border-t border-gray-200">
                  <div class="text-sm text-gray-500">
                    <ConnectionStringDisplay v-if="target" :connection="target" />
                    <span v-else class="text-red-500 text-xs">Connection not found</span>
                  </div>
                </div>
              </span>
            </div>
          </div>
        </div>
        <div class="flex-auto space-y-1.5 text-gray-500 mt-2">
          <span class="mx-auto font-semibold text-gray-900">
            Tables:
            <span class="font-normal text-sm text-gray-600 pl-2">
              [{{ displayedTables.join(', ') }}{{ remainingTablesCount > 0 ? ', ...' : '' }}]
              <span v-if="remainingTablesCount > 0" class="text-xs italic ml-1">
                ({{ remainingTablesCount }} more)
              </span>
            </span>
          </span>
        </div>
        <div class="inline-flex text-gray-600 mt-1.5">
          <CalendarIcon class="h-4 w-4" aria-hidden="true" />
          <span class="text-sm pl-2">{{ streamCreated }}</span>
        </div>
      </div>
      <div class="mt-auto flex divide-x divide-gray-200">
        <div class="flex w-0 flex-1">
          <button v-tooltip="'Edit stream configuration'" type="button"
            class="relative inline-flex w-0 flex-1 items-center justify-center gap-x-2 rounded-bl-lg border border-gray-200 py-2.5 text-sm text-gray-700 font-semibold bg-gray-50 hover:bg-gray-100"
            @click.stop="editStream">
            <PencilIcon class="h-4 w-4 text-gray-700" aria-hidden="true" />
            Edit
          </button>
        </div>
        <div class="-ml-px flex w-0 flex-1">
          <ActionsMenu v-tooltip="'More stream actions'"
            class="w-full rounded-none border border-gray-200 bg-gray-50 hover:bg-gray-100"
            :position="actionsMenuPosition" :viewType="'cards'" @selectRow="selectStream" @editRow="editStream"
            @cloneRow="cloneStream" @deleteRow="deleteStream" />
        </div>
        <div class="-ml-px flex w-0 flex-1">
          <button v-tooltip="'Start the stream'" type="button"
            class="relative inline-flex w-0 flex-1 items-center justify-center gap-x-0 rounded-br-lg border border-gray-200 py-2.5 text-sm font-semibold text-gray-700 bg-gray-50 hover:bg-gray-100"
            @click.stop="startStream">
            <PlayIcon class="h-4 w-4 text-green-700 mr-1.5" aria-hidden="true" />
            Start
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { defineComponent } from 'vue'
import shared from './shared'
import { vTooltip } from '@/directives/tooltip'

export default defineComponent({
  ...shared,
  directives: {
    tooltip: vTooltip
  },
})
</script>
