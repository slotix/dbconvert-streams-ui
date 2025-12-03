<script setup lang="ts">
/**
 * SelectionButtonGroup Component (Headless UI RadioGroup)
 *
 * A standardized button group using Headless UI RadioGroup for single-select options.
 * Used for file format picker pattern and similar radio-button-style selections.
 *
 * Features:
 * - Full v-model support via Headless UI RadioGroup
 * - Better accessibility than native radio inputs
 * - Keyboard navigation built-in
 * - Teal active state with ring for selected item
 * - Gray hover states for unselected items
 * - Consistent focus rings
 * - Label and helper text support
 * - Responsive grid layout
 *
 * @example
 * <SelectionButtonGroup
 *   v-model="fileFormat"
 *   label="File Format"
 *   :options="[
 *     { value: 'csv', label: 'CSV', description: 'Comma-separated values' },
 *     { value: 'jsonl', label: 'JSONL', description: 'JSON Lines' },
 *     { value: 'parquet', label: 'Parquet', description: 'Columnar format' }
 *   ]"
 * />
 */

import { computed } from 'vue'
import {
  RadioGroup,
  RadioGroupLabel,
  RadioGroupOption,
  RadioGroupDescription
} from '@headlessui/vue'
import { CheckCircleIcon } from '@heroicons/vue/20/solid'

export interface SelectionOption {
  value: string | number
  label: string
  description?: string
  disabled?: boolean
}

interface Props {
  modelValue?: string | number
  label?: string
  helperText?: string
  error?: string
  required?: boolean
  disabled?: boolean
  options: SelectionOption[]
  columns?: 2 | 3 | 4 | 5 | 6
  size?: 'sm' | 'md' | 'lg'
  showCheckIcon?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  columns: 3,
  size: 'md',
  disabled: false,
  required: false,
  showCheckIcon: false
})

const emit = defineEmits<{
  'update:modelValue': [value: string | number]
  change: [value: string | number]
}>()

const handleChange = (value: string | number) => {
  emit('update:modelValue', value)
  emit('change', value)
}

const sizeClasses = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-base'
}

const gridColsClass = {
  2: 'grid-cols-2',
  3: 'grid-cols-3',
  4: 'grid-cols-4',
  5: 'grid-cols-5',
  6: 'grid-cols-6'
}

// Find active option's description
const activeDescription = computed(() => {
  const activeOption = props.options.find((opt) => opt.value === props.modelValue)
  return activeOption?.description
})
</script>

<template>
  <RadioGroup :model-value="modelValue" :disabled="disabled" @update:model-value="handleChange">
    <!-- Label -->
    <RadioGroupLabel
      v-if="label"
      class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
    >
      {{ label }}
      <span v-if="required" class="text-red-500 ml-0.5">*</span>
    </RadioGroupLabel>

    <!-- Button Grid -->
    <div :class="['flex gap-4']">
      <RadioGroupOption
        v-for="option in options"
        :key="option.value"
        v-slot="{ active, checked }"
        :value="option.value"
        :disabled="disabled || option.disabled"
        as="template"
      >
        <div
          :class="[
            checked
              ? 'bg-teal-50 dark:bg-teal-900/20 border-teal-200 dark:border-teal-700'
              : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700',
            active ? 'ring-2 ring-teal-500 ring-offset-2' : '',
            'relative flex items-start cursor-pointer rounded-lg border p-3 transition-all duration-150 focus:outline-none flex-1',
            (disabled || option.disabled) && 'opacity-60 cursor-not-allowed'
          ]"
        >
          <div class="flex items-center h-5">
            <input
              :checked="checked"
              type="radio"
              class="h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-300 dark:border-gray-500 bg-white dark:bg-gray-700"
            />
          </div>
          <div class="ml-3 flex-1">
            <div class="flex items-center justify-between">
              <RadioGroupLabel
                as="div"
                :class="[
                  checked ? 'text-teal-900 dark:text-teal-100' : 'text-gray-900 dark:text-gray-100',
                  'text-sm font-medium cursor-pointer'
                ]"
              >
                {{ option.label }}
              </RadioGroupLabel>
              <CheckCircleIcon
                v-if="showCheckIcon && checked"
                class="h-5 w-5 text-teal-600 dark:text-teal-400"
                aria-hidden="true"
              />
            </div>
            <RadioGroupDescription
              v-if="option.description"
              as="p"
              :class="[
                checked ? 'text-teal-700 dark:text-teal-300' : 'text-gray-500 dark:text-gray-400',
                'text-xs mt-1'
              ]"
            >
              {{ option.description }}
            </RadioGroupDescription>
          </div>
        </div>
      </RadioGroupOption>
    </div>

    <!-- Helper Text or Active Description -->
    <RadioGroupDescription
      v-if="helperText || activeDescription"
      as="p"
      class="mt-2 text-sm text-gray-500 dark:text-gray-400"
    >
      {{ helperText || activeDescription }}
    </RadioGroupDescription>

    <!-- Error Message -->
    <p v-if="error" class="mt-2 text-sm text-red-600 dark:text-red-400">
      {{ error }}
    </p>
  </RadioGroup>
</template>
