<template>
  <td class="px-5 py-5" @click="selectStream">
    <div class="flex items-center">
      <div class="flex-auto">
        <div class="item flex">
          <img
            v-if="source && source.type"
            class="h-6 w-6 rounded-full"
            :src="logoSrc(source.type)"
            :alt="source.type + ' logo'"
          />
          <div v-else class="h-6 w-6 rounded-full bg-red-400 flex items-center justify-center">
            <span class="text-white font-mono">x</span>
          </div>
          <ChevronRightIcon class="h-6 w-6 pt-1 text-gray-500" aria-hidden="true" />
          <img
            v-if="target && target.type"
            class="h-6 w-6 rounded-full"
            :src="logoSrc(target.type)"
            :alt="target.type + ' logo'"
          />
          <div v-else class="h-6 w-6 rounded-full bg-red-400 flex items-center justify-center">
            <span class="text-white font-mono">x</span>
          </div>
          <div
            class="ml-8 rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20"
          >
            {{ streamConfig.mode }}
          </div>
        </div>
        <div class="flex items-start gap-x-3 mt-3">
          <div class="text-sm font-medium leading-6 text-gray-900">
            {{ streamConfig.name || 'Unnamed Stream' }}
          </div>
        </div>
        <div class="mt-1 text-xs leading-5 text-gray-500 flex items-center">
          <span
            v-tooltip="isIdExpanded ? 'Collapse ID' : 'Expand ID'"
            class="cursor-pointer"
            @click.stop="toggleIdExpansion"
          >
            ID: {{ displayedId }}
          </span>
          <button
            v-tooltip="'Copy full ID'"
            class="ml-2 text-gray-500 hover:text-gray-700"
            @click.stop="copyId"
          >
            <ClipboardIcon class="h-4 w-4" />
          </button>
        </div>
        <div class="mt-1 text-xs leading-5 text-gray-500">{{ streamCreated }}</div>
      </div>
    </div>
  </td>
  <td class="hidden px-5 py-5 lg:table-cell" @click="selectStream">
    <span
      class="text-gray-600 whitespace-no-wrap"
      :class="{ 'text-red-500': !source || !source.name }"
    >
      {{ source?.name || 'N/A' }}
      <span v-if="source && source.id" class="text-xs text-gray-500 ml-1">{{ source.id }}</span>
    </span>
  </td>
  <td class="hidden px-5 py-5 lg:table-cell" @click="selectStream">
    <span
      class="text-gray-600 whitespace-no-wrap"
      :class="{ 'text-red-500': !target || !target.name }"
    >
      {{ target?.name || 'N/A' }}
      <span v-if="target && target.id" class="text-xs text-gray-500 ml-1">{{ target.id }}</span>
    </span>
  </td>
  <td class="px-5 py-5">
    <PencilIcon class="h-5 w-5 text-gray-700" @click="editStream" @selectRow="selectStream" />
  </td>

  <td class="px-5 py-5">
    <ActionsMenu
      :position="actionsMenuPosition"
      @selectRow="selectStream"
      @editRow="editStream"
      @cloneRow="cloneStreamConfig"
      @deleteRow="deleteStreamConfig"
    />
  </td>

  <td class="px-5 py-5">
    <PlayIcon class="h-6 w-6 text-green-700" @selectRow="selectStream" @click="startStream" />
  </td>
</template>

<script>
import { PencilIcon, ClipboardIcon, PlayIcon } from '@heroicons/vue/20/solid'
import shared from './shared'
import { vTooltip } from '@/directives/tooltip'

export default Object.assign({}, shared, {
  directives: {
    tooltip: vTooltip
  }
})
</script>
