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
 * - Consistent gray borders with border/background focus states
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
    <label v-if="label" :for="inputId" class="ui-text-default block text-sm font-medium mb-1">
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
        'ui-focus-ring block w-full rounded-md shadow-sm sm:text-sm',
        'ui-text-strong placeholder:text-(--ui-text-subtle)',
        'transition-colors duration-150 focus:outline-none focus-visible:outline-none',
        error
          ? 'border-(--ui-danger-soft-border-strong) focus:border-(--ui-danger-soft-border-strong) focus:bg-(--ui-danger-soft-bg)'
          : 'ui-border-default ui-accent-focus',
        disabled ? 'ui-surface-muted ui-text-subtle cursor-not-allowed' : 'ui-surface-raised'
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
      :class="['mt-1 text-xs', error ? 'ui-status-danger-text' : 'ui-text-muted']"
    >
      {{ error || helperText }}
    </p>
  </div>
</template>
