<template>
    <div v-if="table">
        <div v-if="isConvertMode">
            <label :for="`custom-query-${table.name}`"
                class="block text-sm font-medium leading-6 text-gray-900 mt-4">Custom Query.</label>
            <div>
                <textarea v-model="table.query" :id="`custom-query-${table.name}`" :name="`custom-query-${table.name}`"
                    rows="2"
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
            <input :id="`create-indexes-${table.name}`" :name="`create-indexes-${table.name}`" type="checkbox"
                v-model="table.skipIndexCreation"
                class="h-4 w-4 text-sm rounded border-gray-300 text-gray-600 focus:ring-gray-600"
                @change="updateStreamSettings" />
            <label :for="`create-indexes-${table.name}`" class="text-sm font-medium text-gray-700 pl-2">Skip Index
                Creation</label>
        </div>
    </div>
</template>

<script setup lang="ts">
import { watch, onMounted, computed } from 'vue';
import { useStreamsStore } from '@/stores/streamConfig';
import Operations from './Operations.vue';
import { StreamConfig, Table } from '@/types/streamConfig';

const props = defineProps<{
    table: Table;
}>();

const streamsStore = useStreamsStore();
const currentStreamConfig = streamsStore.currentStreamConfig as StreamConfig | null;

const isConvertMode = computed(() => (currentStreamConfig?.mode === 'convert') || false);


onMounted(() => {
    if (props.table) {
        watch(() => props.table, (newTable) => {
            if (currentStreamConfig && currentStreamConfig.tables) {
                const tableIndex = currentStreamConfig.tables.findIndex(t => t.name === newTable.name);
                if (tableIndex !== -1) {
                    currentStreamConfig.tables[tableIndex] = { ...newTable };
                }
            }
        }, { deep: true });
    }
});
const updateStreamSettings = () => {
    if (streamsStore.currentStreamConfig) {
        const stream = streamsStore.currentStreamConfig;
        if (stream.tables) {
            const tableIndex = stream.tables.findIndex(t => t.name === props.table.name);
            if (tableIndex !== -1) {
                stream.tables[tableIndex] = { ...props.table };
                streamsStore.currentStreamConfig = { ...stream };
            }
        }
    }
};
</script>
