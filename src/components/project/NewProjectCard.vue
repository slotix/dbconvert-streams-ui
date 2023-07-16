<template>
  <div class="max-w-sm w-full py-6 ">
    <div class="bg-white shadow-md rounded-lg overflow-hidden">
      <div
        class=" bg-gray-100  p-6 tracking-wide uppercase text-sm font-medium text-gray-700"
      >
        Create new project
      </div>
      <div class="flex justify-center">
        <img
          class="mt-3 mb-2 h-20 w-20 rounded-full"
          :src="require('@/assets/images/projects/copy-data.svg')"
          alt="Create database migration project"
        />
      </div>

      <router-link :to="{ name: 'AddProject' }">
        <div
          class="flex flex-wrap space-y-4 sm:space-y-0 justify-between p-4 sm:pl-1   text-gray-700 bg-gray-100"
        >
          <button
            type="button"
            @click="createProject"
            class=" flex-auto  w-full align-middle justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-gray-600 text-base font-medium text-white hover:bg-gray-700  focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 sm:ml-3 sm:w-auto sm:text-sm"
          >
            New Project
          </button>
        </div>
      </router-link>
    </div>
  </div>
</template>

<script>
import { mapActions } from "vuex";
export default {
  name: "NewProjectCard",

  methods: {
    ...mapActions(["toggleAddConnectionDialog"])
  }
};
</script>

<style></style>
