<script setup lang="ts">
/**
 * FormCheckbox Component
 *
 * A standardized checkbox component following the DBConvert Streams design system.
 * Provides consistent styling across all checkboxes while preserving full functionality.
 *
 * Features:
 * - Full v-model support (boolean or array)
 * - Consistent gray borders with teal checked state
 * - Error state styling
 * - Label support (inline or custom via slot)
 * - Helper text support
 * - Forward all native checkbox events
 *
 * @example
 * <FormCheckbox
 *   v-model="agreed"
 *   label="I agree to the terms"
 * />
 *
 * @example
 * <FormCheckbox
 *   v-model="selectedOptions"
 *   value="option1"
 *   label="Option 1"
 *   :error="errorMessage"
 * />
 */

interface Props {
  modelValue?: boolean | unknown[]
  label?: string
  helperText?: string
  error?: string
  disabled?: boolean
  required?: boolean
  id?: string
  name?: string
  value?: string | number
  indeterminate?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  disabled: false,
  required: false,
  indeterminate: false
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean | unknown[]]
  change: [event: Event]
  blur: [event: FocusEvent]
  focus: [event: FocusEvent]
}>()

const handleChange = (event: Event) => {
  const target = event.target as HTMLInputElement

  if (Array.isArray(props.modelValue)) {
    // Array mode (for checkbox groups)
    const newValue = [...props.modelValue]
    if (target.checked) {
      newValue.push(props.value)
    } else {
      const index = newValue.indexOf(props.value)
      if (index > -1) {
        newValue.splice(index, 1)
      }
    }
    emit('update:modelValue', newValue)
  } else {
    // Boolean mode (single checkbox)
    emit('update:modelValue', target.checked)
  }

  emit('change', event)
}

const handleBlur = (event: FocusEvent) => {
  emit('blur', event)
}

const handleFocus = (event: FocusEvent) => {
  emit('focus', event)
}

// Determine if checkbox should be checked
const isChecked = (): boolean => {
  if (Array.isArray(props.modelValue)) {
    return props.modelValue.includes(props.value)
  }
  return !!props.modelValue
}

// Generate unique ID if not provided
const checkboxId = props.id || `form-checkbox-${Math.random().toString(36).substr(2, 9)}`
</script>

<template>
  <div>
    <div class="flex items-start">
      <div class="flex items-center h-5">
        <input
          :id="checkboxId"
          type="checkbox"
          :checked="isChecked()"
          :value="value"
          :disabled="disabled"
          :required="required"
          :name="name"
          :indeterminate="indeterminate"
          :class="[
            'h-4 w-4 rounded',
            'transition-colors duration-150',
            'focus:ring-2 focus:ring-offset-2',
            error
              ? 'border-red-300 text-red-600 focus:ring-red-500'
              : 'border-gray-300 text-teal-600 focus:ring-teal-500',
            disabled ? 'bg-gray-100 cursor-not-allowed' : 'cursor-pointer'
          ]"
          @change="handleChange"
          @blur="handleBlur"
          @focus="handleFocus"
        />
      </div>

      <div v-if="label || $slots.default" class="ml-3 text-sm">
        <label
          :for="checkboxId"
          :class="[
            'font-medium',
            error ? 'text-red-700' : 'text-gray-700',
            disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'
          ]"
        >
          <!-- Custom label via slot -->
          <slot>
            <!-- Default label text -->
            {{ label }}
            <span v-if="required" class="text-red-500 ml-0.5">*</span>
          </slot>
        </label>

        <!-- Helper Text or Error -->
        <p
          v-if="error || helperText"
          :class="['mt-0.5 text-xs', error ? 'text-red-600' : 'text-gray-500']"
        >
          {{ error || helperText }}
        </p>
      </div>
    </div>
  </div>
</template>
