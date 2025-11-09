<script setup lang="ts">
/**
 * BaseButton Component
 *
 * A standardized button component following the DBConvert Streams design system.
 *
 * Variants:
 * - primary: Main actions (Create, Save, Start) - Teal background
 * - secondary: Supporting actions (Cancel, Back) - White background, gray border
 * - danger: Destructive actions (Delete) - White background, red border
 * - ghost: Tertiary actions (Edit, View) - Transparent background
 *
 * @example
 * <BaseButton variant="primary">Create Stream</BaseButton>
 * <BaseButton variant="secondary">Cancel</BaseButton>
 * <BaseButton variant="danger" @click="handleDelete">Delete</BaseButton>
 */

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost'
type Size = 'sm' | 'md' | 'lg'

interface Props {
  variant?: Variant
  size?: Size
  disabled?: boolean
  loading?: boolean
  type?: 'button' | 'submit' | 'reset'
  fullWidth?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'secondary',
  size: 'md',
  type: 'button',
  disabled: false,
  loading: false,
  fullWidth: false
})

const emit = defineEmits<{
  click: [event: MouseEvent]
}>()

const baseClasses =
  'inline-flex items-center justify-center gap-2 font-medium rounded-md transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60'

const variantClasses: Record<Variant, string> = {
  primary:
    'bg-teal-600 dark:bg-teal-900 text-white border border-transparent dark:border-teal-600 hover:bg-teal-700 dark:hover:bg-teal-800 hover:border-teal-700 dark:hover:border-teal-500 focus:ring-teal-500 dark:focus:ring-teal-400 disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:text-gray-500 dark:disabled:text-gray-400 dark:disabled:border-gray-600',
  secondary:
    'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-400 dark:hover:border-gray-500 focus:ring-gray-500 dark:focus:ring-gray-400 disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:text-gray-400',
  danger:
    'bg-white dark:bg-gray-800 text-red-600 dark:text-red-400 border border-red-300 dark:border-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 hover:border-red-400 dark:hover:border-red-600 focus:ring-red-500 dark:focus:ring-red-400 disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:text-gray-400',
  ghost:
    'bg-transparent text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-200 focus:ring-gray-400 disabled:text-gray-400 disabled:hover:bg-transparent dark:disabled:hover:bg-transparent'
}

const sizeClasses: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-base'
}

const handleClick = (event: MouseEvent) => {
  if (!props.disabled && !props.loading) {
    emit('click', event)
  }
}
</script>

<template>
  <button
    :type="type"
    :disabled="disabled || loading"
    :class="[baseClasses, variantClasses[variant], sizeClasses[size], fullWidth ? 'w-full' : '']"
    @click="handleClick"
  >
    <!-- Loading Spinner -->
    <svg
      v-if="loading"
      class="animate-spin h-4 w-4"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
      <path
        class="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>

    <!-- Button Content -->
    <slot />
  </button>
</template>
