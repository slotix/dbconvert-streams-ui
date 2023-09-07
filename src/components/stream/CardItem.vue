<template>
  <div class="max-w-sm w-full py-6">
    <div
      class="bg-white shadow-md rounded-lg overflow-hidden cursor-pointer transform hover:scale-105 duration-300 ease-in-out"
      @click="selectStream"
    >
      <div class="flex flex-wrap items-center bg-gray-100 p-4">
        <div class="item w-2/5 flex">
          <img
            v-if="source && source.type"
            class="h-8 w-8 rounded-full"
            :src="logoSrc(this.source.type)"
            :alt="source.type + ' logo'"
          />
          <div v-else class="h-8 w-8 rounded-full bg-red-400 flex items-center justify-center">
            <span class="text-white font-mono">x</span>
          </div>
          <ChevronRightIcon class="h-8 w-8 pt-1 text-gray-500" aria-hidden="true" />

          <img
            v-if="target && target.type"
            class="h-8 w-8 rounded-full"
            :src="logoSrc(this.target.type)"
            :alt="target.type + ' logo'"
          />
          <div v-else class="h-8 w-8 rounded-full bg-red-400 flex items-center justify-center">
            <span class="text-white font-mono">x</span>
          </div>
        </div>
        <span class="item w-3/5 uppercase truncate tracking-wide text-sm font-medium text-gray-800">
          {{ stream.id }}
        </span>
      </div>
      <div class="flex-auto px-4 pt-4 md:text-left w-full space-y-2 text-gray-500">
        <span class="mx-auto font-semibold text-gray-800">
          Source:
          <span class="font-normal pl-3" :class="{ 'text-red-500': !source || !source.name }">{{
            source && source.name ? source.name : 'N/A'
          }}</span>
        </span>
      </div>

      <div class="flex-auto px-4 pt-2 md:text-left w-full space-y-2 text-gray-500">
        <span class="mx-auto font-semibold text-gray-800">
          Target:
          <span class="font-normal pl-3" :class="{ 'text-red-500': !target || !target.name }">{{
            target && target.name ? target.name : 'N/A'
          }}</span>
        </span>
      </div>
      <div class="flex-auto px-4 pt-4 md:text-left w-full space-y-2 text-gray-500">
        <span class="mx-auto font-semibold text-gray-800">
          Mode:
          <span class="font-normal pl-3"> {{ stream.mode }}</span>
        </span>
      </div>
      <div class="px-4 pt-4 pb-4">
        <div class="flex items-center pt-2">
          <span class="inline-flex font-bold text-gray-600">
            <CalendarIcon class="h-6 w-6" aria-hidden="true" />
            <span class="font-normal pl-3"> {{ streamCreated }}</span>
          </span>
        </div>
      </div>
      <div class="-mt-px flex">
        <div class="-ml-px flex w-0 flex-1">
          <ActionsMenu
            class="relative inline-flex w-0 flex-1 items-center justify-center gap-x-3 rounded-bl-lg border-gray-300 border-t py-4 text-sm font-semibold bg-gray-100"
            :position="actionsMenuPosition"
            @selectRow="selectStream"
            @editRow="editStream"
            @cloneRow="cloneStream"
            @deleteRow="deleteStream"
          />
        </div>
        <!-- <router-link -->
        <!--   class="flex w-0 flex-1" -->
        <!--   :to="{ name: 'ManageStream', params: { mode: 'edit' } }" -->
        <!-- > -->
        <!--   <button -->
        <!--     type="button" -->
        <!--     class="relative -mr-px inline-flex w-0 flex-1 items-center justify-center gap-x-3 rounded-bl-lg border border-gray-500 py-4 text-sm font-semibold text-gray-200 bg-gray-600" -->
        <!--   > -->
        <!--     <PencilIcon class="h-5 w-5 text-gray-200" aria-hidden="true" /> -->
        <!--     Edit -->
        <!--   </button> -->
        <!-- </router-link> -->
        <!-- <div class="-ml-px flex w-0 flex-1"> -->
        <!--   <button -->
        <!--     type="button" -->
        <!--     class="relative inline-flex w-0 flex-1 items-center justify-center gap-x-3 border border-gray-500 py-4 text-sm font-semibold text-gray-200 bg-gray-600" -->
        <!--     @click="cloneStream" -->
        <!--   > -->
        <!--     <Square2StackIcon class="h-5 w-5 text-gray-200" aria-hidden="true" /> -->
        <!--     Clone -->
        <!--   </button> -->
        <!-- </div> -->
        <!-- <div class="-ml-px flex w-0 flex-1"> -->
        <!--   <button -->
        <!--     type="button" -->
        <!--     class="relative inline-flex w-0 flex-1 items-center justify-center gap-x-3 rounded-br-lg border border-transparent py-4 text-sm font-semibold text-red-600 bg-gray-200" -->
        <!--     @click="deleteStream" -->
        <!--   > -->
        <!--     <TrashIcon class="h-5 w-5 text-red-600" aria-hidden="true" /> -->
        <!--     Delete -->
        <!--   </button> -->
        <!-- </div> -->
        <div class="-ml-px flex w-0 flex-1">
          <button
            type="button"
            class="relative inline-flex w-0 flex-1 items-center justify-center gap-x-0 rounded-br-lg border-l border-t border-gray-300 py-4 text-sm font-semibold text-gray-700 bg-gray-100"
          >
            <PlayIcon class="h-6 w-6 text-gray-600 mr-5 ml-5" @selectRow="selectStream" />
            Start
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
<script>
import shared from './shared.js'
export default Object.assign({}, shared, {})
</script>
