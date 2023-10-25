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
              class="rounded-lg flex-1 appearance-none border border-gray-300 w-full py-2 px-4 bg-white text-gray-700 placeholder-gray-400 shadow-sm text-base focus:outline-none focus:ring-2 focus:ring-gray-600 focus:border-transparent"
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
              class="rounded-lg flex-1 appearance-none border border-gray-300 w-full py-2 px-4 bg-white text-gray-700 placeholder-gray-400 shadow-sm text-base focus:outline-none focus:ring-2 focus:ring-gray-600 focus:border-transparent"
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
              v-model="connection.username"
              type="text"
              class="rounded-lg flex-1 appearance-none border border-gray-300 w-full py-2 px-4 bg-white text-gray-700 placeholder-gray-400 shadow-sm text-base focus:outline-none focus:ring-2 focus:ring-gray-600 focus:border-transparent"
              placeholder=""
            />
          </div>
        </div>
      </div>

      <PasswordBox v-model:password="connection.password" />
      <!-- <div class="items-center w-full p-4 space-y-4 text-gray-500 md:inline-flex md:space-y-0"> -->
      <!--   <label class="max-w-sm mx-auto md:w-1/3"> Charset </label> -->
      <!--   <div class="max-w-sm mx-auto md:w-2/3"> -->
      <!--     <ItemsCombo :items="charsets" v-model="connection.charset" /> -->
      <!--   </div> -->
      <!-- </div> -->
      <hr />
      <div v-show="connection.id">
        <div class="items-center w-full p-4 space-y-4 text-gray-500 md:inline-flex md:space-y-0">
          <label class="max-w-sm mx-auto md:w-1/3">Database </label>
          <div class="md:inline-flex max-w-sm mx-auto md:w-2/3">
            <ItemsCombo
              v-model="connection.database"
              :items="connection.databases"
              :isShowAddButton="true"
              @addItem="createDatabase"
            />
            <button
              :disabled="!connection.id"
              type="button"
              class="w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-gray-100 text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              @click="refreshDatabases"
            >
              Refresh
              <ArrowPathIcon class="pl-2 h-5 w-5" aria-hidden="true" />
            </button>
          </div>
        </div>

        <div
          class="items-center w-full p-4 mb-12 space-y-4 text-gray-500 md:inline-flex md:space-y-0"
        >
          <label class="max-w-sm mx-auto md:w-1/3"> Schema </label>
          <div class="md:inline-flex max-w-sm mx-auto md:w-2/3">
            <ItemsCombo
              :items="connection.schemas"
              v-model="connection.schema"
              :isShowAddButton="true"
              @addItem="createSchema"
            />
            <button
              :disabled="!connection.id"
              type="button"
              class="w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-gray-100 text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              @click="refreshSchemas"
            >
              Refresh
              <ArrowPathIcon class="pl-2 h-5 w-5" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import common from './common.js'
export default Object.assign({}, common, {
  name: 'PostgreSQLParams',
  data: () => ({
    connection: {
      name: '',
      host: 'localhost',
      port: 5432,
      username: 'postgres',
      password: '',
      // charset: 'utf8',
      database: 'postgres',
      databases: [],
      schema: 'public',
      schemas: ['public']
    },
    connectionType: 'PostgreSQL'
    // charsets: [
    //   'utf8',
    //   'armscii8',
    //   'ascii',
    //   'cp1250',
    //   'cp1251',
    //   'cp1256',
    //   'cp1257',
    //   'cp850',
    //   'cp852',
    //   'cp866',
    //   'dec8',
    //   'geostd8',
    //   'greek',
    //   'hebrew',
    //   'hp8',
    //   'keybcs2',
    //   'koi8r',
    //   'koi8u',
    //   'latin1',
    //   'latin2',
    //   'latin5',
    //   'latin7',
    //   'macce',
    //   'macroman',
    //   'swe7',
    //   'tis620'
    // ]
  })
})
</script>
