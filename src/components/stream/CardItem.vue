<template>
  <div class="w-full py-6">
    <div
      class="bg-white shadow-md rounded-lg overflow-hidden cursor-pointer transform hover:scale-105 duration-300 ease-in-out flex flex-col h-full"
      @click="selectStream"
    >
      <div class="flex items-center justify-between bg-gray-100 p-4">
        <div class="flex items-center space-x-2">
          <img
            v-if="source && source.type"
            class="h-8 w-8 rounded-full"
            :src="logoSrc(source.type)"
            :alt="source.type + ' logo'"
          />
          <ChevronRightIcon class="h-6 w-6 text-gray-500" aria-hidden="true" />
          <img
            v-if="target && target.type"
            class="h-8 w-8 rounded-full"
            :src="logoSrc(target.type)"
            :alt="target.type + ' logo'"
          />
        </div>
        <span
          class="rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20"
        >
          {{ stream.mode }}
        </span>
      </div>
      <div class="flex-grow p-4 space-y-3 text-sm">
        <div class="text-gray-800 font-bold text-sm mb-2 truncate">
          {{ stream.name }}
        </div>
        <div class="text-xs text-gray-500 flex items-center">
          <span
            v-tooltip="isIdExpanded ? 'Collapse ID' : 'Expand ID'"
            class="break-all cursor-pointer"
            @click.stop="toggleIdExpansion"
          >
            ID: {{ displayedId }}
          </span>
          <button
            v-tooltip="'Copy full ID'"
            class="ml-1 text-gray-500 hover:text-gray-700"
            @click.stop="copyId"
          >
            <ClipboardIcon class="h-4 w-4" />
          </button>
        </div>
        <div>
          <span class="font-semibold text-gray-800">Source: </span>
          <span :class="{ 'text-red-500': !source || !source.name }">{{
            source?.name || 'N/A'
          }}</span>
          <span v-if="source && source.id" class="text-xs text-gray-500 ml-1"
            >({{ source.id }})</span
          >
        </div>
        <div>
          <span class="font-semibold text-gray-800">Target: </span>
          <span :class="{ 'text-red-500': !target || !target.name }">{{
            target?.name || 'N/A'
          }}</span>
          <span v-if="target && target.id" class="text-xs text-gray-500 ml-1"
            >({{ target.id }})</span
          >
        </div>
        <div class="flex flex-wrap items-start">
          <span class="font-semibold text-gray-800 mr-1">Tables: </span>
          <span>
            [{{ displayedTables.join(', ') }}{{ remainingTablesCount > 0 ? ', ...' : '' }}]
          </span>
          <span v-if="remainingTablesCount > 0" class="text-xs italic ml-1">
            ({{ remainingTablesCount }} more)
          </span>
        </div>
        <div class="text-gray-600 flex items-center">
          <CalendarIcon class="h-4 w-4 mr-1" aria-hidden="true" />
          <span class="font-normal pl-3">{{ streamCreated }}</span>
        </div>
      </div>
      <div class="mt-auto flex divide-x divide-gray-200">
        <div class="flex w-0 flex-1">
          <button
            v-tooltip="'Edit stream configuration'"
            type="button"
            class="relative -mr-px inline-flex w-0 flex-1 items-center justify-center gap-x-3 rounded-bl-lg border border-gray-300 py-4 text-sm text-gray-700 font-semibold bg-gray-100 hover:bg-gray-200"
            @click.stop="editStream"
          >
            <PencilIcon class="h-5 w-5 text-gray-700" aria-hidden="true" />
            Edit
          </button>
        </div>
        <div class="-ml-px flex w-0 flex-1">
          <ActionsMenu
            v-tooltip="'More stream actions'"
            class="relative inline-flex w-0 flex-1 items-center justify-center gap-x-3 border-gray-300 border-t border-l py-4 text-sm font-semibold bg-gray-100 hover:bg-gray-200"
            :position="actionsMenuPosition"
            @selectRow="selectStream"
            @editRow="editStream"
            @cloneRow="cloneStream"
            @deleteRow="deleteStream"
          />
        </div>
        <div class="-ml-px flex w-0 flex-1">
          <button
            v-tooltip="'Start the stream'"
            type="button"
            class="relative inline-flex w-0 flex-1 items-center justify-center gap-x-0 rounded-br-lg border-l border-t border-gray-300 py-4 text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200"
            @click.stop="startStream"
          >
            <PlayIcon class="h-5 w-5 text-green-700 mr-2" aria-hidden="true" />
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
  }
})
</script>
