<template>
  <Combobox as="div" v-model="selectedItem">
    <div class="relative">
      <ComboboxInput
        v-model="query"
        class="w-full rounded-md border-0 bg-white py-1.5 pl-3 pr-10 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-gray-600 sm:text-sm sm:leading-6"
        @change="query = ($event.target as HTMLInputElement).value"
        :display-value="displayValue"
      />
      <ComboboxButton
        class="absolute inset-y-0 flex items-center rounded-r-md px-4 focus:outline-none"
        :class="isShowAddButton ? 'right-6' : 'right-0'"
      >
        <ChevronUpDownIcon class="h-5 w-5 text-gray-400" aria-hidden="true" />
      </ComboboxButton>

      <button
        v-if="isShowAddButton"
        :class="[
          'absolute inset-y-1 right-1 rounded-md bg-gray-100 flex items-center rounded-md',
          queryItem === '' ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
        ]"
        @click="addItem"
        :disabled="queryItem === ''"
      >
        <PlusIcon class="mx-2 h-5 w-5" />
      </button>
      <ComboboxOptions
        v-if="filteredItems.length > 0"
        :class="dropdownClasses"
      >
        <ComboboxOption
          v-for="item in filteredItems"
          :key="item"
          :value="item"
          as="template"
          v-slot="{ active, selected }"
        >
          <li
            :class="[
              'relative cursor-default select-none py-2 pl-3 pr-9',
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
</template>

<script setup lang="ts">
import { computed, ref, onMounted } from 'vue';
import { CheckIcon, ChevronUpDownIcon, PlusIcon } from '@heroicons/vue/20/solid';
import {
  Combobox,
  ComboboxButton,
  ComboboxInput,
  ComboboxOption,
  ComboboxOptions,
} from '@headlessui/vue';

interface Props {
  items: string[];
  isShowAddButton: boolean;
  openUpwards: boolean; // Add this prop to control the dropdown direction
}

const props = defineProps<Props>();
const emit = defineEmits(['addItem']);

const query = ref('');
const selectedItem = ref<string | null>(null);

const queryItem = computed(() => {
  return query.value === '' ? '' : query.value;
});

const filteredItems = computed(() =>
  query.value === ''
    ? props.items
    : props.items.filter((item) => {
        return item.toLowerCase().includes(query.value.toLowerCase());
      })
);

const displayValue = (item: unknown): string => {
  return item as string;
};

onMounted(() => {
  if (props.items.length > 0) {
    selectedItem.value = props.items[0];
  }
});

const addItem = () => {
  if (queryItem.value !== '') {
    emit('addItem', queryItem.value);
    query.value = '';
  }
};

// Compute the dropdown classes based on the openUpwards prop
const dropdownClasses = computed(() => {
  return [
    'absolute z-10 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm',
    props.openUpwards ? 'bottom-full mb-1' : 'mt-1'
  ];
});
</script>
