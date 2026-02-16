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
import { Check, ChevronDown } from 'lucide-vue-next'

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
  dropdownFooter?: string
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
    <ListboxLabel
      v-if="label"
      class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
    >
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
            ? 'border border-red-300 dark:border-red-600 focus:border-red-500 dark:focus:border-red-400 focus:ring-red-500 dark:focus:ring-red-400'
            : 'border border-gray-300 dark:border-gray-600 focus:border-teal-500 dark:focus:border-teal-400 focus:ring-teal-500 dark:focus:ring-teal-400',
          disabled
            ? 'bg-gray-100 dark:bg-gray-700 cursor-not-allowed text-gray-500 dark:text-gray-400'
            : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 cursor-pointer'
        ]"
      >
        <span v-if="selectedOption" class="block truncate">
          {{ selectedOption.label }}
        </span>
        <span v-else class="block truncate text-gray-400 dark:text-gray-500">
          {{ placeholder }}
        </span>
        <span class="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
          <ChevronDown class="h-5 w-5 text-gray-400 dark:text-gray-500" aria-hidden="true" />
        </span>
      </ListboxButton>

      <!-- Options Dropdown -->
      <transition
        leave-active-class="transition ease-in duration-100"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <ListboxOptions
          class="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white dark:bg-gray-800 py-1 text-sm shadow-lg ring-1 ring-black dark:ring-gray-600 ring-opacity-5 dark:ring-opacity-100 focus:outline-none"
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
                active
                  ? 'bg-teal-50 dark:bg-teal-900 text-teal-900 dark:text-teal-300'
                  : 'text-gray-900 dark:text-gray-100',
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
                  active ? 'text-teal-600 dark:text-teal-400' : 'text-teal-600 dark:text-teal-400',
                  'absolute inset-y-0 right-0 flex items-center pr-3'
                ]"
              >
                <Check class="h-5 w-5" aria-hidden="true" />
              </span>
            </li>
          </ListboxOption>
          <li
            v-if="dropdownFooter"
            aria-hidden="true"
            class="px-3 py-1.5 text-[11px] text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-gray-700 mt-1"
          >
            {{ dropdownFooter }}
          </li>
        </ListboxOptions>
      </transition>
    </div>

    <!-- Helper Text or Error -->
    <p
      v-if="error || helperText"
      :class="[
        'mt-1 text-xs',
        error ? 'text-red-600 dark:text-red-400' : 'text-gray-500 dark:text-gray-400'
      ]"
    >
      {{ error || helperText }}
    </p>
  </Listbox>
</template>
