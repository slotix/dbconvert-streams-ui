<template>
  <!-- :class="{
        'ring-transparent ring-4 border-transparent': selected
      }" -->
  <div class="max-w-sm w-full py-6 ">
    <div
      class="bg-white shadow-md rounded-lg overflow-hidden cursor-pointer transform hover:scale-105 duration-300 ease-in-out"
      @click="selectConnection"
    >
      <div
        class="flex flex-wrap items-center  bg-gray-100  p-4"
        :class="{
          'bg-gradient-to-r from-white via-yellow-200 to-yellow-500':
            highlightSelected === 'source',
          'bg-gradient-to-r from-white via-green-200 to-green-500':
            highlightSelected === 'target'
        }"
      >
        <div class="item w-1/5 flex">
          <img
            class="h-10 w-10 rounded-full"
            :src="logoSrc"
            :alt="connection.type + ' logo'"
          />
        </div>
        <p
          class="item w-3/5 uppercase truncate tracking-wide text-sm font-medium text-gray-800"
        >
          {{ connection.name }}
        </p>
        <p
          v-show="isSelectable && selected"
          class="justify-end item w-1/5 flex text-gray-700"
        >
          <!-- check mark -->
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-8 w-8 "
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M5 13l4 4L19 7"
            />
          </svg>
        </p>
      </div>

      <div class="flex">
        <div>
          <div
            class="pl-4 pt-4 pr-4 md:text-left w-full space-y-2 text-gray-500 "
          >
            <p class="max-w-sm mx-auto font-semibold text-gray-900">
              Database:
              <span class="font-normal"> {{ connection.database }}</span>
            </p>

            <!-- <div class="max-w-sm mx-auto ">
          <input
            type="search"
            class="rounded-lg border-transparent flex-1 appearance-none border border-gray-300 w-full py-2 px-4 bg-white text-gray-700 placeholder-gray-400 shadow-sm text-base focus:outline-none focus:ring-2 focus:ring-gray-600 focus:border-transparent"
            placeholder=""
          />
        </div> -->
          </div>
          <div class="px-4 pt-1 pb-4">
            <div class="flex items-center pt-2">
              <p class="inline-flex font-bold text-gray-600">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="h-6 w-6 "
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="1.5"
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                <span class="font-normal  pl-3"> {{ connectionCreated }}</span>
              </p>
            </div>
          </div>
        </div>
        <div class=""></div>
      </div>
      <div
        class="flex flex-wrap space-y-4 sm:space-y-0 justify-between p-4 sm:pl-1   text-gray-700 bg-gray-100"
      >
        <button
          class="w-full inline-flex  rounded-md border border-transparent shadow-sm px-4 py-2 bg-gray-600 text-base font-medium text-white hover:bg-gray-700  focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 sm:ml-3 sm:w-auto sm:text-sm"
          @click="editConnection"
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
              stroke-width="1.5"
              d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
            />
          </svg>
        </button>
        <button
          class="w-full inline-flex  rounded-md border border-transparent shadow-sm px-4 py-2 bg-gray-600 text-base font-medium text-white hover:bg-gray-700  focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 sm:ml-3 sm:w-auto sm:text-sm"
          @click="cloneConnection"
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
              stroke-width="1.5"
              d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
            />
          </svg>
        </button>
        <button
          class="w-full inline-flex  rounded-md border border-transparent shadow-sm px-4 py-2 bg-gray-200 text-base font-medium text-red-600 hover:bg-gray-300  focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 sm:ml-3 sm:w-auto sm:text-sm"
          @click="deleteConn(connection.id)"
        >
          Delete
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-4 w-4 text-red ml-2"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="1.5"
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
import connectionItemShared from "./connectionItemShared.js";
export default Object.assign({}, connectionItemShared);
</script>

<style></style>
