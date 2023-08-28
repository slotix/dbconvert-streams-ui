<template>
  <td class="px-5 py-5" @click="selectStream">
    <div class="flex items-center">
      <div class="item w-2/5 flex">
        <img
          class="h-6 w-6 rounded-full"
          :src="logoSrc(this.source.type)"
          :alt="source.type + ' logo'"
        />
        <ChevronRightIcon class="h-6 w-6 pt-1 text-gray-500" aria-hidden="true" />
        <img
          class="h-6 w-6 rounded-full"
          :src="logoSrc(this.target.type)"
          :alt="target.type + ' logo'"
        />
      </div>
      <span class="ml-3 text-gray-900 font-medium whitespace-no-wrap">
        {{ stream.id }}
      </span>
    </div>
  </td>
  <td class="hidden px-5 py-5 lg:table-cell" @click="selectStream">
    <span class="text-gray-600 whitespace-no-wrap">
      {{ source.name }}
    </span>
  </td>
  <td class="hidden px-5 py-5 lg:table-cell" @click="selectStream">
    <span class="text-gray-600 whitespace-no-wrap">
      {{ target.name }}
    </span>
  </td>
  <td class="hidden px-5 py-5 lg:table-cell" @click="selectStream">
    <span class="text-gray-600 whitespace-no-wrap">
      {{ streamCreated }}
    </span>
  </td>
  <td class="px-5 py-5">
    <button class="text-gray-600 hover:text-gray-900" @click="editStream">
      Edit<span class="sr-only">, {{ stream.id }}</span>
    </button>
  </td>
  <td class="px-5 py-5">
    <button class="text-gray-600 hover:text-gray-900" @click="cloneStream">
      Clone<span class="sr-only">, {{ stream.id }}</span>
    </button>
  </td>
  <td class="px-5 py-5">
    <button class="text-gray-600 hover:text-gray-900" @click="deleteStream(stream.id)">
      Delete<span class="sr-only">, {{ stream.id }}</span>
    </button>
  </td>
</template>

<script>
import shared from './shared.js'
export default Object.assign({}, shared, {})
</script>
