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
    'ui-accent-primary border disabled:[background-color:var(--ui-surface-inset)] disabled:[border-color:var(--ui-border-default)] disabled:text-gray-500 dark:disabled:text-gray-400',
  secondary:
    'ui-surface-raised ui-border-default border text-gray-700 dark:text-gray-300 hover:[background-color:var(--ui-surface-muted)] focus-visible:[background-color:var(--ui-surface-muted)] disabled:[background-color:var(--ui-surface-inset)] disabled:[border-color:var(--ui-border-default)] disabled:text-gray-400',
  danger:
    'ui-surface-raised text-red-600 dark:text-red-300 border border-red-300 dark:border-red-700 hover:bg-red-50 dark:hover:bg-red-900/30 hover:border-red-400 dark:hover:border-red-600 focus-visible:bg-red-50 dark:focus-visible:bg-red-900/30 focus-visible:border-red-400 dark:focus-visible:border-red-600 disabled:[background-color:var(--ui-surface-inset)] disabled:[border-color:var(--ui-border-default)] disabled:text-gray-400',
  ghost:
    'border border-transparent bg-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 hover:[background-color:var(--ui-surface-muted)] dark:hover:text-gray-200 focus-visible:text-gray-900 focus-visible:[background-color:var(--ui-surface-muted)] dark:focus-visible:text-gray-200 disabled:text-gray-400 disabled:hover:bg-transparent dark:disabled:hover:bg-transparent'
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
