<template>
  <div
    v-if="isOpen"
    class="fixed z-10 inset-0 overflow-y-auto"
    aria-labelledby="Add or Edit database connection"
    role="dialog"
    aria-modal="true"
    tabindex="0"
    ref="modal"
  >
    <form
      @submit.prevent="submit"
      class="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0"
    >
      <!--
      Background overlay, show/hide based on modal state.

      Entering: "ease-out duration-300"
        From: "opacity-0"
        To: "opacity-100"
      Leaving: "ease-in duration-200"
        From: "opacity-100"
        To: "opacity-0"
    -->
      <transition
        enter-active-class="transition ease-out duration-300"
        enter-from-class="transform opacity-0"
        enter-to-class="transform opacity-100"
        leave-active-class="transition ease-in duration-200"
        leave-from-class="transform opacity-100"
        leave-to-class="transform opacity-0"
      >
        <!-- backdrop -->
        <div
          class="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          aria-hidden="true"
          @click="close"
        ></div>
      </transition>
      <!-- This element is to trick the browser into centering the modal contents. -->
      <span
        class="hidden sm:inline-block sm:align-middle sm:h-screen"
        aria-hidden="true"
        >&#8203;</span
      >

      <!--
      Modal panel, show/hide based on modal state.

      Entering: "ease-out duration-300"
        From: "opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
        To: "opacity-100 translate-y-0 sm:scale-100"
      Leaving: "ease-in duration-200"
        From: "opacity-100 translate-y-0 sm:scale-100"
        To: "opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
    -->
      <transition
        enter-active-class="transition ease-out duration-300"
        enter-from-class="transform opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
        enter-to-class="transform opacity-100 translate-y-0 sm:scale-100"
        leave-active-class="transition ease-in duration-200"
        leave-from-class="transform opacity-100 translate-y-0 sm:scale-100"
        leave-to-class="transform opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
      >
        <div
          class="inline-block bg-white  rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl "
        >
          <div class="bg-white pt-5">
            <div class="sm:flex sm:items-start">
              <div class="mt-3 text-center sm:mt-0 sm:text-left">
                <div class="flex justify-between items-center space-x-6">
                  <p class="ml-14 text-lg leading-6 font-medium text-gray-900">
                    <slot name="title"></slot>
                  </p>
                  <slot name="dbtypes-combo"></slot>
                  <div class="modal-close cursor-pointer z-50">
                    <svg
                      class="fill-current text-gray-900 mr-8"
                      xmlns="http://www.w3.org/2000/svg"
                      width="18"
                      height="18"
                      viewBox="0 0 18 18"
                      @click="close"
                    >
                      <path
                        d="M14.53 4.53l-1.06-1.06L9 7.94 4.53 3.47 3.47 4.53 7.94 9l-4.47 4.47 1.06 1.06L9 10.06l4.47 4.47 1.06-1.06L10.06 9z"
                      ></path>
                    </svg>
                  </div>
                </div>
                <div
                  class="flex-col lg:flex-row justify-between flex gap-2 items-start mx-4 pt-6 pb-3 md:ml-6"
                >
                  <slot name="dbtypes-navbar"></slot>
                  <section class="md:w-3/4 relative w-full rounded-lg">
                    <slot name="connection-params"></slot>
                    <!-- <connection-params
                      v-if="currentConnection"
                      :connectionType="currentConnection.type"
                    /> -->
                  </section>
                </div>
              </div>
            </div>
          </div>

          <div
            v-if="isShowActionBtns"
            class="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse"
          >
            <button
              type="submit"
              name="submit"
              @click="confirm"
              class="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-gray-600 text-base font-medium text-white hover:bg-gray-700  focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 sm:ml-3 sm:w-auto sm:text-sm"
            >
              <slot name="confirmButton"> Ok</slot>
            </button>

            <button
              type="button"
              name="test"
              class="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
              v-show="showTestConnectionBtn"
            >
              Test Connection
            </button>
            <button
              type="button"
              name="cancel"
              @click="close"
              class="ml-5 py-2 px-3  text-sm leading-4 font-medium text-gray-700  focus:outline-none  "
            >
              Cancel
            </button>
          </div>
        </div>
      </transition>
    </form>
  </div>
</template>

<script>
//import ConnectionParams from "./params/ConnectionParams.vue";
import { mapGetters } from "vuex";
export default {
  components: {
    //   ConnectionParams
  },
  props: {
    isOpen: {
      type: Boolean,
      required: true
    },
    isShowActionBtns: {
      type: Boolean,
      required: true,
      default: true
    }
  },
  emits: {
    ok: null,
    close: null
  },
  computed: {
    ...mapGetters(["currentConnection"]),
    showTestConnectionBtn() {
      if (!this.currentConnection) return false;
      if (
        ["Access", "FoxPro", "SQLite"].includes(this.currentConnection.type)
      ) {
        return false;
      }
      return true;
    }
  },
  methods: {
    handleKeyDown(e) {
      if (this.isOpen && e.key === "Escape") {
        this.close();
      }
    },
    close() {
      this.$emit("close");
    },
    confirm() {
      this.$emit("ok");
    }
  },
  mounted() {
    document.addEventListener("keydown", this.handleKeyDown);
  },
  beforeUnmount() {
    document.removeEventListener("keydown", this.handleKeyDown);
  }
};
</script>

<style></style>
