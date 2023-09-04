
<template>
  <div class="px-4 sm:px-6 lg:px-8">
    <div class="flex items-center">
      <div class="flex-auto border-b border-gray-400 pb-5">
        <h3 class="text-base font-semibold leading-6 text-gray-900">Data transfer mode</h3>
      </div>
    </div>
    <div class="mt-6 flow-root">
      <Combobox as="div" v-model="selectedMode">
        <!-- <ComboboxLabel class="block text-sm font-medium leading-6 text-gray-900">Select data transfer mode:</ComboboxLabel> -->
        <div class="relative mt-2">
          <ComboboxInput
            class="w-full rounded-md border-0 bg-white py-1.5 pl-3 pr-12 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-gray-600 sm:text-sm sm:leading-6"
            @change="query = $event.target.value" :display-value="(mode) => mode?.title" />
          <ComboboxButton class="absolute inset-y-0 right-0 flex items-center rounded-r-md px-2 focus:outline-none">
            <ChevronUpDownIcon class="h-5 w-5 text-gray-400" aria-hidden="true" />
          </ComboboxButton>

          <ComboboxOptions
            class="ui-open:open absolute z-10 mt-1 max-h-56 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
            <ComboboxOption v-for="mode in modes" :key="mode.id" :value="mode" as="template"
              v-slot="{ active, selected }">
              <li :class="[
                'relative cursor-default select-none py-2 pl-3 pr-9',
                active ? 'bg-gray-600 text-white' : 'text-gray-900'
              ]">
                <div class="flex items-center">
                  <span :class="['ml-3 truncate', selected && 'font-semibold']">
                    {{ mode.title }}
                  </span>
                </div>

                <span v-if="selected" :class="[
                  'absolute inset-y-0 right-0 flex items-center pr-4',
                  active ? 'text-white' : 'text-gray-600'
                ]">
                  <CheckIcon class="h-5 w-5" aria-hidden="true" />
                </span>
              </li>
            </ComboboxOption>
          </ComboboxOptions>
        </div>
      </Combobox>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import { CheckIcon, ChevronUpDownIcon } from '@heroicons/vue/24/outline'
import { useStreamsStore } from '@/stores/streams.js'
import {
  Combobox,
  ComboboxButton,
  ComboboxInput,
  ComboboxLabel,
  ComboboxOption,
  ComboboxOptions
} from '@headlessui/vue'

const modes = useStreamsStore().modes
const currentStream = useStreamsStore().currentStream
const selectedMode = ref(modes.find(option => option.id === currentStream.mode) || modes[0]);
const query = ref('')

// Watch for changes in selectedDBType
watch(selectedMode, (newVal) => {
  currentStream.mode = newVal.id
})
</script>
