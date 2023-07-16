<template>
  <!-- <div class="flex items-center justify-center "> -->
  <div class="min-w-max max-w-sm w-full py-6 ">
    <div class="bg-white shadow-md rounded-lg overflow-hidden">
      <div class="flex flex-wrap items-center  bg-gray-100  p-4">
        <div class="item w-1/5 flex">
          <img
            class="h-10 w-10 rounded-full"
            :src="logoSrc"
            :alt="project.type + ' logo'"
          />
        </div>
        <p
          class="item w-4/5 uppercase truncate tracking-wide text-sm font-medium text-gray-700"
        >
          {{ project.name }}
        </p>
      </div>

      <div
        class="pl-4 pt-4 pr-4 md:text-left w-full space-y-2 text-gray-500 "
      ></div>

      <div class="px-4 pt-1 pb-4  ">
        <div class="flex items-center pt-2">
          <div>
            <p class="inline-flex font-bold text-gray-600">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              <span class="font-normal  pl-3"> {{ projectCreated }}</span>
            </p>
          </div>
        </div>
      </div>
      <div
        class="flex flex-wrap space-y-4 sm:space-y-0 justify-between p-4 sm:pl-1   text-gray-700 bg-gray-100"
      >
        <button
          class="w-full inline-flex  rounded-md border border-transparent shadow-sm px-4 py-2 bg-gray-600 text-base font-medium text-white hover:bg-gray-700  focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 sm:ml-3 sm:w-auto sm:text-sm"
          @click="editProject"
        >
          Edit
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-4 w-4 text-white ml-2"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
            />
          </svg>
        </button>
        <button
          class="w-full inline-flex  rounded-md border border-transparent shadow-sm px-4 py-2 bg-gray-600 text-base font-medium text-white hover:bg-gray-700  focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 sm:ml-3 sm:w-auto sm:text-sm"
          @click="cloneProject"
        >
          Clone
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-4 w-4 text-white ml-2"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
            />
          </svg>
        </button>
        <button
          class="w-full inline-flex  rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700  focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm"
          @click="deleteConnection(project.id)"
        >
          Delete
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-4 w-4 text-white ml-2"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
            />
          </svg>
        </button>
      </div>
    </div>
  </div>
  <!-- </div> -->
</template>

<script>
import { mapGetters, mapActions } from "vuex";
export default {
  props: {
    project: {
      type: Object,
      required: true
    }
  },
  computed: {
    ...mapGetters(["projectTypes"], "currentProject"),
    logoSrc() {
      let projectType = this.projectTypes.filter(f => {
        return f.type === this.project.type;
      });
      return projectType[0].logo;
    },
    projectCreated() {
      let date = new Date(this.project.id);
      return date.toLocaleDateString() + " - " + date.toLocaleTimeString();
      //return date.toUTCString();
    }
  },
  methods: {
    ...mapActions([
      "deleteProject",
      "setCurrentProject",
      "cloneCurrentProject"
    ]),
    editProject() {
      this.setCurrentProject(this.project.id);
      //this.toggleEditConnectionDialog();
    },
    cloneProject() {
      this.setCurrentProject(this.project.id);
      this.cloneCurrentProject();
      //   this.toggleEditConnectionDialog();
    }
  }
};
</script>

<style></style>
