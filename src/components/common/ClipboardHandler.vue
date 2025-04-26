<script setup lang="ts">
import { ref } from 'vue'
import { useCommonStore } from '@/stores/common'
import CopyButton from './CopyButton.vue'

const props = defineProps<{
    placeholder?: string
}>()

const clipboardContent = ref('')
const commonStore = useCommonStore()

async function handlePaste(event: ClipboardEvent) {
    try {
        const text = event.clipboardData?.getData('text') || ''
        clipboardContent.value = text
    } catch (error) {
        commonStore.showNotification('Failed to read clipboard content', 'error')
    }
}
</script>

<template>
    <div class="flex flex-col gap-4">
        <div class="relative">
            <textarea v-model="clipboardContent" :placeholder="placeholder || 'Paste content here...'"
                class="w-full min-h-[100px] rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-gray-600 focus:border-transparent"
                @paste="handlePaste" />
            <div class="absolute top-2 right-2">
                <CopyButton :text="clipboardContent" />
            </div>
        </div>
    </div>
</template>

<style scoped>
textarea {
    resize: vertical;
}
</style>