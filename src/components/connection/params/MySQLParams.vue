<template>
  <div>
    <ConnectionName v-model:name="connection.name" />
    <hr />
    <div class="bg-white bg-opacity-5 text-center md:text-left">
      <div class="items-center w-full p-4 space-y-4 text-gray-500 md:inline-flex md:space-y-0">
        <label class="max-w-sm mx-auto md:w-1/3"> Server </label>
        <div class="max-w-sm mx-auto md:w-2/3">
          <div class="relative">
            <input
              v-model="connection.host"
              type="text"
              class="rounded-lg border-transparent flex-1 appearance-none border border-gray-300 w-full py-2 px-4 bg-white text-gray-700 placeholder-gray-400 shadow-sm text-base focus:outline-none focus:ring-2 focus:ring-gray-600 focus:border-transparent"
              placeholder=""
            />
          </div>
        </div>
      </div>
      <div class="items-center w-full p-4 space-y-4 text-gray-500 md:inline-flex md:space-y-0">
        <label class="max-w-sm mx-auto md:w-1/3"> Port </label>
        <div class="max-w-sm mx-auto md:w-2/3">
          <div class="relative">
            <input
              v-model.number.lazy="connection.port"
              type="number"
              class="rounded-lg border-transparent flex-1 appearance-none border border-gray-300 w-full py-2 px-4 bg-white text-gray-700 placeholder-gray-400 shadow-sm text-base focus:outline-none focus:ring-2 focus:ring-gray-600 focus:border-transparent"
              placeholder=""
            />
          </div>
        </div>
      </div>
      <div class="items-center w-full p-4 space-y-4 text-gray-500 md:inline-flex md:space-y-0">
        <label class="max-w-sm mx-auto md:w-1/3"> User ID </label>
        <div class="max-w-sm mx-auto md:w-2/3">
          <div class="relative">
            <input
              v-model="connection.userName"
              type="text"
              class="rounded-lg border-transparent flex-1 appearance-none border border-gray-300 w-full py-2 px-4 bg-white text-gray-700 placeholder-gray-400 shadow-sm text-base focus:outline-none focus:ring-2 focus:ring-gray-600 focus:border-transparent"
              placeholder=""
            />
          </div>
        </div>
      </div>
      <PasswordBox v-model:password="connection.password" />
      <div class="items-center w-full p-4 space-y-4 text-gray-500 md:inline-flex md:space-y-0">
        <label class="max-w-sm mx-auto md:w-1/3"> Character Set </label>
        <div class="max-w-sm mx-auto md:w-2/3">
          <div class="relative">
            <select
              v-model.lazy="connection.charset"
              class="rounded-lg border-transparent flex-1 appearance-none border border-gray-300 w-full py-2 px-4 bg-white text-gray-700 placeholder-gray-400 shadow-sm text-base focus:outline-none focus:ring-2 focus:ring-gray-600 focus:border-transparent"
              placeholder=""
            >
              <option v-for="c in charsets" :key="c">
                {{ c }}
              </option>
            </select>
          </div>
        </div>
      </div>
      <div class="items-center w-full p-4 space-y-4 text-gray-500 md:inline-flex md:space-y-0">
        <label class="max-w-sm mx-auto md:w-1/3"> Database </label>
        <div class="md:inline-flex max-w-sm mx-auto md:w-2/3">
          <select
            v-model.lazy="connection.database"
            class="w-full rounded-lg border-transparent appearance-none border border-gray-300 py-2 px-4 bg-white text-gray-700 placeholder-gray-400 shadow-sm text-base focus:outline-none focus:ring-2 focus:ring-gray-600 focus:border-transparent"
            placeholder="Select Database"
          >
            <option v-for="d in databases" :key="d">
              {{ d }}
            </option>
          </select>

          <!-- <input
            v-model.lazy="connection.database"
            type="text"
            class=" rounded-lg border-transparent flex-1 appearance-none border border-gray-300 w-full py-2 px-4 bg-white text-gray-700 placeholder-gray-400 shadow-sm text-base focus:outline-none focus:ring-2 focus:ring-gray-600 focus:border-transparent"
            placeholder=""
          /> -->
          <button
            type="button"
            class="w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 sm:ml-3 sm:w-auto sm:text-sm"
          >
            Refresh
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-4 w-4 ml-2 mt-0.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import common from './common.js'
export default Object.assign({}, common, {
  name: 'MySQLParams',
  data: () => ({
    connection: {
      name: '',
      host: 'localhost',
      port: 3306,
      userName: 'root',
      charset: 'utf8',
      database: ''
    },
    connectionType: 'MySQL',
    databases: ['db1', 'db2', 'db3'],
    charsets: [
      'utf8',
      'armscii8',
      'ascii',
      'cp1250',
      'cp1251',
      'cp1256',
      'cp1257',
      'cp850',
      'cp852',
      'cp866',
      'dec8',
      'geostd8',
      'greek',
      'hebrew',
      'hp8',
      'keybcs2',
      'koi8r',
      'koi8u',
      'latin1',
      'latin2',
      'latin5',
      'latin7',
      'macce',
      'macroman',
      'swe7',
      'tis620'
    ]
  })
})
</script>
