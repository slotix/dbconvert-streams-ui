<template>
  <td class="px-5 py-5" @click="selectStream">
    <div class="flex items-center">
      <div class="item w-2/5 flex">
        <img
          v-if="source && source.type"
          class="h-6 w-6 rounded-full"
          :src="logoSrc(this.source.type)"
          :alt="source.type + ' logo'"
        />

        <div v-else class="h-6 w-6 rounded-full bg-red-400 flex items-center justify-center">
          <span class="text-white font-mono">x</span>
        </div>
        <ChevronRightIcon class="h-6 w-6 pt-1 text-gray-500" aria-hidden="true" />
        <img
          v-if="target && target.type"
          class="h-6 w-6 rounded-full"
          :src="logoSrc(this.target.type)"
          :alt="target.type + ' logo'"
        />
        <div v-else class="h-6 w-6 rounded-full bg-red-400 flex items-center justify-center">
          <span class="text-white font-mono">x</span>
        </div>
      </div>
      <span class="ml-3 text-gray-900 font-medium whitespace-no-wrap">
        {{ stream.id }}
      </span>
    </div>
  </td>
  <td class="hidden px-5 py-5 lg:table-cell" @click="selectStream">
    <span class="text-gray-600 whitespace-no-wrap">
      {{ stream.mode }}
    </span>
  </td>
  <td class="hidden px-5 py-5 lg:table-cell" @click="selectStream">
    <span
      class="text-gray-600 whitespace-no-wrap"
      :class="{ 'text-red-500': !source || !source.name }"
    >
      {{ source && source.name ? source.name : 'N/A' }}
    </span>
  </td>
  <td class="hidden px-5 py-5 lg:table-cell" @click="selectStream">
    <span
      class="text-gray-600 whitespace-no-wrap"
      :class="{ 'text-red-500': !target || !target.name }"
    >
      {{ target && target.name ? target.name : 'N/A' }}
    </span>
  </td>
  <td class="hidden px-5 py-5 lg:table-cell" @click="selectStream">
    <span class="text-gray-600 whitespace-no-wrap">
      {{ streamCreated }}
    </span>
  </td>
  <td class="px-5 py-5">
    <ActionsMenu
      :position="actionsMenuPosition"
      @selectRow="selectStream"
      @editRow="editStream"
      @cloneRow="cloneStream"
      @deleteRow="deleteStream"
    />
  </td>

  <td class="px-5 py-5">
    <PlayIcon class="h-6 w-6 text-gray-600" @selectRow="selectStream" @click="startStream" />
  </td>
</template>

<script>
import shared from './shared.js'
export default Object.assign({}, shared, {})
</script>
