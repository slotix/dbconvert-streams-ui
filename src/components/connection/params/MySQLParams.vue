<template>
  <div v-show="connection.id" class="bg-white bg-opacity-5 text-center md:text-left">
    <div class="items-center w-full p-4 space-y-4 text-gray-500 md:inline-flex md:space-y-0">
      <label class="max-w-sm mx-auto md:w-1/3">Connection ID</label>
      <div class="max-w-sm mx-auto md:w-2/3">
        <div class="relative">
          <span class="block rounded-lg bg-white text-gray-700 placeholder-gray-400 shadow-sm text-base py-2 px-4">
            {{ connection.id }}
          </span>
        </div>
      </div>
    </div>
  </div>
  <ConnectionName v-model:name="connection.name" />
  <hr />
  <div class="bg-white bg-opacity-5 text-center md:text-left">
    <div class="items-center w-full p-4 space-y-4 text-gray-500 md:inline-flex md:space-y-0">
      <label class="max-w-sm mx-auto md:w-1/3"> Server </label>
      <div class="max-w-sm mx-auto md:w-2/3">
        <div class="relative">
          <input v-model="connection.host" type="text"
            class="rounded-lg flex-1 appearance-none border border-gray-300 w-full py-2 px-4 bg-white text-gray-700 placeholder-gray-400 shadow-sm text-base focus:outline-none focus:ring-2 focus:ring-gray-600 focus:border-transparent"
            placeholder="" />
        </div>
      </div>
    </div>
    <div class="items-center w-full p-4 space-y-4 text-gray-500 md:inline-flex md:space-y-0">
      <label class="max-w-sm mx-auto md:w-1/3"> Port </label>
      <div class="max-w-sm mx-auto md:w-2/3">
        <div class="relative">
          <input v-model.number.lazy="connection.port" type="number"
            class="rounded-lg flex-1 appearance-none border border-gray-300 w-full py-2 px-4 bg-white text-gray-700 placeholder-gray-400 shadow-sm text-base focus:outline-none focus:ring-2 focus:ring-gray-600 focus:border-transparent"
            placeholder="" />
        </div>
      </div>
    </div>
    <div class="items-center w-full p-4 space-y-4 text-gray-500 md:inline-flex md:space-y-0">
      <label class="max-w-sm mx-auto md:w-1/3"> User ID </label>
      <div class="max-w-sm mx-auto md:w-2/3">
        <div class="relative">
          <input v-model="connection.username" type="text"
            class="rounded-lg flex-1 appearance-none border border-gray-300 w-full py-2 px-4 bg-white text-gray-700 placeholder-gray-400 shadow-sm text-base focus:outline-none focus:ring-2 focus:ring-gray-600 focus:border-transparent"
            placeholder="" />
        </div>
      </div>
    </div>
    <PasswordBox v-model:password="connection.password" />
    <hr />
    <div v-show="connection.id"
      class="items-center w-full p-4 mb-12 space-y-4 text-gray-500 md:inline-flex md:space-y-0">
      <label class="max-w-sm mx-auto md:w-1/3">Database </label>
      <div class="md:inline-flex max-w-sm mx-auto md:w-2/3">
        <ItemsCombo v-model="connection.database" :items="connection.databases" :isShowAddButton="true"
          @addItem="createDatabase" />
        <button :disabled="!connection.id" type="button"
          class="w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-gray-100 text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          @click="refreshDatabases">
          Refresh
          <ArrowPathIcon class="pl-2 h-5 w-5" aria-hidden="true" />
        </button>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { useCommon } from './common';
import { Connection } from '@/types/connections';
import ConnectionName from './ConnectionName.vue';
import PasswordBox from '@/components/common/PasswordBox.vue';
import ItemsCombo from '@/components/common/ItemsCombo.vue';
import { ArrowPathIcon } from '@heroicons/vue/24/solid';

interface MySQLConnection extends Connection {
}

export default defineComponent({
  name: 'MySQLParams',
  components: {
    ConnectionName,
    PasswordBox,
    ItemsCombo,
    ArrowPathIcon,
  },
  setup() {
    const defaultConnection: MySQLConnection = {
      id: '',
      name: '',
      type: 'MySQL',
      host: 'localhost',
      port: 3306,
      username: 'root',
      password: '',
      databases: [],
      database: '',
    };

    const {
      connection,
      buildConnectionName,
      dlgTp,
      updateConnectionName,
      fetchData,
      refreshDatabases,
      createData,
      createDatabase,
    } = useCommon(defaultConnection as unknown as Connection);

    return {
      connection,
      buildConnectionName,
      dlgTp,
      updateConnectionName,
      fetchData,
      refreshDatabases,
      createData,
      createDatabase,
    };
  },
});
</script>
