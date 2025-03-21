<template>
  <div>
    <Combobox v-model="selectedItem" as="div">
      <div class="relative">
        <ComboboxInput
          v-model="query"
          class="w-full rounded-lg border border-gray-300 bg-white py-1.5 pl-3 pr-10 text-gray-700 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-gray-600 sm:text-sm sm:leading-6 focus:border-transparent"
          :display-value="displayValue"
          @change="query = ($event.target as HTMLInputElement).value"
        />
        <ComboboxButton
          class="absolute inset-y-0 flex items-center rounded-r-md px-4 focus:outline-none right-6"
        >
          <ChevronUpDownIcon class="h-5 w-5 text-gray-400" aria-hidden="true" />
        </ComboboxButton>
        <button
          :class="[
            'absolute inset-y-1 right-1 rounded-md bg-gray-100 flex items-center',
            queryItem === '' ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
          ]"
          @click="toggleShowAll"
        >
          <component :is="filterIcon" class="mx-2 h-5 w-5 text-gray-600" />
        </button>
        <ComboboxOptions v-if="filteredItems.length > 0" :class="dropdownClasses">
          <ComboboxOption
            v-for="item in filteredItems"
            :key="item"
            v-slot="{ active, selected }"
            :value="item"
            as="template"
          >
            <li
              :class="[
                'relative cursor-default select-none py-2 pl-3 pr-9 border-b border-gray-300 last:border-0',
                active ? 'bg-gray-600 text-white' : 'text-gray-900'
              ]"
            >
              <span :class="['block truncate', selected && 'font-semibold']">
                {{ item }}
              </span>
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
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { CheckIcon, ChevronUpDownIcon, FunnelIcon } from '@heroicons/vue/24/outline'
import SlashedFunnelIcon from './SlashedFunnelIcon.vue' // Import the new slashed funnel icon
import {
  Combobox,
  ComboboxButton,
  ComboboxInput,
  ComboboxOption,
  ComboboxOptions
} from '@headlessui/vue'

interface Props {
  items: string[]
  openUpwards: boolean
  modelValue: string | null
}

const props = defineProps<Props>()
const emit = defineEmits(['update:modelValue', 'addItem'])

const query = ref('')
const selectedItem = ref<string | null>(props.modelValue)
const showAll = ref(false)

const queryItem = computed(() => {
  return query.value === '' ? '' : query.value
})

const filteredItems = computed(() => {
  if (showAll.value) return props.items
  return query.value === ''
    ? props.items
    : props.items.filter((item) => {
        return item.toLowerCase().includes(query.value.toLowerCase())
      })
})

const displayValue = (item: unknown): string => {
  return item as string
}

watch(selectedItem, (newValue) => {
  emit('update:modelValue', newValue)
})

watch(
  () => props.modelValue,
  (newValue) => {
    selectedItem.value = newValue
    query.value = newValue || ''
  }
)

onMounted(() => {
  if (props.modelValue) {
    selectedItem.value = props.modelValue
  } else if (props.items.length > 0) {
    selectedItem.value = props.items[0]
  }
})

const toggleShowAll = () => {
  showAll.value = !showAll.value
}

const filterIcon = computed(() => (showAll.value ? SlashedFunnelIcon : FunnelIcon))

// Compute the dropdown classes based on the openUpwards prop
const dropdownClasses = computed(() => {
  return [
    'absolute z-10 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm border border-gray-400',
    props.openUpwards ? 'bottom-full mb-1' : 'mt-1'
  ]
})
</script>
