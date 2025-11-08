<template>
  <fieldset>
    <legend class="block text-sm font-medium leading-6 text-gray-900 dark:text-gray-100 mt-4">
      Capture Events:
    </legend>
    <div class="mt-2 flex flex-wrap items-center gap-x-3">
      <FormCheckbox
        v-for="operation in operationList"
        :key="operation"
        :id="generateId(operation)"
        :name="`${prefix}-operations`"
        :model-value="modelValue"
        :value="operation"
        :label="operation"
        @update:model-value="emit('update:modelValue', $event)"
      />
    </div>
  </fieldset>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { defaultStreamConfigOptions } from '@/stores/streamConfig'
import FormCheckbox from '@/components/base/FormCheckbox.vue'
interface Props {
  modelValue: string[]
  prefix?: string // New prop for unique ID prefix
}

const props = defineProps<Props>()

const emit = defineEmits(['update:modelValue'])

// Computed property to get the list of operations with a fallback to an empty array if undefined
const operationList = computed<string[]>(() => defaultStreamConfigOptions.operations ?? [])

// Function to generate unique IDs
const generateId = (operation: string): string => `${props.prefix}-${operation}`
</script>
