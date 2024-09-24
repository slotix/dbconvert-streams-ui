<template>
  <div class="max-w-sm w-full py-6">
    <div
      class="bg-white shadow-md rounded-lg overflow-hidden cursor-pointer transform hover:scale-105 duration-300 ease-in-out"
      @click="selectStream">
      <div class="flex items-center justify-between bg-gray-100 p-4">
        <div class="flex items-center">
          <img v-if="source && source.type" class="h-8 w-8 rounded-full" :src="logoSrc(source.type)"
            :alt="source.type + ' logo'" />
          <div v-else class="h-8 w-8 rounded-full bg-red-400 flex items-center justify-center">
            <span class="text-white font-mono">x</span>
          </div>
          <ChevronRightIcon class="h-8 w-8 pt-1 text-gray-500" aria-hidden="true" />
          <img v-if="target && target.type" class="h-8 w-8 rounded-full" :src="logoSrc(target.type)"
            :alt="target.type + ' logo'" />
          <div v-else class="h-8 w-8 rounded-full bg-red-400 flex items-center justify-center">
            <span class="text-white font-mono">x</span>
          </div>
        </div>
        <span
          class="rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
          {{ stream.mode }}
        </span>
      </div>
      <div class="px-4 pt-4 space-y-3 text-gray-500">
        <div class="text-lg font-semibold text-gray-800">
          ID: <span class="font-normal">{{ stream.id }}</span>
        </div>
        <div>
          <span class="font-semibold text-gray-800">Source: </span>
          <span :class="{ 'text-red-500': !source || !source.name }">{{ source && source.name ? source.name : 'N/A'
            }}</span>
        </div>
        <div>
          <span class="font-semibold text-gray-800">Target: </span>
          <span :class="{ 'text-red-500': !target || !target.name }">{{ target && target.name ? target.name : 'N/A'
            }}</span>
        </div>
        <div>
          <span class="font-semibold text-gray-800">Tables: </span>
          <span>{{ stream?.tables?.length ?? 0 }} </span>
        </div>
        <div class="text-sm text-gray-600 flex items-center pt-4">
          <CalendarIcon class="h-4 w-4 mr-1" aria-hidden="true" />
          {{ streamCreated }}
        </div>
      </div>
      <div class="mt-4 flex">
        <router-link class="flex w-0 flex-1" :to="{ name: 'ManageStream', params: { mode: 'edit' } }">
          <button type="button"
            class="relative -mr-px inline-flex w-0 flex-1 items-center justify-center gap-x-3 rounded-bl-lg border border-gray-300 py-4 text-sm text-gray-700 font-semibold bg-gray-100 hover:bg-gray-200"
            @click="editStream">
            <PencilIcon class="h-5 w-5 text-gray-700" aria-hidden="true" />
            Edit
          </button>
        </router-link>
        <div class="-ml-px flex w-0 flex-1">
          <ActionsMenu
            class="relative inline-flex w-0 flex-1 items-center justify-center gap-x-3 border-gray-300 border-t border-l py-4 text-sm font-semibold bg-gray-100 hover:bg-gray-200"
            :position="actionsMenuPosition" @selectRow="selectStream" @editRow="editStream" @cloneRow="cloneStream"
            @deleteRow="deleteStream" />
        </div>
        <div class="-ml-px flex w-0 flex-1">
          <button type="button"
            class="relative inline-flex w-0 flex-1 items-center justify-center gap-x-0 rounded-br-lg border-l border-t border-gray-300 py-4 text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200"
            @click="startStream">
            <PlayIcon class="h-5 w-5 text-green-700 mr-2 ml-2" aria-hidden="true" />
            Start
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import shared from './shared'
export default Object.assign({}, shared, {})
</script>