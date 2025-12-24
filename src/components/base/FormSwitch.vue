<script setup lang="ts">
/**
 * FormSwitch Component (Headless UI Switch)
 *
 * A standardized toggle switch using Headless UI Switch for better accessibility.
 * Follows the DBConvert Streams design system.
 *
 * Features:
 * - Full v-model support via Headless UI Switch
 * - Better accessibility than checkboxes for on/off states
 * - Keyboard navigation built-in
 * - Teal active state
 * - Label and helper text support
 * - Optional description
 *
 * @example
 * <FormSwitch
 *   v-model="sslEnabled"
 *   label="Enable SSL/TLS"
 *   description="Secure connection with SSL/TLS encryption"
 * />
 */

import { Switch, SwitchGroup, SwitchLabel, SwitchDescription } from '@headlessui/vue'

interface Props {
  modelValue?: boolean
  label?: string
  description?: string
  helperText?: string
  error?: string
  disabled?: boolean
  required?: boolean
  labelPosition?: 'left' | 'right'
}

withDefaults(defineProps<Props>(), {
  modelValue: false,
  disabled: false,
  required: false,
  labelPosition: 'right'
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  change: [value: boolean]
}>()

const handleChange = (value: boolean) => {
  emit('update:modelValue', value)
  emit('change', value)
}
</script>

<template>
  <SwitchGroup as="div" class="flex items-start gap-3">
    <!-- Switch (left position) -->
    <Switch
      v-if="labelPosition === 'right'"
      :model-value="modelValue"
      :disabled="disabled"
      :class="[
        'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out',
        'focus:outline-none focus:ring-2 focus:ring-offset-2',
        modelValue
          ? 'bg-teal-600 dark:bg-teal-500 focus:ring-teal-500 dark:focus:ring-teal-400'
          : 'bg-gray-200 dark:bg-gray-700 focus:ring-gray-500 dark:focus:ring-gray-600',
        disabled ? 'opacity-50 cursor-not-allowed' : ''
      ]"
      @update:model-value="handleChange"
    >
      <span class="sr-only">{{ label || 'Toggle switch' }}</span>
      <span
        aria-hidden="true"
        :class="[
          modelValue ? 'translate-x-5' : 'translate-x-0',
          'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out'
        ]"
      />
    </Switch>

    <!-- Label and Description -->
    <div v-if="label || description" class="flex-1">
      <SwitchLabel
        v-if="label"
        as="span"
        :class="[
          'text-sm font-medium',
          error ? 'text-red-700 dark:text-red-400' : 'text-gray-900 dark:text-gray-300',
          disabled ? 'opacity-60' : 'cursor-pointer'
        ]"
      >
        {{ label }}
        <span v-if="required" class="text-red-500 ml-0.5">*</span>
      </SwitchLabel>

      <SwitchDescription
        v-if="description"
        as="p"
        class="text-xs text-gray-500 dark:text-gray-400 mt-0.5"
      >
        {{ description }}
      </SwitchDescription>

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
    </div>

    <!-- Switch (right position) -->
    <Switch
      v-if="labelPosition === 'left'"
      :model-value="modelValue"
      :disabled="disabled"
      :class="[
        'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out',
        'focus:outline-none focus:ring-2 focus:ring-offset-2',
        modelValue
          ? 'bg-teal-600 dark:bg-teal-500 focus:ring-teal-500 dark:focus:ring-teal-400'
          : 'bg-gray-200 dark:bg-gray-700 focus:ring-gray-500 dark:focus:ring-gray-600',
        disabled ? 'opacity-50 cursor-not-allowed' : ''
      ]"
      @update:model-value="handleChange"
    >
      <span class="sr-only">{{ label || 'Toggle switch' }}</span>
      <span
        aria-hidden="true"
        :class="[
          modelValue ? 'translate-x-5' : 'translate-x-0',
          'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out'
        ]"
      />
    </Switch>
  </SwitchGroup>
</template>
