<template>
  <div class="max-w-sm w-full py-6 ">
    <div class="bg-white shadow-md rounded-lg overflow-hidden">
      <div
        class=" bg-gray-100  p-6 tracking-wide uppercase text-sm font-medium text-gray-700"
      >
        Create new database connection
      </div>
      <div class="flex justify-center">
        <img
          class="mt-3 mb-2 h-20 w-20 rounded-full"
          :src="'src/assets/images/connections/new-connection.svg'"
          alt="Create database connection"
        />
      </div>
      <div
        class="flex flex-wrap space-y-4 sm:space-y-0 justify-between p-4 sm:pl-1   text-gray-700 bg-gray-100"
      >
        <button
          type="button"
          @click="addConnection"
          class=" flex-auto  w-full align-middle justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-gray-600 text-base font-medium text-white hover:bg-gray-700  focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 sm:ml-3 sm:w-auto sm:text-sm"
        >
          New Connection
        </button>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: "ConnectionCardNew",
  emits: {
    add: null
  },
  methods: {
    addConnection() {
      this.$emit("add");
    }
  }
};
</script>

<style></style>
