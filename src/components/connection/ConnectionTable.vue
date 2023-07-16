<template>
  <div class="container mx-auto px-4 max-w-7xl">
    <div class=" px-4  py-4 overflow-x-auto">
      <div class="inline-block min-w-full shadow rounded-lg overflow-hidden">
        <table class="min-w-full leading-normal">
          <thead class="text-sm md:text-base">
            <tr class="bg-gray-100 ">
              <th
                scope="col"
                class="px-5 py-3 border-b border-gray-200 text-gray-800  text-left  uppercase font-normal"
              >
                Connection
              </th>
              <th
                scope="col"
                class="px-5 py-3 border-b border-gray-200 text-gray-800  text-left  uppercase font-normal"
              >
                Database
              </th>
              <th
                scope="col"
                class="px-5 py-3 border-b border-gray-200 text-gray-800  text-left  uppercase font-normal hidden lg:table-cell"
              >
                Created at
              </th>
              <th
                scope="col"
                colspan="3"
                class="px-5 py-3   border-b border-gray-200 text-gray-800  text-left  uppercase font-normal"
              >
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <connection-table-row-new @add="add" />
            </tr>
            <!-- class="cursor-pointer transform hover:scale-105 duration-300 ease-in-out" -->
            <tr v-for="connection in connections" :key="connection.id">
              <connection-table-row
                :connection="connection"
                :isSelectable="isSelectable"
                @edit="edit"
              />
            </tr>
          </tbody>
        </table>
      </div>
      <div
        class="px-5 bg-white py-5 flex flex-col xs:flex-row items-center xs:justify-between"
      >
        <div class="flex items-center">
          <button
            type="button"
            class="w-full p-4 border text-base rounded-l-xl text-gray-600 bg-white hover:bg-gray-100"
          >
            <svg
              width="9"
              fill="currentColor"
              height="8"
              class=""
              viewBox="0 0 1792 1792"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M1427 301l-531 531 531 531q19 19 19 45t-19 45l-166 166q-19 19-45 19t-45-19l-742-742q-19-19-19-45t19-45l742-742q19-19 45-19t45 19l166 166q19 19 19 45t-19 45z"
              ></path>
            </svg>
          </button>
          <button
            type="button"
            class="w-full px-4 py-2 border-t border-b text-base text-indigo-500 bg-white hover:bg-gray-100 "
          >
            1
          </button>
          <button
            type="button"
            class="w-full px-4 py-2 border text-base text-gray-600 bg-white hover:bg-gray-100"
          >
            2
          </button>
          <button
            type="button"
            class="w-full px-4 py-2 border-t border-b text-base text-gray-600 bg-white hover:bg-gray-100"
          >
            3
          </button>
          <button
            type="button"
            class="w-full px-4 py-2 border text-base text-gray-600 bg-white hover:bg-gray-100"
          >
            4
          </button>
          <button
            type="button"
            class="w-full p-4 border-t border-b border-r text-base  rounded-r-xl text-gray-600 bg-white hover:bg-gray-100"
          >
            <svg
              width="9"
              fill="currentColor"
              height="8"
              class=""
              viewBox="0 0 1792 1792"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M1363 877l-742 742q-19 19-45 19t-45-19l-166-166q-19-19-19-45t19-45l531-531-531-531q-19-19-19-45t19-45l166-166q19-19 45-19t45 19l742 742q19 19 19 45t-19 45z"
              ></path>
            </svg>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import ConnectionTableRow from "./ConnectionTableRow.vue";
import ConnectionTableRowNew from "./ConnectionTableRowNew.vue";
export default {
  props: {
    connections: {
      type: Array
    },
    isSelectable: {
      type: Boolean,
      required: true,
      default: true
    }
  },
  emits: {
    add: null,
    edit: null
  },
  components: {
    ConnectionTableRow,
    ConnectionTableRowNew
  },
  methods: {
    add() {
      this.$emit("add");
    },
    edit() {
      this.$emit("edit");
    }
  }
};
</script>

<style>
table tr:hover td {
  background-color: #f5f5f5;
}
</style>
