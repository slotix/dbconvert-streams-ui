<template>
  <td class="px-5 py-5 border-b border-gray-200 bg-white">
    <div class="flex items-center">
      <div class="flex-shrink-0">
        <a href="#" class="block relative">
          <img
            :src="'src/assets/images/connections/new-connection.svg'"
            alt="Create database connection"
            class="mx-auto object-cover rounded-full h-8 w-8 "
          />
        </a>
      </div>
      <div class="ml-3">
        <p class="text-gray-900 whitespace-no-wrap font-medium">
          Create New DB Connection
        </p>
      </div>
    </div>
  </td>
  <td class="px-5 py-5 border-b border-gray-200 bg-white"></td>
  <td class="px-5 py-5 border-b border-gray-200 bg-white"></td>
  <td class="px-5 py-5 border-b border-gray-200 bg-white" colspan="3">
    <button
      class="text-indigo-600 hover:text-indigo-900 font-medium"
      @click="addConnection"
    >
      New Connection
      <svg
        class="inline h-6 w-6"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    </button>
  </td>
</template>

<script>
export default {
  name: "ConnectionTableRowNew",
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
