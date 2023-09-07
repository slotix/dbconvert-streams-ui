<template>
  <div class="max-w-sm w-full py-6">
    <div class="bg-white shadow-md rounded-lg overflow-hidden">
      <div class="bg-gray-100 p-6 tracking-wide uppercase text-sm font-medium text-gray-700">
        Create new database connection
      </div>
      <div class="flex justify-center">
        <img
          class="mt-5 mb-6  w-20 rounded-full"
          :src="'/images/connections/new-connection.svg'"
          alt="Create database connection"
        />
      </div>
      <div class="flex flex-wrap text-gray-700 bg-gray-100">
        <button
          type="button"
          @click="addConnection"
          class="relative -mr-px inline-flex w-0 flex-1 items-center justify-center gap-x-3 rounded-bl-lg rounded-br-lg border border-gray-300 py-4 text-sm font-semibold text-gray-600 bg-gray-100"
        >
          Add Connection
        </button>
      </div>
    </div>
  </div>
</template>
<script>
import shared from './shared.js'
export default Object.assign({}, shared )
</script>
