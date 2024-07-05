<template>
    <div v-if="table">
        <div v-if="isConvertMode">
            <label for="custom-query" class="block text-sm font-medium leading-6 text-gray-900 mt-4">Custom Query.</label>
            <div>
                <textarea v-model="table.query" id="custom-query" name="custom-query" rows="2"
                    class="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-gray-600 sm:text-sm sm:leading-6"
                    placeholder="Integrate conditions, sorting, and limiting as needed..."
                    @input="updateStreamSettings"></textarea>
            </div>
        </div>
        <div v-else>
            <div class="mt-2">
                <Operations v-model="table.operations" :prefix="table.name" />
            </div>
        </div>
        <div class="mt-4">
            <input id="create-indexes" name="create-indexes" type="checkbox" v-model="table.createIndexes"
                class="h-4 w-4 text-sm rounded border-gray-300 text-gray-600 focus:ring-gray-600"
                @change="updateStreamSettings" />
            <label for="create-indexes" class="text-sm font-medium text-gray-700 pl-2">Create Indexes on target</label>
        </div>
    </div>
</template>

<script setup lang="ts">
import { watch, onMounted, computed } from 'vue';
import { useStreamsStore} from '@/stores/streams';
import Operations from './Operations.vue';
import { Stream, Table } from '@/types/streams';

const props = defineProps<{
    table: Table;
}>();

const streamsStore = useStreamsStore();
const currentStream = streamsStore.currentStream as Stream | null;

const isConvertMode = computed(() => currentStream?.mode === 'convert' ?? false);

onMounted(() => {
    if (props.table) {
        watch(() => props.table, (newTable) => {
            if (currentStream && currentStream.tables) {
                const tableIndex = currentStream.tables.findIndex(t => t.name === newTable.name);
                if (tableIndex !== -1) {
                    currentStream.tables[tableIndex] = { ...newTable };
                }
            }
        }, { deep: true });
    }
});

const updateStreamSettings = () => {
    if (streamsStore.currentStream) {
        streamsStore.setCurrentStream(streamsStore.currentStream.id);
    }
};
</script>
