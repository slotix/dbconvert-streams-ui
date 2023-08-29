<template >
  <td class="px-5 py-5" @click="selectConnection">
    <div class="flex items-center">
      <div class="flex-shrink-0">
        <img
          :src="logoSrc"
          :alt="connection.type + ' logo'"
          class="mx-auto object-cover rounded-full h-6 w-6 hidden md:table-cell"
        />
      </div>
      <span class="ml-3 text-gray-900 font-medium whitespace-no-wrap">
        {{ connection.name }}
      </span>
    </div>
  </td>
  <td class="hidden px-5 py-5 lg:table-cell" @click="selectConnection">
    <span class="text-gray-600 whitespace-no-wrap">
      {{ concatenateValues }}
    </span>
  </td>
  <td class="hidden px-5 py-5 lg:table-cell" @click="selectConnection">
    <span class="text-gray-600 whitespace-no-wrap">
      {{ connection.database }}
    </span>
  </td>
  <td class="hidden px-5 py-5 lg:table-cell" @click="selectConnection">
    <span class="text-gray-600 whitespace-no-wrap">
      {{ connectionCreated }}
    </span>
  </td>
  <td class="px-5 py-5">
    <button class="text-gray-600 hover:text-gray-900" @click="editConnection">
      Edit<span class="sr-only">, {{ connection.name }}</span>
    </button>
  </td>
  <td class="px-5 py-5">
    <button class="text-gray-600 hover:text-gray-900" @click="cloneConnection">
      Clone<span class="sr-only">, {{ connection.name }}</span>
    </button>
  </td>
  <td class="px-5 py-5">
    <button class="text-gray-600 hover:text-gray-900" @click="deleteConn(connection.id)">
      Delete<span class="sr-only">, {{ connection.name }}</span>
    </button>
  </td>
</template>

<script>
import shared from './shared.js'
export default Object.assign({}, shared, {
  props: {
    connection: {
      type: Object,
      required: true
    },
    isStreamsTab: {
      type: Boolean,
      required: true,
      default: true
    }
  },
})
</script>
