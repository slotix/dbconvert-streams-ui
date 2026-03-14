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
import { CheckCircle } from 'lucide-vue-next'

interface SelectionOption {
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
              ? 'ui-accent-selection-checked'
              : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700',
            active && !checked ? 'ui-accent-selection-active' : '',
            'relative flex items-start cursor-pointer rounded-lg border p-3 transition-all duration-150 focus:outline-none focus-visible:outline-none flex-1',
            (disabled || option.disabled) && 'opacity-60 cursor-not-allowed'
          ]"
        >
          <div class="flex items-center h-5">
            <input
              :checked="checked"
              type="radio"
              class="ui-accent-icon h-4 w-4 border-gray-300 bg-white dark:border-gray-500 dark:bg-gray-700 focus:outline-none"
            />
          </div>
          <div class="ml-3 flex-1">
            <div class="flex items-center justify-between">
              <RadioGroupLabel
                as="div"
                :class="['text-gray-900 dark:text-gray-100', 'text-sm font-medium cursor-pointer']"
              >
                {{ option.label }}
              </RadioGroupLabel>
              <CheckCircle
                v-if="showCheckIcon && checked"
                class="ui-accent-icon h-5 w-5"
                aria-hidden="true"
              />
            </div>
            <RadioGroupDescription
              v-if="option.description"
              as="p"
              :class="[
                checked ? 'text-gray-600 dark:text-gray-300' : 'text-gray-500 dark:text-gray-400',
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
    <p v-if="error" class="mt-2 text-sm text-red-600 dark:text-red-300">
      {{ error }}
    </p>
  </RadioGroup>
</template>
