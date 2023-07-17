<template>
  <Combobox as="div" v-model="selectedDBType">
    <div class="relative mt-2">
      <ComboboxInput class="w-full rounded-md border-0 bg-white py-1.5 pl-3 pr-12 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-gray-600 sm:text-sm sm:leading-6" @change="query = $event.target.value" :display-value="(tp) => tp?.type" />
      <ComboboxButton class="absolute inset-y-0 right-0 flex items-center rounded-r-md px-2 focus:outline-none">
        <FunnelIcon class="h-5 w-5 text-gray-400" aria-hidden="true" />
      </ComboboxButton>

      <ComboboxOptions v-if="filteredDbTypes.length > 0" class="absolute z-10 mt-1 max-h-56 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
        <ComboboxOption v-for="tp in filteredDbTypes" :key="tp.id" :value="tp" as="template" v-slot="{ active, selected }">
          <li :class="['relative cursor-default select-none py-2 pl-3 pr-9', active ? 'bg-gray-600 text-white' : 'text-gray-900']">
            <div class="flex items-center">
              <img :src="tp.logo" alt="" class="h-6 w-6 flex-shrink-0 rounded-full" />
              <span :class="['ml-3 truncate', selected && 'font-semibold']">
                {{ tp.type }}
              </span>
            </div>

            <span v-if="selected" :class="['absolute inset-y-0 right-0 flex items-center pr-4', active ? 'text-white' : 'text-gray-600']">
              <CheckIcon class="h-5 w-5" aria-hidden="true" />
            </span>
          </li>
        </ComboboxOption>
      </ComboboxOptions>
    </div>
  </Combobox>
</template>

<script setup>
import { computed, ref, getCurrentInstance, watch } from 'vue'
import { CheckIcon, FunnelIcon } from '@heroicons/vue/24/outline'
import {
  Combobox,
  ComboboxButton,
  ComboboxInput,
  ComboboxLabel,
  ComboboxOption,
  ComboboxOptions,
} from '@headlessui/vue'

const dbTypes = [
  {
    id: 0,
    type: "All",
    logo: "src/assets/images/db-logos/all.svg"
  },
  {
    id: 1,
    type: "PostgreSQL",
    logo: "src/assets/images/db-logos/postgresql.svg"
  },
  {
    id: 2,
    type: "MySQL",
    logo: "src/assets/images/db-logos/mysql.svg"
  },
  {
    id: 3,
    type: "SQLServer",
    logo: "src/assets/images/db-logos/sql-server.svg"
  },
  {
    id: 4,
    type: "Azure",
    logo: "src/assets/images/db-logos/azure.svg"
  },
  {
    id: 5,
    type: "Oracle",
    logo: "src/assets/images/db-logos/oracle.svg"
  },
  {
    id: 6,
    type: "DB2",
    logo: "src/assets/images/db-logos/db2.svg"
  },
  {
    id: 7,
    type: "Firebird",
    logo: "src/assets/images/db-logos/firebird.svg"
  },
  {
    id: 8,
    type: "Interbase",
    logo: "src/assets/images/db-logos/interbase.svg"
  },
  {
    id: 9,
    type: "Access",
    logo: "src/assets/images/db-logos/access.svg"
  },
  {
    id: 10,
    type: "FoxPro",
    logo: "src/assets/images/db-logos/foxpro.svg"
  },
  {
    id: 11,
    type: "SQLite",
    logo: "src/assets/images/db-logos/sqlite.svg"
  }
];
const selectedDBType = ref(dbTypes[0])
const query = ref('')
const filteredDbTypes = computed(() =>
  query.value === ''
    ? dbTypes
    : dbTypes.filter((tp) => {
        return tp.type.toLowerCase().includes(query.value.toLowerCase())
      })
)

// Emitting the selectedDBType value to the parent component
const emit = getCurrentInstance()?.emit; // Retrieve the emit function
// Watch for changes in selectedDBType
watch(selectedDBType, (newVal) => {
  console.log(newVal)
  emit('update:selected-db-type', newVal.type);
});
</script>
