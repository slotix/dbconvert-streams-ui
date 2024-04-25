<template>
    <fieldset>
        <legend class="block text-sm font-medium leading-6 text-gray-900 mt-4">Capture Events:</legend>
        <div class="mt-2 flex flex-wrap items-center gap-x-3">
            <div v-for="operation in operationList" :key="operation">
                <div class="flex items-center">
                    <input :id="operation" :name="operation" type="checkbox"
                        class="h-4 w-4 rounded border-gray-300 text-gray-600 focus:ring-gray-600" :value="operation"
                        v-model="operations" />
                    <label :for="operation" class="ml-2 font-medium text-gray-900">{{ operation }}</label>
                </div>
            </div>
        </div>
    </fieldset>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useStreamsStore, defaultStreamOptions } from '@/stores/streams.js'

const operationList = ['insert', 'update', 'delete']
const currentStream = useStreamsStore().currentStream
const operations = ref(currentStream.cdcOperations || defaultStreamOptions.cdcOperations)

watch(operations, (newValue, oldValue) => {
    currentStream.cdcOperations = newValue
})
</script>
