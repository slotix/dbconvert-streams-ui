<script setup lang="ts">
import { computed } from 'vue'
import { ArrowPathIcon } from '@heroicons/vue/24/outline'
import { type SQLViewMeta } from '@/types/metadata'
import SqlCodeBlock from './SqlCodeBlock.vue'
import CopyButton from '@/components/common/CopyButton.vue'

const props = defineProps<{
    viewMeta: SQLViewMeta
    connectionId: string
}>()

const emit = defineEmits<{
    (e: 'refresh-metadata'): void
}>()

function handleCopy(code: string) {
    navigator.clipboard.writeText(code)
}
</script>

<template>
    <div v-if="viewMeta" class="divide-y divide-gray-200">
        <!-- Header with refresh button -->
        <div class="px-6 py-4 flex justify-between items-center">
            <div>
                <h3 class="text-base font-semibold leading-6 text-gray-900">
                    {{ viewMeta.name }}
                    <span v-if="viewMeta.isMaterialized" class="ml-2 text-sm text-gray-500">(Materialized)</span>
                </h3>
                <p v-if="viewMeta.schema" class="mt-1 text-sm text-gray-500">Schema: {{ viewMeta.schema }}</p>
            </div>
            <div class="flex items-center gap-4">
                <CopyButton :text="viewMeta.definition" />
                <button @click="emit('refresh-metadata')"
                    class="inline-flex items-center rounded-md bg-white px-2.5 py-1.5 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50">
                    <ArrowPathIcon class="h-4 w-4 mr-1" />
                    Refresh
                </button>
            </div>
        </div>

        <!-- Columns -->
        <div class="px-6 py-4">
            <h4 class="text-sm font-medium text-gray-900 mb-4">Columns</h4>
            <div class="overflow-x-auto">
                <table class="min-w-full divide-y divide-gray-300">
                    <thead>
                        <tr>
                            <th scope="col"
                                class="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-0">
                                Name
                            </th>
                            <th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                                Type
                            </th>
                            <th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                                Nullable
                            </th>
                            <th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                                Default
                            </th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-200">
                        <tr v-for="column in viewMeta.columns" :key="column.Name">
                            <td class="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-0">
                                {{ column.Name }}
                            </td>
                            <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                                {{ column.DataType }}
                            </td>
                            <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                                {{ column.IsNullable ? 'Yes' : 'No' }}
                            </td>
                            <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                                {{ column.DefaultValue?.Valid ? column.DefaultValue.String : '-' }}
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>

        <!-- View Definition -->
        <div class="px-6 py-4">
            <h4 class="text-sm font-medium text-gray-900 mb-4">Definition</h4>
            <SqlCodeBlock :code="viewMeta.definition" title="View Definition" @copy="handleCopy" />
        </div>

        <!-- Dependencies -->
        <div v-if="viewMeta.dependsOn?.length" class="px-6 py-4">
            <h4 class="text-sm font-medium text-gray-900 mb-4">Dependencies</h4>
            <ul class="list-disc list-inside text-sm text-gray-600">
                <li v-for="dep in viewMeta.dependsOn" :key="dep">{{ dep }}</li>
            </ul>
        </div>
    </div>
</template>

<style>
.hljs {
    @apply bg-white;
    color: #24292e;
    font-family: 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
}

/* SQL specific syntax highlighting */
.hljs-keyword {
    @apply text-[#d73a49] font-semibold;
    /* red */
}

.hljs-string {
    @apply text-[#032f62];
    /* blue */
}

.hljs-number {
    @apply text-[#005cc5];
    /* blue */
}

.hljs-operator {
    @apply text-[#d73a49];
    /* red */
}

.hljs-punctuation {
    @apply text-[#24292e];
    /* black */
}

.hljs-comment {
    @apply text-[#6a737d] italic;
    /* gray */
}

/* Scrollbar styling */
.overflow-x-auto {
    scrollbar-width: thin;
    scrollbar-color: #e5e7eb transparent;
}

.overflow-x-auto::-webkit-scrollbar {
    height: 8px;
    width: 8px;
}

.overflow-x-auto::-webkit-scrollbar-track {
    @apply bg-gray-50;
}

.overflow-x-auto::-webkit-scrollbar-thumb {
    @apply bg-gray-300 rounded-full hover:bg-gray-400 transition-colors;
}

/* Selection styling */
::selection {
    @apply bg-blue-100;
}

pre {
    tab-size: 4;
}
</style>