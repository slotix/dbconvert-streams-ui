<template class="hover:bg-gray-100">
  <td
    class="px-5 py-5 border-b border-gray-200 bg-white cursor-pointer"
    @click="selectStream"
    :class="{
      'bg-gradient-to-r from-white via-yellow-100 to-yellow-200': highlightSelected === 'source',
      'bg-gradient-to-r from-white via-green-100 to-green-200': highlightSelected === 'target'
    }"
  >
    <div class="flex items-center">
      <div class="flex-shrink-0">
        <img
          :src="logoSrc"
          :alt="stream.type + ' logo'"
          class="mx-auto object-cover rounded-full h-6 w-6 hidden md:table-cell"
        />
      </div>
      <span class="ml-3 text-gray-900 font-medium whitespace-no-wrap">
        {{ stream.name }}
      </span>
    </div>
  </td>
  <td
    class="hidden px-5 py-5 border-b border-gray-200 bg-white cursor-pointer lg:table-cell"
    @click="selectStream"
    :class="{
      'bg-gradient-to-r from-yellow-200  to-yellow-300': highlightSelected === 'source',
      'bg-gradient-to-r from-green-200  to-green-300': highlightSelected === 'target'
    }"
  >
    <span class="text-gray-600 whitespace-no-wrap">
      {{ concatenateValues }}
    </span>
  </td>
  <td
    class="hidden px-5 py-5 border-b border-gray-200 bg-white cursor-pointer lg:table-cell"
    @click="selectStream"
    :class="{
      'bg-gradient-to-r from-yellow-200  to-yellow-300': highlightSelected === 'source',
      'bg-gradient-to-r from-green-200  to-green-300': highlightSelected === 'target'
    }"
  >
    <span class="text-gray-600 whitespace-no-wrap">
      {{ stream.database }}
    </span>
  </td>
  <td
    class="hidden px-5 py-5 border-b border-gray-200 bg-white cursor-pointer lg:table-cell"
    @click="selectStream"
    :class="{
      'bg-gradient-to-r from-yellow-300  to-yellow-400': highlightSelected === 'source',
      'bg-gradient-to-r from-green-300  to-green-400': highlightSelected === 'target'
    }"
  >
    <span class="text-gray-600 whitespace-no-wrap">
      {{ streamCreated }}
    </span>
  </td>
  <td
    class="px-5 py-5 border-b border-gray-200 bg-white cursor-pointer"
    :class="{
      'bg-gradient-to-r from-yellow-400  to-yellow-400': highlightSelected === 'source',
      'bg-gradient-to-r from-green-400  to-green-400': highlightSelected === 'target'
    }"
  >
    <button class="text-indigo-600 hover:text-indigo-900" @click="editStream">
      Edit<span class="sr-only">, {{ stream.name }}</span>
    </button>
  </td>
  <td
    class="px-5 py-5 border-b border-gray-200 bg-white cursor-pointer"
    :class="{
      'bg-gradient-to-r from-yellow-400  to-yellow-400': highlightSelected === 'source',
      'bg-gradient-to-r from-green-400  to-green-400': highlightSelected === 'target'
    }"
  >
    <button class="text-indigo-600 hover:text-indigo-900" @click="cloneStream">
      Clone<span class="sr-only">, {{ stream.name }}</span>
    </button>
  </td>
  <td
    class="px-5 py-5 border-b border-gray-200 bg-white cursor-pointer"
    :class="{
      'bg-gradient-to-r from-yellow-400  to-yellow-400': highlightSelected === 'source',
      'bg-gradient-to-r from-green-400  to-green-400': highlightSelected === 'target'
    }"
  >
    <button class="text-indigo-600 hover:text-indigo-900" @click="deleteConn(stream.id)">
      Delete<span class="sr-only">, {{ stream.name }}</span>
    </button>
  </td>
</template>

<script>
// import shared from './shared.js'
// export default Object.assign({}, shared, {
export default {
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
}
// })
</script>

<style></style>
