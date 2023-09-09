<template>
  <div>
    <connection-name v-model:name="connection.name" />
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
              v-model.number="connection.port"
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
              v-model="connection.charset"
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
      <hr />
      <div class="items-center w-full p-4 space-y-4 text-gray-500 md:inline-flex md:space-y-0">
        <label class="max-w-sm mx-auto md:w-1/3"> Database </label>
        <div class="max-w-sm mx-auto md:w-2/3">
          <div class="relative">
            <input
              v-model="connection.database"
              type="text"
              class="rounded-lg border-transparent flex-1 appearance-none border border-gray-300 w-full py-2 px-4 bg-white text-gray-700 placeholder-gray-400 shadow-sm text-base focus:outline-none focus:ring-2 focus:ring-gray-600 focus:border-transparent"
              placeholder=""
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import common from './common.js'
export default Object.assign({}, common, {
  name: 'FirebirdParams',
  data: () => ({
    connection: {
      name: '',
      host: 'localhost',
      port: 3050,
      userName: 'SYSDBA',
      password: '',
      charset: 'utf8',
      database: ''
    },
    connectionType: 'Firebird',
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
  }),
})
</script>
