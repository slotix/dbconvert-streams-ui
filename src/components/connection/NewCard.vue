<template>
  <div class="w-full py-6">
    <div
      class="bg-white shadow-md rounded-lg overflow-hidden cursor-pointer transform hover:scale-105 duration-300 ease-in-out flex flex-col h-full"
      @click="addConnection">
      <div class="flex-grow flex flex-col p-10 justify-center items-center">
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