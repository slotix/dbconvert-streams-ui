<template>
    <div v-if="currentStream.selectedTableRow">
        <div class=" py-6 lg:px-10 md:col-span-2">
            <div class="flex-auto border-b border-gray-400 pb-5">
                <h3 class="text-base font-semibold leading-6 text-gray-900">Table <span
                        class="underline underline-offset-4 decoration-dashed decoration-gray-400">"{{
                            currentStream.selectedTableRow.name }}" </span> Options
                </h3>
            </div>
            <div v-if="currentStream.mode === 'convert'">
                <label for="about" class="block text-sm font-medium leading-6 text-gray-900 mt-4">Custom
                    Query. </label>
                <div class="mt-2">
                    <textarea v-model="currentStream.selectedTableRow.customQuery" id="custom-query" name="custom-query"
                        rows="2"
                        class="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-gray-600 sm:text-sm sm:leading-6"
                        placeholder="Integrate conditions, sorting, and limiting as needed..." />
                </div>
            </div>
            <div v-else>
                <label for="capture-events" class="block text-sm font-medium leading-6 text-gray-900 mt-4">Capture
                    Events.</label>
                <div class="mt-2">
                    <OperationsListBox v-model="currentStream.selectedTableRow.operations"
                        :tableOperations="currentStream.selectedTableRow.operations"
                        @update:tableOperations="changeTableOps(currentStream.selectedTableRow.operations, currentStream.selectedTableRow)" />
                </div>
            </div>
            <div class="mt-4">
                <input id="create-indexes" name="create-indexes" type="checkbox"
                    v-model="currentStream.selectedTableRow.createIndexes"
                    class="h-4 w-4 text-sm rounded border-gray-300 text-gray-600 focus:ring-gray-600" />
                <label for="create-indexes" class="text-sm font-medium text-gray-700 pl-2">Create Indexes on
                    target</label>
            </div>
        </div>
    </div>
</template>
<script setup>
import { useStreamsStore } from '@/stores/streams.js'
import OperationsListBox from '@/components/settings/OperationsListBox.vue'

const streamsStore = useStreamsStore()
const currentStream = streamsStore.currentStream

</script>
