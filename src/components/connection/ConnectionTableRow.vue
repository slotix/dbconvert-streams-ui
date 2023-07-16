<template class="hover:bg-gray-100">
  <!-- <div
    class=""
  > -->
  <!-- <span class="ring-gray-600 ring-2 border-transparent bg-red-400"> -->

  <td
    class="px-5 py-5 border-b border-gray-200 bg-white  cursor-pointer "
    @click="selectConnection"
    :class="{
      'bg-gradient-to-r from-white via-yellow-100 to-yellow-200':
        highlightSelected === 'source',
      'bg-gradient-to-r from-white via-green-100 to-green-200':
        highlightSelected === 'target'
    }"
  >
    <div class="flex items-center">
      <div class="flex-shrink-0">
        <img
          :src="logoSrc"
          :alt="connection.type + ' logo'"
          class="mx-auto object-cover rounded-full h-6 w-6 hidden md:table-cell"
        />
      </div>
      <div class="ml-3">
        <p class="text-gray-900 whitespace-no-wrap">
          {{ connection.name }}
        </p>
      </div>
    </div>
  </td>
  <td
    class="px-5 py-5 border-b border-gray-200 bg-white  cursor-pointer"
    @click="selectConnection"
    :class="{
      'bg-gradient-to-r from-yellow-200  to-yellow-300':
        highlightSelected === 'source',
      'bg-gradient-to-r from-green-200  to-green-300':
        highlightSelected === 'target'
    }"
  >
    <p class="text-gray-900 whitespace-no-wrap">
      {{ connection.database }}
    </p>
  </td>
  <td
    class="px-5 py-5 border-b border-gray-200 bg-white  cursor-pointer hidden lg:table-cell"
    @click="selectConnection"
    :class="{
      'bg-gradient-to-r from-yellow-300  to-yellow-400':
        highlightSelected === 'source',
      'bg-gradient-to-r from-green-300  to-green-400':
        highlightSelected === 'target'
    }"
  >
    <p class="text-gray-900 whitespace-no-wrap ">
      {{ connectionCreated }}
    </p>
  </td>
  <td
    class="px-5 py-5 border-b border-gray-200 bg-white  cursor-pointer"
    :class="{
      'bg-gradient-to-r from-yellow-400  to-yellow-400':
        highlightSelected === 'source',
      'bg-gradient-to-r from-green-400  to-green-400':
        highlightSelected === 'target'
    }"
  >
    <button
      class="text-indigo-600 hover:text-indigo-900"
      @click="editConnection"
    >
      Edit
    </button>
  </td>
  <td
    class="px-5 py-5 border-b border-gray-200 bg-white  cursor-pointer "
    :class="{
      'bg-gradient-to-r from-yellow-400  to-yellow-400':
        highlightSelected === 'source',
      'bg-gradient-to-r from-green-400  to-green-400':
        highlightSelected === 'target'
    }"
  >
    <button
      class="text-indigo-600 hover:text-indigo-900"
      @click="cloneConnection"
    >
      Clone
    </button>
  </td>
  <td
    class="px-5 py-5 border-b border-gray-200 bg-white  cursor-pointer "
    :class="{
      'bg-gradient-to-r from-yellow-400  to-yellow-400':
        highlightSelected === 'source',
      'bg-gradient-to-r from-green-400  to-green-400':
        highlightSelected === 'target'
    }"
  >
    <button
      class="text-indigo-600 hover:text-indigo-900"
      @click="deleteConn(connection.id)"
    >
      Delete
    </button>
  </td>
  <!-- </span> -->
  <!-- </div> -->
</template>

<script>
import connectionItemShared from "./connectionItemShared.js";
export default Object.assign({}, connectionItemShared);
</script>

<style></style>
