<script setup lang="ts">
import { Loader2 } from 'lucide-vue-next'
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
  'inline-flex items-center justify-center gap-2 font-medium rounded-md transition-all duration-150 focus:outline-none focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60'

const variantClasses: Record<Variant, string> = {
  primary:
    'ui-accent-primary border disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:text-gray-500 dark:disabled:text-gray-400 disabled:border-gray-600',
  secondary:
    'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-400 dark:hover:border-gray-500 focus-visible:bg-gray-50 dark:focus-visible:bg-gray-700 focus-visible:border-gray-400 dark:focus-visible:border-gray-500 disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:text-gray-400',
  danger:
    'bg-white dark:bg-gray-800 text-red-600 dark:text-red-300 border border-red-300 dark:border-red-700 hover:bg-red-50 dark:hover:bg-red-900/30 hover:border-red-400 dark:hover:border-red-600 focus-visible:bg-red-50 dark:focus-visible:bg-red-900/30 focus-visible:border-red-400 dark:focus-visible:border-red-600 disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:text-gray-400',
  ghost:
    'bg-transparent text-gray-600 dark:text-gray-400 border border-transparent hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-200 focus-visible:bg-gray-100 dark:focus-visible:bg-gray-800 focus-visible:text-gray-900 dark:focus-visible:text-gray-200 disabled:text-gray-400 disabled:hover:bg-transparent dark:disabled:hover:bg-transparent'
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
    <Loader2 v-if="loading" class="animate-spin h-4 w-4" aria-hidden="true" />

    <!-- Button Content -->
    <slot />
  </button>
</template>
