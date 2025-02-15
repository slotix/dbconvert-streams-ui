<template>
  <div v-if="connection.id" class="bg-white bg-opacity-5 text-center md:text-left">
    <div class="items-center w-full p-4 space-y-4 text-gray-500 md:inline-flex md:space-y-0">
      <label class="max-w-sm mx-auto md:w-1/3">Connection ID</label>
      <div class="max-w-sm mx-auto md:w-2/3">
        <div class="relative">
          <span
            class="block rounded-lg bg-white text-gray-700 placeholder-gray-400 shadow-sm text-base py-2 px-4"
          >
            {{ connection.id }}
          </span>
        </div>
      </div>
    </div>
  </div>
  <div v-else class="text-center" :class="isEdit ? '' : 'hidden'">
    <Spinner text="Loading connection..." size="sm" />
  </div>
  <ConnectionName v-model:name="connection.name" />
  <div v-if="(isEdit && connection.id) || !isEdit">
    <hr />
    <div class="bg-white bg-opacity-5 text-center md:text-left">
      <div class="items-center w-full p-2 text-gray-500 md:inline-flex">
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
      <div class="items-center w-full p-2 text-gray-500 md:inline-flex">
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
      <div class="items-center w-full p-2 text-gray-500 md:inline-flex">
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
    </div>
    <!-- Separate input box and button for adding a new database -->
    <div class="items-center w-full p-2 text-gray-500 md:inline-flex">
      <label class="max-w-sm mx-auto md:w-1/3">Database</label>
      <div class="flex items-center max-w-sm mx-auto md:w-2/3 space-x-2">
        <Combobox v-model="connection.database" @update:modelValue="updateDatabase">
          <div class="relative">
            <ComboboxInput
              class="w-full rounded-lg border border-gray-300 py-2 px-4 bg-white text-gray-700 placeholder-gray-400 shadow-sm text-base focus:outline-none focus:ring-2 focus:ring-gray-600 focus:border-transparent"
              :displayValue="(item: unknown) => item as string"
              @change="
                (event) => {
                  const target = event.target as HTMLInputElement
                  connection.database = target.value
                  updateDatabase(target.value)
                }
              "
            />
            <ComboboxButton class="absolute inset-y-0 right-0 flex items-center pr-2">
              <ChevronUpDownIcon class="h-5 w-5 text-gray-400" aria-hidden="true" />
            </ComboboxButton>
            <TransitionRoot
              leave="transition ease-in duration-100"
              leaveFrom="opacity-100"
              leaveTo="opacity-0"
            >
              <ComboboxOptions
                class="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm"
              >
                <ComboboxOption
                  v-for="db in databases"
                  :key="db"
                  v-slot="{ selected, active }"
                  :value="db"
                  as="template"
                >
                  <li
                    :class="[
                      'relative cursor-default select-none py-2 pl-3 pr-9',
                      active ? 'bg-gray-100 text-gray-900' : 'text-gray-700'
                    ]"
                  >
                    <span :class="['block truncate', selected && 'font-semibold']">
                      {{ db }}
                    </span>
                    <span
                      v-if="selected"
                      :class="[
                        'absolute inset-y-0 right-0 flex items-center pr-4',
                        active ? 'text-gray-600' : 'text-gray-600'
                      ]"
                    >
                      <CheckIcon class="h-5 w-5" aria-hidden="true" />
                    </span>
                  </li>
                </ComboboxOption>
              </ComboboxOptions>
            </TransitionRoot>
          </div>
        </Combobox>
        <button
          :disabled="!connection.id"
          type="button"
          class="inline-flex justify-center items-center rounded-md border border-gray-300 shadow-sm px-6 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          @click="refreshDatabases"
        >
          <template v-if="isLoadingDatabases">
            <Spinner size="sm" />
          </template>
          <template v-else>
            Refresh
            <ArrowPathIcon class="ml-2 h-4 w-4" aria-hidden="true" />
          </template>
        </button>
      </div>
    </div>
    <!-- Separate input box and button for adding a new database -->
    <div class="items-center w-full p-2 text-gray-500 md:inline-flex">
      <label class="max-w-sm mx-auto md:w-1/3"></label>
      <div class="flex items-center max-w-sm mx-auto md:w-2/3 space-x-2">
        <input
          v-model="newDatabase"
          type="text"
          class="w-48 rounded-lg appearance-none border border-gray-300 py-2 px-4 bg-white text-gray-700 placeholder-gray-400 shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-gray-600 focus:border-transparent"
          placeholder="new database"
        />
        <button
          :disabled="newDatabase === '' || !connection.id"
          class="whitespace-nowrap inline-flex items-center rounded-lg border border-gray-300 py-2 px-4 text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-600 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          @click="createDatabase(newDatabase)"
        >
          Add
        </button>
      </div>
    </div>
    <div class="items-center w-full p-2 text-gray-500 md:inline-flex">
      <label class="max-w-sm mx-auto md:w-1/3">Schema</label>
      <div class="flex items-center max-w-sm mx-auto md:w-2/3 space-x-2">
        <Combobox v-model="connection.schema">
          <div class="relative">
            <ComboboxInput
              class="w-full rounded-lg border border-gray-300 py-2 px-4 bg-white text-gray-700 placeholder-gray-400 shadow-sm text-base focus:outline-none focus:ring-2 focus:ring-gray-600 focus:border-transparent"
              :displayValue="(item: unknown) => item as string"
            />
            <ComboboxButton class="absolute inset-y-0 right-0 flex items-center pr-2">
              <ChevronUpDownIcon class="h-5 w-5 text-gray-400" aria-hidden="true" />
            </ComboboxButton>
            <TransitionRoot
              leave="transition ease-in duration-100"
              leaveFrom="opacity-100"
              leaveTo="opacity-0"
            >
              <ComboboxOptions
                class="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm"
              >
                <ComboboxOption
                  v-for="schema in currentDatabaseSchemas"
                  :key="schema"
                  v-slot="{ selected, active }"
                  :value="schema"
                  as="template"
                >
                  <li
                    :class="[
                      'relative cursor-default select-none py-2 pl-3 pr-9',
                      active ? 'bg-gray-100 text-gray-900' : 'text-gray-700'
                    ]"
                  >
                    <span :class="['block truncate', selected && 'font-semibold']">
                      {{ schema }}
                    </span>
                    <span
                      v-if="selected"
                      :class="[
                        'absolute inset-y-0 right-0 flex items-center pr-4',
                        active ? 'text-gray-600' : 'text-gray-600'
                      ]"
                    >
                      <CheckIcon class="h-5 w-5" aria-hidden="true" />
                    </span>
                  </li>
                </ComboboxOption>
              </ComboboxOptions>
            </TransitionRoot>
          </div>
        </Combobox>
      </div>
    </div>
    <!-- Separate input box and button for adding a new schema -->
    <div class="items-center w-full p-2 text-gray-500 md:inline-flex">
      <label class="max-w-sm mx-auto md:w-1/3"></label>
      <div class="flex items-center max-w-sm mx-auto md:w-2/3 space-x-2">
        <input
          v-model="newSchema"
          type="text"
          class="w-48 rounded-lg appearance-none border border-gray-300 py-2 px-4 bg-white text-gray-700 placeholder-gray-400 shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-gray-600 focus:border-transparent"
          placeholder="new schema"
        />
        <button
          :disabled="newSchema === '' || !connection.id"
          class="whitespace-nowrap inline-flex items-center rounded-lg border border-gray-300 py-2 px-4 text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-600 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          @click="createSchema(newSchema)"
        >
          Add
        </button>
      </div>
    </div>
    <PasswordBox v-model:password="connection.password" />
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed } from 'vue'
import { useCommon } from './common'
import { type Connection } from '@/types/connections'
import ConnectionName from './ConnectionName.vue'
import { useConnectionsStore } from '@/stores/connections'
import { storeToRefs } from 'pinia'
import PasswordBox from '@/components/common/PasswordBox.vue'
import { ArrowPathIcon, ChevronUpDownIcon, CheckIcon } from '@heroicons/vue/24/solid'
import {
  Combobox,
  ComboboxInput,
  ComboboxButton,
  ComboboxOptions,
  ComboboxOption,
  TransitionRoot
} from '@headlessui/vue'
import { type DatabaseInfo } from '@/types/connections'
import Spinner from '@/components/common/Spinner.vue'

interface PostgreSQLConnection extends Connection {
  databasesInfo: DatabaseInfo[]
  database: string
  schema: string
}

export default defineComponent({
  name: 'PostgreSQLParams',
  components: {
    ConnectionName,
    PasswordBox,
    Spinner,
    ArrowPathIcon,
    ChevronUpDownIcon,
    CheckIcon,
    Combobox,
    ComboboxInput,
    ComboboxButton,
    ComboboxOptions,
    ComboboxOption,
    TransitionRoot
  },
  setup() {
    const connectionsStore = useConnectionsStore()
    const { isLoadingDatabases } = storeToRefs(connectionsStore)

    const defaultConnection: PostgreSQLConnection = {
      id: '',
      name: '',
      type: 'postgresql',
      host: 'localhost',
      port: 5432,
      username: 'postgres',
      password: '',
      databasesInfo: [],
      database: 'postgres',
      schema: 'public'
    }

    const { connection, refreshDatabases, createDatabase, createSchema, isEdit } =
      useCommon<PostgreSQLConnection>(defaultConnection)

    const newDatabase = ref('')
    const newSchema = ref('')
    const query = ref('')
    const databases = computed(() => connection.databasesInfo.map((db) => db.name))
    const currentDatabaseSchemas = computed(() => {
      const currentDb = connection.databasesInfo.find((db) => db.name === connection.database)
      return currentDb?.schemas || []
    })
    const updateDatabase = (newDatabase: string) => {
      connection.database = newDatabase
      // Only set schema to 'public' by default when the database exists in the list
      const dbExists = databases.value.includes(newDatabase)
      if (dbExists) {
        const newDbSchemas = currentDatabaseSchemas.value
        connection.schema = newDbSchemas.includes('public') ? 'public' : newDbSchemas[0] || ''
      }
    }

    return {
      connection,
      databases,
      currentDatabaseSchemas,
      refreshDatabases,
      createDatabase,
      createSchema,
      newDatabase,
      newSchema,
      updateDatabase,
      query,
      isLoadingDatabases,
      isEdit
    }
  }
})
</script>
