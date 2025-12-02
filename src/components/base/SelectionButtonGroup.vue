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
    <div :class="['grid gap-2', gridColsClass[columns]]">
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
            'rounded-md font-medium transition-all duration-150',
            'focus:outline-none focus:ring-2 focus:ring-offset-2 cursor-pointer',
            sizeClasses[size],
            checked
              ? 'bg-teal-600 dark:bg-teal-900 text-white border border-transparent dark:border-teal-600 hover:bg-teal-700 dark:hover:bg-teal-800 focus:ring-teal-500 dark:focus:ring-teal-400'
              : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-400 dark:hover:border-gray-500 focus:ring-gray-500',
            (disabled || option.disabled) && 'opacity-60 cursor-not-allowed',
            showCheckIcon && checked
              ? 'flex items-center justify-center gap-2'
              : 'flex items-center justify-center'
          ]"
        >
          <RadioGroupLabel as="span">
            {{ option.label }}
          </RadioGroupLabel>
          <CheckCircleIcon v-if="showCheckIcon && checked" class="h-5 w-5" aria-hidden="true" />
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
