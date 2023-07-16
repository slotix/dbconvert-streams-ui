<template>
  <connection-popup
    :is-open="isPopupOpen"
    :isShowActionBtns="showActionBtns"
    @ok="save"
    @close="close"
  >
    <template #title>
      Add Database Connection
    </template>
    <template #dbtypes-combo>
      <!-- dbTypes combo for mobiles  -->
      <div class="mx-auto flex-auto items-center">
        <div class="w-full md:flex lg:hidden">
          <div class="mt-1 relative">
            <button
              type="button"
              class="relative rounded-lg border border-gray-300 w-full pr-10 py-2 px-4 bg-white text-gray-700 placeholder-gray-400 text-base focus:outline-none focus:ring-2 focus:ring-gray-600 focus:border-transparent sm:w-auto sm:text-sm"
              @click="showDBCombo = !showDBCombo"
            >
              <span v-if="selectedDB" class="flex items-center">
                <img
                  class="h-6 w-6 rounded-full "
                  :src="selectedDB.logo"
                  :alt="selectedDB.type + ' logo'"
                />
                <span class="ml-3 block truncate">
                  {{ selectedDB.type }}
                </span>
              </span>
              <span v-else class="text-gray-400">
                Select database
              </span>
              <span
                class="ml-3 absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none"
              >
                <svg
                  class="h-5 w-5 text-gray-400"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path
                    fill-rule="evenodd"
                    d="M10 3a1 1 0 01.707.293l3 3a1 1 0 01-1.414 1.414L10 5.414 7.707 7.707a1 1 0 01-1.414-1.414l3-3A1 1 0 0110 3zm-3.707 9.293a1 1 0 011.414 0L10 14.586l2.293-2.293a1 1 0 011.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z"
                    clip-rule="evenodd"
                  ></path>
                </svg>
              </span>
            </button>
            <div
              v-show="showDBCombo"
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
                  v-for="connection in dbTypes"
                  :key="connection.type"
                  @click="
                    selectDB(connection);
                    showDBCombo = !showDBCombo;
                  "
                  role="option"
                  class="text-gray-900 cursor-default hover:bg-gray-500 hover:text-white select-none relative py-2 pl-3 "
                >
                  <div class="flex items-center">
                    <img
                      class="h-6 w-6 rounded-full"
                      :src="connection.logo"
                      :alt="connection.type + ' logo'"
                    />
                    <span class="ml-3 block font-normal ">
                      {{ connection.type }}
                    </span>
                  </div>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </template>
    <template #dbtypes-navbar>
      <!-- dbTypes navbar  -->
      <div class="mx-auto mt-10">
        <div class="w-58 hidden lg:flex">
          <nav class="px-6">
            <a
              v-for="connection in dbTypes"
              :key="connection.type"
              @click="selectDB(connection)"
              class="hover:text-gray-800 hover:bg-gray-100 flex items-center p-2 my-0 transition-colors dark:hover:text-white dark:hover:bg-gray-600 duration-200  text-gray-600 dark:text-gray-400 rounded-lg  "
              :class="{
                'text-gray-800 bg-gray-100 dark:text-white dark:bg-gray-600':
                  selectedDB === connection
              }"
            >
              <img
                class="h-8 w-8 rounded-full"
                :src="connection.logo"
                :alt="connection.type + ' logo'"
              />
              <span class="mx-4 text-lg font-normal">
                {{ connection.type }}
              </span>
            </a>
          </nav>
        </div>
      </div>
    </template>
    <template #connection-params>
      <connection-params v-if="selectedDB" :connectionType="selectedDB.type" />
    </template>
    <template #confirmButton>
      Save
    </template>
  </connection-popup>
</template>

<script>
import ConnectionPopup from "./ConnectionPopup.vue";
import ConnectionParams from "./params/ConnectionParams.vue";
import { mapGetters, mapActions } from "vuex";
export default {
  name: "ConnectionAdd",
  components: {
    ConnectionPopup,
    ConnectionParams
  },
  props: {
    isOpen: {
      type: Boolean,
      required: true
    }
  },
  emits: {
    close: null
  },
  data: () => ({
    isPopupOpen: false,
    selectedDB: null,
    showDBCombo: false
  }),
  provide: {
    //Edit or add connection
    isNewConnection: true
  },
  watch: {
    isOpen() {
      this.isPopupOpen = this.isOpen;
    }
  },
  computed: {
    ...mapGetters(["dbTypes"]),
    showActionBtns() {
      if (this.selectedDB === null) {
        return false;
      }
      return true;
    }
  },
  methods: {
    ...mapActions(["saveConnection", "refreshConnections"]),
    selectDB(conn) {
      this.selectedDB = conn;
    },
    async save() {
      try {
        await this.saveConnection();
        await this.refreshConnections();
      } catch (e) {
        console.log(e);
      }
    },
    // add() {
    //   this.isPopupOpen = true;
    // },
    close() {
      //  this.isPopupOpen = false;
      this.$emit("close");
    }
  }
};
</script>

<style></style>
