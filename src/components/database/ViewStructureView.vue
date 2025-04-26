<script setup lang="ts">
import { computed } from 'vue'
import { ArrowPathIcon } from '@heroicons/vue/24/outline'
import { type SQLViewMeta } from '@/types/metadata'

const props = defineProps<{
    viewMeta: SQLViewMeta
    showDdl?: boolean
    connectionId: string
}>()

const emit = defineEmits<{
    (e: 'refresh-metadata'): void
}>()
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
            <button @click="emit('refresh-metadata')"
                class="inline-flex items-center rounded-md bg-white px-2.5 py-1.5 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50">
                <ArrowPathIcon class="h-4 w-4 mr-1" />
                Refresh
            </button>
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
            <div class="overflow-x-auto">
                <pre v-highlightjs
                    class="hljs rounded-md p-4"><code class="language-sql">{{ viewMeta.definition }}</code></pre>
            </div>
        </div>

        <!-- Dependencies -->
        <div v-if="viewMeta.dependsOn?.length" class="px-6 py-4">
            <h4 class="text-sm font-medium text-gray-900 mb-4">Dependencies</h4>
            <ul class="list-disc list-inside text-sm text-gray-600">
                <li v-for="dep in viewMeta.dependsOn" :key="dep">{{ dep }}</li>
            </ul>
        </div>

        <!-- DDL -->
        <div v-if="showDdl" class="px-6 py-4">
            <h4 class="text-sm font-medium text-gray-900 mb-4">DDL</h4>
            <div class="overflow-x-auto">
                <pre v-highlightjs
                    class="hljs rounded-md p-4"><code class="language-sql">{{ viewMeta.ddl }}</code></pre>
            </div>
        </div>
    </div>
</template>

<style>
.hljs {
    @apply bg-gray-800;
    color: #abb2bf;
}

/* Add styles to ensure proper background colors */
.hljs-keyword {
    @apply text-purple-400;
}

.hljs-string {
    @apply text-green-400;
}

.hljs-number {
    @apply text-orange-400;
}

.hljs-operator {
    @apply text-sky-400;
}

.hljs-punctuation {
    @apply text-gray-400;
}

.hljs-comment {
    @apply text-gray-500;
}
</style>