<template>
    <fieldset>
        <legend class="block text-sm font-medium leading-6 text-gray-900 mt-4">Capture Events:</legend>
        <div class="mt-2 flex flex-wrap items-center gap-x-3">
            <div v-for="operation in operationList" :key="operation">
                <div class="flex items-center">
                    <input :id="operation" :name="operation" type="checkbox"
                        class="h-4 w-4 rounded border-gray-300 text-gray-600 focus:ring-gray-600"
                        :checked="modelValue.includes(operation)"
                        @change="onOperationChange(operation, $event.target.checked)" />
                    <label :for="operation" class="ml-2 font-medium text-gray-900">{{ operation }}</label>
                </div>
            </div>
        </div>
    </fieldset>
</template>

<script setup>

import { defaultStreamOptions } from '@/stores/streams'
const operationList = defaultStreamOptions.operations

const props = defineProps({
    modelValue: {
        type: Array,
        // Use the defaultOperations constant as the default value
        default: () => [...defaultStreamOptions.operations] // Using spread to ensure a new array is created
    }
});

const emit = defineEmits(['update:modelValue']);

// Event handler for checkbox changes
function onOperationChange(operation, isChecked) {
    const newValue = isChecked
        ? [...props.modelValue, operation]
        : props.modelValue.filter(op => op !== operation);
    emit('update:modelValue', newValue);
}
</script>