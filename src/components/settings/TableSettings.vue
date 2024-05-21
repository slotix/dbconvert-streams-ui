<template>
    <div v-if="table">
        {{  table.name }}
        <div v-if="currentStream.mode === 'convert'">
            <label for="about" class="block text-sm font-medium leading-6 text-gray-900 mt-4">Custom Query.</label>
            <div class="">
                <textarea v-model="table.query" id="custom-query" name="custom-query" rows="2"
                    class="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-gray-600 sm:text-sm sm:leading-6"
                    placeholder="Integrate conditions, sorting, and limiting as needed..."
                     @input="updateStreamSettings"></textarea>
            </div>
        </div>
        <div v-else>
            <label for="capture-events" class="block text-sm font-medium leading-6 text-gray-900 mt-4">Capture
                Events.</label>
            <div class="mt-2">
                <Operations v-model="table.operations" />
            </div>
        </div>
        <div class="mt-4">
            <input id="create-indexes" name="create-indexes" type="checkbox" v-model="table.createIndexes"
                class="h-4 w-4 text-sm rounded border-gray-300 text-gray-600 focus:ring-gray-600"
                @change="updateStreamSettings" />
            <label for="create-indexes" class="text-sm font-medium text-gray-700 pl-2">Create Indexes on
                target</label>
        </div>
    </div>
</template>

<script setup>
import { defineProps , watch, onMounted } from 'vue';
// import OperationsListBox from '@/components/settings/OperationsListBox.vue';
import { useStreamsStore, defaultStreamOptions } from '@/stores/streams.js'
import Operations from './Operations.vue';

// Accept a prop for the specific table data
const props = defineProps({
    table: Object
});
const streamsStore = useStreamsStore()
const currentStream = streamsStore.currentStream

// const operations = computed({
//   get: () => currentStream.operations || defaultStreamOptions.operations,
//   set: (value) => { currentStream.operations = value; }
// });
// Ensure currentStream is initialized or has a default state in your store
// This could be done in the store's state function or using a specific action

// Use onMounted to set up the watcher after the component has been mounted,
// ensuring all refs and reactive properties are defined
onMounted(() => {
  if (props.table) {
    watch(() => props.table, (newTable) => {
      // Ensure currentStream is available and has the tables array
      if (streamsStore.currentStream && streamsStore.currentStream.tables) {
        const tableIndex = streamsStore.currentStream.tables.findIndex(t => t.name === newTable.name);
        if (tableIndex !== -1) {
          streamsStore.currentStream.tables[tableIndex] = {...newTable};
          // Consider using an action to update the table in the store, instead of directly mutating the state
        }
      }
    }, { deep: true });
  }
});

const updateStreamSettings = () => {
  // Trigger the store action to update the currentStream, if necessary
  // Make sure this action exists and properly updates the stream based on the provided ID
  if (streamsStore.currentStream) {
    streamsStore.setCurrentStream(streamsStore.currentStream.id);
  }
};
</script>