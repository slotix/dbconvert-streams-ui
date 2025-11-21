<template>
  <div>
    <Combobox v-model="selectedBucket" nullable>
      <div class="relative">
        <label
          v-if="label"
          :for="inputId"
          class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
        >
          {{ label }}
          <span v-if="required" class="text-red-500">*</span>
        </label>

        <div class="relative">
          <ComboboxInput
            :id="inputId"
            class="block w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 bg-white dark:bg-gray-900 focus:border-teal-500 dark:focus:border-teal-400 focus:ring-1 focus:ring-teal-500 dark:focus:ring-teal-400 sm:text-sm pr-10"
            :placeholder="placeholder"
            :display-value="(bucket) => bucket"
            @change="query = $event.target.value"
          />
          <ComboboxButton
            class="absolute inset-y-0 right-0 flex items-center pr-2"
            :class="{ 'opacity-50 cursor-not-allowed': loading }"
          >
            <ChevronUpDownIcon v-if="!loading" class="h-5 w-5 text-gray-400" aria-hidden="true" />
            <ArrowPathIcon v-else class="h-5 w-5 text-gray-400 animate-spin" aria-hidden="true" />
          </ComboboxButton>
        </div>

        <TransitionRoot
          leave="transition ease-in duration-100"
          leave-from="opacity-100"
          leave-to="opacity-0"
          @after-leave="query = ''"
        >
          <ComboboxOptions
            class="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white dark:bg-gray-800 py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm"
          >
            <!-- Loading state -->
            <div
              v-if="loading"
              class="relative cursor-default select-none py-2 px-4 text-gray-700 dark:text-gray-300"
            >
              Loading buckets...
            </div>

            <!-- Error state -->
            <div
              v-else-if="error"
              class="relative cursor-default select-none py-2 px-4 text-red-600 dark:text-red-400"
            >
              {{ error }}
            </div>

            <!-- No results -->
            <div
              v-else-if="filteredBuckets.length === 0 && query !== ''"
              class="relative cursor-default select-none py-2 px-4 text-gray-700 dark:text-gray-300"
            >
              <div class="text-sm">No matching buckets found.</div>
              <div class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Press Enter to use "{{ query }}" as a custom bucket name.
              </div>
            </div>

            <!-- Bucket list -->
            <ComboboxOption
              v-for="bucket in filteredBuckets"
              :key="bucket"
              v-slot="{ selected, active }"
              as="template"
              :value="bucket"
            >
              <li
                :class="[
                  active ? 'bg-teal-600 text-white' : 'text-gray-900 dark:text-gray-100',
                  'relative cursor-pointer select-none py-2 pl-3 pr-9'
                ]"
              >
                <div class="flex items-center">
                  <ServerIcon
                    class="h-4 w-4 mr-2"
                    :class="active ? 'text-white' : 'text-gray-400'"
                  />
                  <span :class="[selected ? 'font-semibold' : 'font-normal', 'block truncate']">
                    {{ bucket }}
                  </span>
                </div>

                <span
                  v-if="selected"
                  :class="[
                    active ? 'text-white' : 'text-teal-600',
                    'absolute inset-y-0 right-0 flex items-center pr-4'
                  ]"
                >
                  <CheckIcon class="h-5 w-5" aria-hidden="true" />
                </span>
              </li>
            </ComboboxOption>
          </ComboboxOptions>
        </TransitionRoot>
      </div>
    </Combobox>

    <!-- Helper text -->
    <p v-if="helperText" class="mt-1 text-xs text-gray-500 dark:text-gray-400">
      {{ helperText }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import {
  Combobox,
  ComboboxInput,
  ComboboxButton,
  ComboboxOptions,
  ComboboxOption,
  TransitionRoot
} from '@headlessui/vue'
import { CheckIcon, ChevronUpDownIcon, ServerIcon, ArrowPathIcon } from '@heroicons/vue/24/outline'

interface Props {
  modelValue: string
  buckets?: string[]
  loading?: boolean
  error?: string | null
  label?: string
  placeholder?: string
  helperText?: string
  required?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  buckets: () => [],
  loading: false,
  error: null,
  label: '',
  placeholder: 'Select or type bucket name...',
  helperText: '',
  required: false
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const inputId = `bucket-combobox-${Math.random().toString(36).substring(2, 9)}`
const query = ref('')

const selectedBucket = computed({
  get: () => props.modelValue,
  set: (value) => {
    // If value is null (cleared), emit empty string
    if (value === null) {
      emit('update:modelValue', '')
      return
    }
    emit('update:modelValue', value)
  }
})

const filteredBuckets = computed(() => {
  if (!query.value) {
    return props.buckets
  }
  return props.buckets.filter((bucket) => bucket.toLowerCase().includes(query.value.toLowerCase()))
})

// When user types and presses enter, use the typed value even if not in list
watch(query, (newQuery) => {
  if (newQuery && newQuery.trim().length > 0) {
    // If query doesn't match any bucket and user is typing, allow custom value
    if (!props.buckets.some((b) => b.toLowerCase() === newQuery.toLowerCase())) {
      selectedBucket.value = newQuery
    }
  }
})
</script>
