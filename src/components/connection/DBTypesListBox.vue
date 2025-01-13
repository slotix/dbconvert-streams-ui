<template>
  <div>
    <Listbox v-model="selectedDBType" as="div">
      <div class="relative mt-8 mr-4">
        <ListboxButton
          class="relative w-full cursor-default rounded-md bg-white py-1.5 pl-3 pr-10 text-left text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 sm:text-sm sm:leading-6"
        >
          <span class="flex items-center">
            <img :src="selectedDBType.logo" alt="" class="h-5 w-5 flex-shrink-0 rounded-full" />
            <span class="ml-3 block truncate">{{ selectedDBType.type }}</span>
          </span>
          <span class="pointer-events-none absolute inset-y-0 right-0 ml-3 flex items-center pr-4">
            <ChevronUpDownIcon class="h-5 w-5 text-gray-400" aria-hidden="true" />
          </span>
        </ListboxButton>

        <transition
          leave-active-class="transition ease-in duration-100"
          leave-from-class="opacity-100"
          leave-to-class="opacity-0"
        >
          <ListboxOptions
            v-if="dbTypes.length > 0"
            class="absolute z-10 mt-1 max-h-56 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm"
          >
            <ListboxOption
              v-for="dbt in dbTypes"
              :key="dbt.id"
              v-slot="{ active, selected }"
              as="template"
              :value="dbt"
            >
              <li
                :class="[
                  active ? 'bg-gray-600 text-white' : 'text-gray-900',
                  'relative cursor-default select-none py-2 pl-3 pr-9'
                ]"
              >
                <div class="flex items-center">
                  <img :src="dbt.logo" alt="" class="h-5 w-5 flex-shrink-0 rounded-full" />
                  <span
                    :class="[
                      selected ? 'font-semibold' : 'font-normal',
                      'ml-3 mr-6 block truncate min-w-full'
                    ]"
                    >{{ dbt.type }}</span
                  >
                </div>

                <span
                  v-if="selected"
                  :class="[
                    active ? 'text-white' : 'text-gray-600',
                    'absolute inset-y-0 right-0 flex items-center mr-1'
                  ]"
                >
                  <CheckIcon class="ml-6 h-5 w-5" aria-hidden="true" />
                </span>
              </li>
            </ListboxOption>
          </ListboxOptions>
        </transition>
      </div>
    </Listbox>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import { Listbox, ListboxButton, ListboxOption, ListboxOptions } from '@headlessui/vue'
import { CheckIcon, ChevronUpDownIcon } from '@heroicons/vue/24/outline'
import { useConnectionsStore } from '@/stores/connections'

const connectionsStore = useConnectionsStore()
const fetchedDbTypes = connectionsStore.dbTypes
const dbTypes = ref(fetchedDbTypes.slice(1))

const props = defineProps({
  modelValue: {
    type: Object,
    default: null
  }
})

const selectedDBType = ref(props.modelValue || dbTypes.value[0])

const emit = defineEmits(['update:selected-db-type'])

onMounted(() => {
  emit('update:selected-db-type', selectedDBType.value)
})

watch(selectedDBType, (newVal) => {
  emit('update:selected-db-type', newVal)
})

// Watch for external changes to modelValue
watch(
  () => props.modelValue,
  (newVal) => {
    if (newVal) {
      selectedDBType.value = newVal
    }
  },
  { immediate: true }
)
</script>
