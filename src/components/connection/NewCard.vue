<template>
  <div class="w-full py-6">
    <div
      class="bg-white shadow-md rounded-lg overflow-hidden cursor-pointer transform hover:scale-105 duration-300 ease-in-out flex flex-col h-full"
      @click="addConnection">
      <div class="flex flex-wrap items-center bg-gray-100 p-4">
        <div class="item w-1/5 flex">
          <img class="h-8 w-8 rounded-full" src="/images/connections/new-connection.svg" alt="Create new connection" />
        </div>
        <div class="item w-4/5 flex flex-col">
          <span class="uppercase truncate tracking-wide text-sm font-medium text-gray-800">
            Create new database connection
          </span>
        </div>
      </div>
      <div class="flex-grow flex flex-col p-4 justify-center items-center">
        <img class="w-20 h-20 mb-10" src="/images/connections/new-connection.svg" alt="Create database connection" />
        <p class="text-gray-600 text-center mb-4">
          Click here to add a new database connection
        </p>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import shared from './shared'
export default Object.assign({}, shared)
</script>