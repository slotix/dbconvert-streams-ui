<template>
  <base-layout>
    <template #header>
      <div
        class="flex flex-wrap justify-between space-y-4 sm:space-y-0 max-w-7xl mx-auto py-6 px-8"
      >
        <h1 class="header">
          {{ projectsCount }} Projects.
        </h1>
      </div>
    </template>
    <template #default>
      <div class="antialiased bg-gray-200">
        <div
          class="flex flex-wrap gap-x-3  space-y-0 max-w-7xl mx-auto py-6 px-8  "
        >
          <div class="flex-start">
            <div class="relative">
              <button
                type="button"
                class="relative rounded-lg border border-gray-300 w-full pr-10 py-2 px-4 bg-white text-gray-700 placeholder-gray-400 text-base focus:outline-none focus:ring-2 focus:ring-gray-600 focus:border-transparent sm:w-auto sm:text-sm"
                @click="showProjectsCombo = !showProjectsCombo"
              >
                <span v-if="filter" class="flex items-center">
                  <img
                    class="h-6 w-6 rounded-full "
                    :src="filter.imgSmall"
                    :alt="filter.type + ' type'"
                  />
                  <span class="ml-3 block truncate">
                    {{ filter.type }}
                  </span>
                </span>
                <span v-else class="text-gray-400">
                  Filter projects
                </span>
                <span
                  class="ml-3 absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    class="h-5 w-5 text-gray-400"
                    fill="none"
                    stroke-width="2"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
                    />
                  </svg>
                </span>
              </button>
              <div
                v-show="showProjectsCombo"
                class="absolute mt-1 w-full z-10 rounded-md bg-white shadow-lg"
              >
                <ul
                  tabindex="-1"
                  role="listbox"
                  aria-labelledby="listbox-label"
                  aria-activedescendant="listbox-item-3"
                  class=" max-h-56 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none md:text-sm"
                >
                  <li
                    @click="filterProjects(null)"
                    role="option"
                    class="text-gray-900 cursor-default hover:bg-gray-500 hover:text-white select-none relative py-2 pl-3 "
                  >
                    <div class="flex items-center ml-3 font-normal ">
                      All Projects
                    </div>
                  </li>
                  <li
                    v-for="p in projectTypes"
                    :key="p.type"
                    @click="filterProjects(p)"
                    role="option"
                    class="text-gray-900 cursor-default hover:bg-gray-500 hover:text-white select-none relative py-2 pl-3 "
                  >
                    <div class="flex items-center">
                      <img
                        class="h-6 w-6 rounded-full"
                        :src="p.imgSmall"
                        :alt="p.type + ' type'"
                      />
                      <span class="ml-3 block font-normal ">
                        {{ p.type }}
                      </span>
                    </div>
                  </li>
                </ul>
              </div>
            </div>
          </div>
          <div class="flex flex-start">
            <button
              type="button"
              class="w-full inline-flex  rounded-l-md border border-gray-300 px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none"
              :class="{ 'ring-2 ring-inset ring-gray-500': cardsView }"
              @click="toggleView"
            >
              Cards
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-6 w-6 ml-2"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="1.5"
                  d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
                />
              </svg>
            </button>
            <button
              type="button"
              class=" w-full inline-flex  rounded-r-md border border-gray-300 px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none"
              :class="{ 'ring-2 ring-inset ring-gray-500': !cardsView }"
              @click="toggleView"
            >
              Table
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-6 w-6 ml-2"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="1.5"
                  d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
            </button>
          </div>
        </div>
        <div
          class="flex flex-wrap max-w-7xl mx-auto px-4 overflow-hidden"
          v-show="cardsView"
        >
          <div class="my-3 w-full px-4 overflow-hidden md:w-1/2 lg:w-1/3">
            <new-project-card />
          </div>
          <div
            class="my-3 w-full px-4 overflow-hidden md:w-1/2 lg:w-1/3"
            v-for="project in projectsByType"
            :key="project.id"
          >
            <project-item :project="project" />
          </div>
        </div>
        <div class="flex flex-wrap mx-6 overflow-hidden" v-show="!cardsView">
          <project-table :connections="projectsByType" />
        </div>
      </div>
    </template>
  </base-layout>
</template>
<script>
import { mapGetters, mapActions, mapMutations } from "vuex";
import BaseLayout from "../../BaseLayout";
import NewProjectCard from "./NewProjectCard.vue";
export default {
  name: "Projects",
  components: {
    BaseLayout,
    NewProjectCard
  },
  data: () => ({
    showProjectsCombo: false,
    filter: null,
    cardsView: true
  }),
  methods: {
    ...mapActions(["getProjects"]),
    ...mapMutations(["SET_FILTER"]),
    filterProjects(p) {
      this.filter = p;
      this.showProjectsCombo = !this.showProjectsCombo;
    },
    toggleView() {
      this.cardsView = !this.cardsView;
    }
  },
  computed: {
    ...mapGetters(["projectsByType", "projectTypes"]),
    projectsCount() {
      return this.projectsByType.length;
    }
  },
  watch: {
    filter() {
      if (this.filter == null) {
        this.SET_FILTER("");
        return;
      }
      this.SET_FILTER(this.filter.type);
    }
  },
  async mounted() {
    await this.getProjects();
  }
};
</script>
