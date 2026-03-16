<script setup lang="ts">
/**
 * FormSelect Component (Headless UI Listbox)
 *
 * A standardized select dropdown using Headless UI Listbox for better accessibility.
 * Follows the DBConvert Streams design system.
 *
 * Features:
 * - Full v-model support via Headless UI Listbox
 * - Better accessibility than native <select>
 * - Keyboard navigation built-in
 * - Consistent gray borders with border/background focus states
 * - Error state styling
 * - Label and helper text support
 *
 * @example
 * <FormSelect
 *   v-model="selectedType"
 *   label="Database Type"
 *   :options="[
 *     { value: 'mysql', label: 'MySQL' },
 *     { value: 'postgres', label: 'PostgreSQL' }
 *   ]"
 * />
 */

import { computed } from 'vue'
import {
  Listbox,
  ListboxButton,
  ListboxOptions,
  ListboxOption,
  ListboxLabel
} from '@headlessui/vue'
import { Check, ChevronDown } from 'lucide-vue-next'
import type {
  SelectDividerOption,
  SelectHeaderOption,
  SelectOption,
  SelectValueOption
} from './formSelectTypes'

interface Props {
  modelValue?: string | number | null
  label?: string
  helperText?: string
  dropdownFooter?: string
  error?: string
  placeholder?: string
  disabled?: boolean
  required?: boolean
  compact?: boolean
  buttonClass?: string
  optionsScrollable?: boolean
  optionsMaxHeightClass?: string
  placement?: 'bottom' | 'top'
  options: SelectOption[]
}

const props = withDefaults(defineProps<Props>(), {
  disabled: false,
  required: false,
  placeholder: 'Select an option',
  compact: false,
  buttonClass: '',
  optionsScrollable: true,
  optionsMaxHeightClass: 'max-h-60',
  placement: 'bottom'
})

const emit = defineEmits<{
  'update:modelValue': [value: string | number | null]
  change: [value: string | number | null]
}>()

function isHeaderOption(option: SelectOption): option is SelectHeaderOption {
  return option.type === 'header'
}

function isDividerOption(option: SelectOption): option is SelectDividerOption {
  return option.type === 'divider'
}

function isValueOption(option: SelectOption): option is SelectValueOption {
  return !isHeaderOption(option) && !isDividerOption(option)
}

function getOptionKey(option: SelectOption, index: number): string {
  if (isHeaderOption(option)) return `header:${option.label}:${index}`
  if (isDividerOption(option)) return `divider:${index}`
  return `option:${String(option.value)}`
}

const selectedOption = computed<SelectValueOption | null>(() => {
  const match = props.options.find((opt): opt is SelectValueOption => {
    return isValueOption(opt) && opt.value === props.modelValue
  })
  return match ?? null
})

const handleChange = (option: SelectValueOption | null) => {
  const value = option?.value ?? null
  emit('update:modelValue', value)
  emit('change', value)
}

const buttonSizeClass = computed(() =>
  props.compact ? 'text-xs py-1.5 pl-2.5 pr-9' : 'sm:text-sm py-2 pl-3 pr-10'
)

const chevronSizeClass = computed(() => (props.compact ? 'h-4 w-4' : 'h-5 w-5'))

const optionsTextClass = computed(() => (props.compact ? 'text-xs' : 'text-sm'))

const optionPaddingClass = computed(() => (props.compact ? 'py-1.5 pr-8' : 'py-2 pr-9'))

const selectedIconClass = computed(() => (props.compact ? 'h-4 w-4' : 'h-5 w-5'))

const optionsBehaviorClass = computed(() => {
  if (props.optionsScrollable) {
    return [props.optionsMaxHeightClass, 'overflow-auto'].filter(Boolean).join(' ')
  }
  return 'max-h-none overflow-visible'
})
</script>

<template>
  <Listbox
    :model-value="selectedOption"
    :disabled="disabled"
    as="div"
    class="w-full"
    @update:model-value="handleChange"
  >
    <!-- Label -->
    <ListboxLabel v-if="label" class="ui-text-default block text-sm font-medium mb-1">
      {{ label }}
      <span v-if="required" class="text-red-500 ml-0.5">*</span>
    </ListboxLabel>

    <div class="relative">
      <!-- Button -->
      <ListboxButton
        :class="[
          'ui-focus-ring relative w-full rounded-md shadow-sm text-left',
          buttonSizeClass,
          'transition-colors duration-150',
          'focus:outline-none focus-visible:outline-none',
          error
            ? 'border border-(--ui-danger-soft-border-strong) focus:border-(--ui-danger-soft-border-strong) focus:bg-(--ui-danger-soft-bg)'
            : 'ui-border-default ui-accent-focus border',
          disabled
            ? 'ui-surface-muted ui-text-subtle cursor-not-allowed'
            : 'ui-surface-raised ui-text-strong cursor-pointer',
          buttonClass
        ]"
      >
        <span v-if="selectedOption" class="block truncate">
          {{ selectedOption.selectedLabel || selectedOption.label }}
        </span>
        <span v-else class="ui-text-subtle block truncate">
          {{ placeholder }}
        </span>
        <span class="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
          <ChevronDown :class="[chevronSizeClass, 'ui-icon-muted']" aria-hidden="true" />
        </span>
      </ListboxButton>

      <!-- Options Dropdown -->
      <transition
        leave-active-class="transition ease-in duration-100"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <ListboxOptions
          :class="[
            'ui-surface-floating absolute z-50 w-full py-1 focus:outline-none',
            placement === 'top' ? 'bottom-full mb-1' : 'mt-1',
            optionsBehaviorClass,
            optionsTextClass
          ]"
        >
          <template v-for="(option, index) in options" :key="getOptionKey(option, index)">
            <li
              v-if="isHeaderOption(option)"
              aria-hidden="true"
              class="ui-text-muted px-3 pt-2 pb-1 text-[10px] font-semibold tracking-[0.08em] uppercase"
            >
              {{ option.label }}
            </li>
            <li
              v-else-if="isDividerOption(option)"
              aria-hidden="true"
              class="ui-border-muted mx-2 my-1 h-px border-t"
            />
            <ListboxOption
              v-else
              v-slot="{ active, selected }"
              :value="option"
              :disabled="option.disabled"
              as="template"
            >
              <li
                :class="[
                  active ? 'ui-accent-option-active' : 'ui-text-strong',
                  option.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
                  option.indented ? 'pl-6' : 'pl-3',
                  'relative select-none',
                  optionPaddingClass
                ]"
              >
                <span :class="[selected ? 'font-semibold' : 'font-normal', 'block truncate']">
                  {{ option.label }}
                </span>

                <span
                  v-if="selected"
                  :class="['ui-accent-icon', 'absolute inset-y-0 right-0 flex items-center pr-3']"
                >
                  <Check :class="selectedIconClass" aria-hidden="true" />
                </span>
              </li>
            </ListboxOption>
          </template>
          <li
            v-if="dropdownFooter"
            aria-hidden="true"
            class="ui-border-default ui-text-muted mt-1 border-t px-3 py-1.5 text-[11px]"
          >
            {{ dropdownFooter }}
          </li>
        </ListboxOptions>
      </transition>
    </div>

    <!-- Helper Text or Error -->
    <p
      v-if="error || helperText"
      :class="['mt-1 text-xs', error ? 'ui-status-danger-text' : 'ui-text-muted']"
    >
      {{ error || helperText }}
    </p>
  </Listbox>
</template>
