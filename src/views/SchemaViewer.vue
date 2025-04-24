<script setup lang="ts">
import { onMounted } from 'vue'
import { useSchemaStore } from '@/stores/schema'
import SchemaViewer from '@/components/schema-viewer/SchemaViewer.vue'

const props = defineProps<{
    id: string
}>()

const schemaStore = useSchemaStore()

function handleReset() {
    schemaStore.resetView()
}

async function handleRefresh() {
    await schemaStore.fetchSchema(true)
}

onMounted(() => {
    schemaStore.setConnectionId(props.id)
    schemaStore.fetchSchema()
})
</script>

<template>
    <div class="h-full bg-gray-50">
        <div class="flex items-center justify-between p-4 bg-white border-b">
            <h1 class="text-xl font-semibold text-gray-900">Database Schema</h1>
            <div class="flex items-center space-x-4">
                <button
                    class="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    @click="handleReset">
                    Reset View
                </button>
                <button
                    class="px-3 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    @click="handleRefresh">
                    Refresh Schema
                </button>
            </div>
        </div>

        <div v-if="schemaStore.error" class="p-4 bg-red-50 border-b border-red-200">
            <p class="text-sm text-red-600">{{ schemaStore.error }}</p>
        </div>

        <div v-if="schemaStore.loading" class="h-[calc(100vh-4rem)] flex items-center justify-center">
            <div class="flex items-center space-x-2">
                <div class="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                <span class="text-sm text-gray-600">Loading schema...</span>
            </div>
        </div>

        <div v-else class="h-[calc(100vh-4rem)]">
            <SchemaViewer />
        </div>
    </div>
</template>