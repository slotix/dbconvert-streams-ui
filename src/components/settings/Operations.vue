<template>
    <fieldset>
        <legend class="block text-sm font-medium leading-6 text-gray-900 mt-4">Capture Events:</legend>
        <div class="mt-2 flex flex-wrap items-center gap-x-3">
            <div v-for="operation in operationList" :key="operation" class="flex items-center">
                <input :id="generateId(operation)" :name="operation" type="checkbox"
                    class="h-4 w-4 rounded border-gray-300 text-gray-600 focus:ring-gray-600"
                    :checked="isChecked(operation)"
                    @change="onOperationChange(operation, ($event.target as HTMLInputElement).checked)" />
                <label :for="generateId(operation)" class="ml-2 font-medium text-gray-900">{{ operation }}</label>
            </div>
        </div>
    </fieldset>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { defaultStreamOptions } from '@/stores/streams';
interface Props {
    modelValue: string[];
    prefix: string; // New prop for unique ID prefix
}

const props = defineProps<Props>();

const emit = defineEmits(['update:modelValue']);

// Computed property to get the list of operations with a fallback to an empty array if undefined
const operationList = computed<string[]>(() => defaultStreamOptions.operations ?? []);

// Function to generate unique IDs
const generateId = (operation: string): string => `${props.prefix}-${operation}`;

// Function to check if an operation is selected
const isChecked = (operation: string): boolean => props.modelValue.includes(operation);

// Event handler for checkbox changes
function onOperationChange(operation: string, isChecked: boolean) {
    const newValue = isChecked
        ? [...props.modelValue, operation]
        : props.modelValue.filter(op => op !== operation);
    emit('update:modelValue', newValue);
}
</script>
