<template>
  <Combobox v-model="selectedDBType" as="div">
    <div class="relative mt-2">
      <ComboboxInput
        class="w-full rounded-md border-0 bg-white py-1.5 pl-3 pr-12 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-gray-600 sm:text-sm sm:leading-6"
        :display-value="(tp: any) => tp?.type"
        @change="query = $event.target.value"
      />
      <ComboboxButton
        class="absolute inset-y-0 right-0 flex items-center rounded-r-md px-2 focus:outline-none"
      >
        <!-- Use v-if to conditionally show the icons based on the prop -->
        <FunnelIcon v-if="isFilterIcon" class="h-5 w-5 text-gray-400" aria-hidden="true" />
        <ChevronUpDownIcon v-else class="h-5 w-5 text-gray-400" aria-hidden="true" />
      </ComboboxButton>

      <ComboboxOptions
        v-if="filteredDbTypes.length > 0"
        class="ui-open:open absolute z-10 mt-1 max-h-56 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm"
      >
        <ComboboxOption
          v-for="tp in filteredDbTypes"
          :key="tp.id"
          v-slot="{ active, selected }"
          :value="tp"
          as="template"
        >
          <li
            :class="[
              'relative cursor-default select-none py-2 pl-3 pr-9',
              active ? 'bg-gray-600 text-white' : 'text-gray-900'
            ]"
          >
            <div class="flex items-center">
              <img :src="tp.logo" alt="" class="h-6 w-6 flex-shrink-0 rounded-full" />
              <span :class="['ml-3 truncate', selected && 'font-semibold']">
                {{ tp.type }}
              </span>
            </div>

            <span
              v-if="selected"
              :class="[
                'absolute inset-y-0 right-0 flex items-center pr-4',
                active ? 'text-white' : 'text-gray-600'
              ]"
            >
              <CheckIcon class="h-5 w-5" aria-hidden="true" />
            </span>
          </li>
        </ComboboxOption>
      </ComboboxOptions>
    </div>
  </Combobox>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { CheckIcon, ChevronUpDownIcon, FunnelIcon } from '@heroicons/vue/24/outline'
import { useConnectionsStore } from '@/stores/connections'
import {
  Combobox,
  ComboboxButton,
  ComboboxInput,
  ComboboxLabel,
  ComboboxOption,
  ComboboxOptions
} from '@headlessui/vue'

const dbTypes = useConnectionsStore().dbTypes
interface Props {
  isFilterIcon: boolean
}

const props = defineProps<Props>()
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
const emit = defineEmits(['update:selected-db-type'])
// Watch for changes in selectedDBType
watch(selectedDBType, (newVal) => {
  emit('update:selected-db-type', newVal)
})
</script>
