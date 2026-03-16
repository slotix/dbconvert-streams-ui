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
 * - Restrained accent active state
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
        'ui-focus-ring relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out',
        'focus:outline-none focus-visible:outline-none',
        modelValue
          ? 'ui-accent-switch-on'
          : 'ui-surface-inset focus-visible:border-(--ui-border-default)',
        disabled ? 'opacity-50 cursor-not-allowed' : ''
      ]"
      @update:model-value="handleChange"
    >
      <span class="sr-only">{{ label || 'Toggle switch' }}</span>
      <span
        aria-hidden="true"
        :class="[
          modelValue ? 'translate-x-5' : 'translate-x-0',
          'ui-surface-raised pointer-events-none inline-block h-5 w-5 transform rounded-full shadow ring-0 transition duration-200 ease-in-out'
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
          error ? 'ui-status-danger-text' : 'ui-text-strong',
          disabled ? 'opacity-60' : 'cursor-pointer'
        ]"
      >
        {{ label }}
        <span v-if="required" class="text-red-500 ml-0.5">*</span>
      </SwitchLabel>

      <SwitchDescription v-if="description" as="p" class="ui-text-muted mt-0.5 text-xs">
        {{ description }}
      </SwitchDescription>

      <!-- Helper Text or Error -->
      <p
        v-if="error || helperText"
        :class="['mt-1 text-xs', error ? 'ui-status-danger-text' : 'ui-text-muted']"
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
        'ui-focus-ring relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out',
        'focus:outline-none focus-visible:outline-none',
        modelValue
          ? 'ui-accent-switch-on'
          : 'ui-surface-inset focus-visible:border-(--ui-border-default)',
        disabled ? 'opacity-50 cursor-not-allowed' : ''
      ]"
      @update:model-value="handleChange"
    >
      <span class="sr-only">{{ label || 'Toggle switch' }}</span>
      <span
        aria-hidden="true"
        :class="[
          modelValue ? 'translate-x-5' : 'translate-x-0',
          'ui-surface-raised pointer-events-none inline-block h-5 w-5 transform rounded-full shadow ring-0 transition duration-200 ease-in-out'
        ]"
      />
    </Switch>
  </SwitchGroup>
</template>
