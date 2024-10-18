<template>
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
        <span v-if="connection.id" class="text-xs text-gray-500 ml-1">{{ connection.id }}</span>
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
      <span v-if="connection.schema" class="text-xs text-gray-500 ml-1">{{
        connection.schema
      }}</span>
    </span>
  </td>
  <td class="hidden px-5 py-5 lg:table-cell" @click="selectConnection">
    <span class="text-gray-600 whitespace-no-wrap">
      {{ connectionCreated }}
    </span>
  </td>
  <td class="px-5 py-5">
    <button class="text-blue-500 hover:underline" @click="editConnection">
      <PencilIcon class="mr-3 h-5 w-5 text-gray-600 group-hover:text-gray-500" aria-hidden="true" />
      <span class="sr-only">, {{ connection.name }}</span>
    </button>
  </td>
  <!-- <td class="px-5 py-5"> -->
  <!--   <button class="text-blue-500 hover:underline" @click="cloneConnection"> -->
  <!--     Clone<span class="sr-only">, {{ connection.name }}</span> -->
  <!--   </button> -->
  <!-- </td> -->
  <!-- <td class="px-5 py-5"> -->
  <!--   <button class="text-blue-500 hover:underline" @click="deleteConn(connection.id)"> -->
  <!--     Delete<span class="sr-only">, {{ connection.name }}</span> -->
  <!--   </button> -->
  <!-- </td> -->
  <td class="px-5 py-5">
    <ActionsMenu
      :position="actionsMenuPosition"
      @selectRow="selectConnection"
      @editRow="editConnection"
      @cloneRow="cloneConnection"
      @deleteRow="deleteConn"
    />
    <!-- <button class="text-blue-500 hover:underline" @click="cloneConnection"> -->
    <!--   Clone<span class="sr-only">, {{ connection.name }}</span> -->
    <!-- </button> -->
  </td>
</template>

<script>
import ActionsMenu from '@/components/common/ActionsMenu.vue'
import shared from './shared'
import { PencilIcon } from '@heroicons/vue/20/solid'
export default Object.assign({}, shared, {
  props: {
    connection: {
      type: Object,
      required: true
    }
  },
  components: {
    ActionsMenu,
    PencilIcon
  }
})
</script>
