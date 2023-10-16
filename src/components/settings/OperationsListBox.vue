<template>
  <Listbox as="div" v-model="selectedOperations" multiple>
    <div class="relative mt-2">
      <ListboxButton
        class="relative w-full cursor-default rounded-md bg-white py-1.5 pl-3 pr-10 text-left text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-600 sm:text-sm sm:leading-6"
      >
        <span class="">{{ getFormattedOperations(selectedOperations) }}</span>
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
            as="template"
            v-for="operation in operations"
            :key="operation"
            :value="operation"
            v-slot="{ active, selected }"
          >
            <li
              :class="[
                active ? 'bg-gray-600 text-white' : 'text-gray-900',
                'relative cursor-default select-none py-2 pl-3 pr-9'
              ]"
            >
              <span
                class="pr-8"
                :class="[selected ? 'font-semibold' : 'font-normal', 'block truncate']"
                >{{ operation }}</span
              >
              <span
                v-if="selected"
                :class="[
                  active ? 'text-white' : 'text-gray-600',
                  'absolute inset-y-0 right-0 flex items-center pr-4'
                ]"
              >
                <CheckIcon class="h-5 w-5" aria-hidden="true" />
              </span>
            </li>
          </ListboxOption>
        </ListboxOptions>
      </transition>
    </div>
  </Listbox>
</template>
<script setup>
import { ref } from 'vue'
import { Listbox, ListboxButton, ListboxOption, ListboxOptions } from '@headlessui/vue'
import { CheckIcon, ChevronUpDownIcon } from '@heroicons/vue/20/solid'
import { useStreamsStore } from '@/stores/streams.js'
const props = defineProps({
  value: Array // Declare the value prop as an array
})
const emits = defineEmits(['update:value'])
const selectedOperations = ref(props.value)

const operationMap = useStreamsStore().operationMap
const operations = Object.keys(operationMap)
// Watch for changes in the selectedOperations and emit 'update:value'
watch(selectedOperations, (newValue) => {
  emits('update:value', newValue)
})

const getFormattedOperations = (operations) => {
  return operations.map((operation) => operationMap[operation] || operation).join(', ')
}
</script>
