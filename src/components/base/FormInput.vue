<script setup lang="ts">
/**
 * FormInput Component
 *
 * A standardized text input component following the DBConvert Streams design system.
 * Provides consistent styling across all form inputs while preserving full functionality.
 *
 * Features:
 * - Full v-model support (two-way binding)
 * - All standard input attributes (type, placeholder, disabled, etc.)
 * - Consistent gray borders with teal focus rings
 * - Error state styling
 * - Label and helper text support
 * - Forward all native input events
 *
 * @example
 * <FormInput
 *   v-model="name"
 *   label="Connection Name"
 *   placeholder="Enter name"
 *   required
 * />
 *
 * @example
 * <FormInput
 *   v-model="port"
 *   type="number"
 *   label="Port"
 *   :error="portError"
 * />
 */

interface Props {
  modelValue?: string | number
  label?: string
  helperText?: string
  error?: string
  type?: string
  placeholder?: string
  disabled?: boolean
  required?: boolean
  autocomplete?: string
  id?: string
  name?: string
  readonly?: boolean
  min?: number | string
  max?: number | string
  step?: number | string
  pattern?: string
  maxlength?: number
}

const props = withDefaults(defineProps<Props>(), {
  type: 'text',
  disabled: false,
  required: false,
  readonly: false
})

const emit = defineEmits<{
  'update:modelValue': [value: string | number]
  blur: [event: FocusEvent]
  focus: [event: FocusEvent]
  input: [event: Event]
  change: [event: Event]
  keydown: [event: KeyboardEvent]
  keyup: [event: KeyboardEvent]
  keypress: [event: KeyboardEvent]
}>()

const handleInput = (event: Event) => {
  const target = event.target as HTMLInputElement
  emit('update:modelValue', target.value)
  emit('input', event)
}

const handleChange = (event: Event) => {
  emit('change', event)
}

const handleBlur = (event: FocusEvent) => {
  emit('blur', event)
}

const handleFocus = (event: FocusEvent) => {
  emit('focus', event)
}

const handleKeydown = (event: KeyboardEvent) => {
  emit('keydown', event)
}

const handleKeyup = (event: KeyboardEvent) => {
  emit('keyup', event)
}

const handleKeypress = (event: KeyboardEvent) => {
  emit('keypress', event)
}

// Generate unique ID if not provided
const inputId = props.id || `form-input-${Math.random().toString(36).substr(2, 9)}`
</script>

<template>
  <div class="w-full">
    <!-- Label -->
    <label v-if="label" :for="inputId" class="block text-sm font-medium text-gray-700 mb-1">
      {{ label }}
      <span v-if="required" class="text-red-500 ml-0.5">*</span>
    </label>

    <!-- Input -->
    <input
      :id="inputId"
      :type="type"
      :value="modelValue"
      :placeholder="placeholder"
      :disabled="disabled"
      :required="required"
      :readonly="readonly"
      :autocomplete="autocomplete"
      :name="name"
      :min="min"
      :max="max"
      :step="step"
      :pattern="pattern"
      :maxlength="maxlength"
      :class="[
        'block w-full rounded-md shadow-sm sm:text-sm',
        'text-gray-900 placeholder-gray-400',
        'transition-colors duration-150',
        error
          ? 'border-red-300 focus:border-red-500 focus:ring-1 focus:ring-red-500'
          : 'border-gray-300 focus:border-teal-500 focus:ring-1 focus:ring-teal-500',
        disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'
      ]"
      @input="handleInput"
      @change="handleChange"
      @blur="handleBlur"
      @focus="handleFocus"
      @keydown="handleKeydown"
      @keyup="handleKeyup"
      @keypress="handleKeypress"
    />

    <!-- Helper Text or Error -->
    <p
      v-if="error || helperText"
      :class="['mt-1 text-xs', error ? 'text-red-600' : 'text-gray-500']"
    >
      {{ error || helperText }}
    </p>
  </div>
</template>
