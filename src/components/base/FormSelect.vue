<script setup lang="ts">
/**
 * FormSelect Component (Headless UI Listbox)
 *
 * A standardized select dropdown using Headless UI Listbox for better accessibility.
 * Follows the DBConvert Streams design system.
 *
 * Features:
 * - Full v-model support via Headless UI Listbox
 * - Better accessibility than native <select>
 * - Keyboard navigation built-in
 * - Consistent gray borders with teal focus rings
 * - Error state styling
 * - Label and helper text support
 *
 * @example
 * <FormSelect
 *   v-model="selectedType"
 *   label="Database Type"
 *   :options="[
 *     { value: 'mysql', label: 'MySQL' },
 *     { value: 'postgres', label: 'PostgreSQL' }
 *   ]"
 * />
 */

import { computed } from 'vue'
import {
  Listbox,
  ListboxButton,
  ListboxOptions,
  ListboxOption,
  ListboxLabel
} from '@headlessui/vue'
import { ChevronDownIcon, CheckIcon } from '@heroicons/vue/24/outline'

export interface SelectOption {
  value: string | number
  label: string
  disabled?: boolean
  icon?: string // Optional icon URL or component name
}

interface Props {
  modelValue?: string | number | null
  label?: string
  helperText?: string
  error?: string
  placeholder?: string
  disabled?: boolean
  required?: boolean
  options: SelectOption[]
}

const props = withDefaults(defineProps<Props>(), {
  disabled: false,
  required: false,
  placeholder: 'Select an option'
})

const emit = defineEmits<{
  'update:modelValue': [value: string | number | null]
  change: [value: string | number | null]
}>()

const selectedOption = computed(() => {
  return props.options.find((opt) => opt.value === props.modelValue) || null
})

const handleChange = (option: SelectOption | null) => {
  const value = option?.value ?? null
  emit('update:modelValue', value)
  emit('change', value)
}
</script>

<template>
  <Listbox
    :model-value="selectedOption"
    :disabled="disabled"
    as="div"
    class="w-full"
    @update:model-value="handleChange"
  >
    <!-- Label -->
    <ListboxLabel v-if="label" class="block text-sm font-medium text-gray-700 mb-1">
      {{ label }}
      <span v-if="required" class="text-red-500 ml-0.5">*</span>
    </ListboxLabel>

    <div class="relative">
      <!-- Button -->
      <ListboxButton
        :class="[
          'relative w-full rounded-md shadow-sm sm:text-sm py-2 pl-3 pr-10 text-left',
          'transition-colors duration-150',
          'focus:outline-none focus:ring-1',
          error
            ? 'border border-red-300 focus:border-red-500 focus:ring-red-500'
            : 'border border-gray-300 focus:border-teal-500 focus:ring-teal-500',
          disabled
            ? 'bg-gray-100 cursor-not-allowed text-gray-500'
            : 'bg-white text-gray-900 cursor-pointer'
        ]"
      >
        <span v-if="selectedOption" class="block truncate">
          {{ selectedOption.label }}
        </span>
        <span v-else class="block truncate text-gray-400">
          {{ placeholder }}
        </span>
        <span class="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
          <ChevronDownIcon class="h-5 w-5 text-gray-400" aria-hidden="true" />
        </span>
      </ListboxButton>

      <!-- Options Dropdown -->
      <transition
        leave-active-class="transition ease-in duration-100"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <ListboxOptions
          class="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-sm shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none"
        >
          <ListboxOption
            v-for="option in options"
            :key="option.value"
            v-slot="{ active, selected }"
            :value="option"
            :disabled="option.disabled"
            as="template"
          >
            <li
              :class="[
                active ? 'bg-teal-50 text-teal-900' : 'text-gray-900',
                option.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
                'relative select-none py-2 pl-3 pr-9'
              ]"
            >
              <span :class="[selected ? 'font-semibold' : 'font-normal', 'block truncate']">
                {{ option.label }}
              </span>

              <span
                v-if="selected"
                :class="[
                  active ? 'text-teal-600' : 'text-teal-600',
                  'absolute inset-y-0 right-0 flex items-center pr-3'
                ]"
              >
                <CheckIcon class="h-5 w-5" aria-hidden="true" />
              </span>
            </li>
          </ListboxOption>
        </ListboxOptions>
      </transition>
    </div>

    <!-- Helper Text or Error -->
    <p
      v-if="error || helperText"
      :class="['mt-1 text-xs', error ? 'text-red-600' : 'text-gray-500']"
    >
      {{ error || helperText }}
    </p>
  </Listbox>
</template>
