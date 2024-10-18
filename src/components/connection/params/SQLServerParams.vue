<template>
  <div>
    <ConnectionName v-model:name="connection.name" />
    <hr />
    <div class="overflow-y-auto h-104 bg-white bg-opacity-5 text-center md:text-left">
      <div class="items-center w-full p-4 space-y-4 text-gray-500 md:inline-flex md:space-y-0">
        <label class="max-w-sm mx-auto md:w-1/3">Connection Type</label>
        <div class="max-w-sm mx-auto md:w-2/3">
          <div class="relative">
            <select
              v-model.lazy="connection.protocol"
              class="rounded-lg border-transparent flex-1 appearance-none border border-gray-300 w-full py-2 px-4 bg-white text-gray-700 placeholder-gray-400 shadow-sm text-base focus:outline-none focus:ring-2 focus:ring-gray-600 focus:border-transparent"
              placeholder=""
            >
              <option v-for="p in protocols" :key="p">
                {{ p }}
              </option>
            </select>
          </div>
        </div>
      </div>
      <div class="bg-white bg-opacity-5">
        <div class="items-center w-full p-4 space-y-4 text-gray-500 md:inline-flex md:space-y-0">
          <label class="max-w-sm mx-auto md:w-1/3">Server</label>
          <div class="max-w-sm mx-auto md:w-2/3">
            <div class="relative">
              <input
                v-model.lazy="connection.host"
                type="text"
                class="rounded-lg border-transparent flex-1 appearance-none border border-gray-300 w-full py-2 px-4 bg-white text-gray-700 placeholder-gray-400 shadow-sm text-base focus:outline-none focus:ring-2 focus:ring-gray-600 focus:border-transparent"
                placeholder=""
              />
            </div>
          </div>
        </div>
        <div class="items-center w-full p-4 space-y-4 text-gray-500 md:inline-flex md:space-y-0">
          <label class="max-w-sm mx-auto md:w-1/3">Port</label>
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
          <label class="max-w-sm mx-auto md:w-1/3">Windows Authentication</label>
          <div class="max-w-sm mx-auto md:w-2/3">
            <div class="relative">
              <input
                v-model.lazy="connection.windowsAuthentication"
                type="checkbox"
                class="rounded h-6 w-6 border-gray-300 text-gray-600 shadow-sm focus:border-gray-300 focus:ring focus:ring-gray-200 focus:ring-opacity-50"
              />
            </div>
          </div>
        </div>
        <div class="items-center w-full p-4 space-y-4 text-gray-500 md:inline-flex md:space-y-0">
          <label class="max-w-sm mx-auto md:w-1/3">User ID</label>
          <div class="max-w-sm mx-auto md:w-2/3">
            <div class="relative">
              <input
                v-model.lazy="connection.userName"
                type="text"
                class="rounded-lg border-transparent flex-1 appearance-none border border-gray-300 w-full py-2 px-4 bg-white text-gray-700 placeholder-gray-400 shadow-sm text-base focus:outline-none focus:ring-2 focus:ring-gray-600 focus:border-transparent"
                placeholder=""
              />
            </div>
          </div>
        </div>
        <PasswordBox v-model:password="connection.password" />
        <hr />
        <div class="items-center w-full p-4 space-y-4 text-gray-500 md:inline-flex md:space-y-0">
          <label class="max-w-sm mx-auto md:w-1/3">Database</label>
          <div class="max-w-sm mx-auto md:w-2/3">
            <div class="relative">
              <input
                v-model.lazy="connection.database"
                type="text"
                class="rounded-lg border-transparent flex-1 appearance-none border border-gray-300 w-full py-2 px-4 bg-white text-gray-700 placeholder-gray-400 shadow-sm text-base focus:outline-none focus:ring-2 focus:ring-gray-600 focus:border-transparent"
                placeholder=""
              />
            </div>
          </div>
        </div>
        <div class="items-center w-full p-4 space-y-4 text-gray-500 md:inline-flex md:space-y-0">
          <label class="max-w-sm mx-auto md:w-1/3">Schema</label>
          <div class="max-w-sm mx-auto md:w-2/3">
            <div class="relative">
              <input
                v-model.lazy="connection.schema"
                type="text"
                class="rounded-lg border-transparent flex-1 appearance-none border border-gray-300 w-full py-2 px-4 bg-white text-gray-700 placeholder-gray-400 shadow-sm text-base focus:outline-none focus:ring-2 focus:ring-gray-600 focus:border-transparent"
                placeholder=""
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref } from 'vue'
import { useCommon, Connection } from './common'

interface SQLServerConnection extends Connection {
  protocol: string
  windowsAuthentication: boolean
  userName: string
  schemas: string[]
  schema: string
}

export default defineComponent({
  name: 'SQLServerParams',
  setup() {
    const defaultConnection: SQLServerConnection = {
      id: '',
      name: '',
      type: 'SQLServer',
      host: 'localhost',
      port: 1435,
      username: 'sa',
      password: '',
      schemas: [],
      databases: [],
      database: '',
      schema: 'dbo',
      protocol: 'TCP/IP',
      windowsAuthentication: false,
      userName: 'sa'
    }

    const {
      connection,
      buildConnectionName,
      dlgTp,
      updateConnectionName,
      fetchData,
      refreshSchemas,
      refreshDatabases,
      createData,
      createDatabase,
      createSchema
    } = useCommon<SQLServerConnection>(defaultConnection)

    const protocols = ref(['TCP/IP', 'PIPE', 'IPX/SPX'])

    return {
      connection,
      buildConnectionName,
      dlgTp,
      updateConnectionName,
      fetchData,
      refreshSchemas,
      refreshDatabases,
      createData,
      createDatabase,
      createSchema,
      protocols
    }
  }
})
</script>

<style>
.h-104 {
  height: 28rem;
}
</style>
