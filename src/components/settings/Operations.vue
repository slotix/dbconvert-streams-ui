<template>
    <fieldset>
        <legend class="block text-sm font-medium leading-6 text-gray-900 mt-4">Capture Events:</legend>
        <div class="mt-2 flex flex-wrap items-center gap-x-3">
            <div v-for="operation in operationList" :key="operation" class="flex items-center">
                <input :id="operation" :name="operation" type="checkbox"
                    class="h-4 w-4 rounded border-gray-300 text-gray-600 focus:ring-gray-600"
                    :checked="isChecked(operation)"
                    @change="onOperationChange(operation, $event.target.checked)" />
                <label :for="operation" class="ml-2 font-medium text-gray-900">{{ operation }}</label>
            </div>
        </div>
    </fieldset>
</template>

<script setup>
import { computed } from 'vue';
import { defaultStreamOptions } from '@/stores/streams';

const props = defineProps({
    modelValue: {
        type: Array,
        default: () => [...defaultStreamOptions.operations] // Ensures a new array is created
    }
});

const emit = defineEmits(['update:modelValue']);

// Computed property to get the list of operations
const operationList = computed(() => defaultStreamOptions.operations);

// Function to check if an operation is selected
const isChecked = (operation) => props.modelValue.includes(operation);

// Event handler for checkbox changes
function onOperationChange(operation, isChecked) {
    const newValue = isChecked
        ? [...props.modelValue, operation]
        : props.modelValue.filter(op => op !== operation);
    emit('update:modelValue', newValue);
}
</script>
