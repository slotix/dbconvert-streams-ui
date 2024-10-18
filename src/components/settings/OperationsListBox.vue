<template>
  <Listbox v-model="selectedOperations" as="div" multiple>
    <div class="relative mt-2">
      <ListboxButton
        class="relative w-full cursor-default rounded-md bg-white py-1.5 pl-3 pr-10 text-left text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-600 sm:text-sm sm:leading-6"
      >
        <span class="">{{ formattedOperations(selectedOperations) }}</span>
        <span class="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
          <ChevronUpDownIcon class="h-5 w-5 text-gray-400" aria-hidden="true" />
        </span>
      </ListboxButton>
      <transition
        leave-active-class="transition ease-in duration-100"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <ListboxOptions
          class="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm"
        >
          <ListboxOption
            v-for="operation in operations"
            :key="operation"
            v-slot="{ active, selected }"
            as="template"
            :value="operation"
          >
            <li
              :class="[
                active ? 'bg-gray-600 text-white' : 'text-gray-900',
                'relative cursor-default select-none py-2 pl-3 pr-9'
              ]"
            >
              <span
                v-if="selected"
                :class="[
                  active ? 'text-white' : 'text-gray-600',
                  'absolute inset-y-0 left-3 flex items-center pr-4'
                ]"
              >
                <CheckCircleIcon class="h-5 w-5" aria-hidden="true" />
              </span>
              <span
                class="pl-8"
                :class="[selected ? 'font-semibold' : 'font-normal', 'block truncate']"
                >{{ operation }}</span
              >
            </li>
          </ListboxOption>
        </ListboxOptions>
      </transition>
    </div>
  </Listbox>
</template>
<script setup>
import { ref, watch } from 'vue'
import { Listbox, ListboxButton, ListboxOption, ListboxOptions } from '@headlessui/vue'
import { CheckCircleIcon, ChevronUpDownIcon } from '@heroicons/vue/20/solid'
import { useCommonStore } from '@/stores/common.js'
const props = defineProps({
  tableOperations: Array
})
const emits = defineEmits(['update:tableOperations'])
const selectedOperations = ref(props.tableOperations)

const operationMap = useCommonStore().operationMap
const operations = Object.keys(operationMap)
// Watch for changes in the selectedOperations and emit 'update:tableOperations'
watch(selectedOperations, (newValue) => {
  emits('update:tableOperations', newValue)
})

const formattedOperations = (operations) => {
  return operations.map((operation) => operationMap[operation] || operation).join(', ')
}
</script>
