<!-- A reusable component for displaying SQL code with syntax highlighting -->
<script setup lang="ts">
import CopyButton from '@/components/common/CopyButton.vue'

defineProps<{
    code: string
    title?: string
    index?: number | string
}>()
</script>

<template>
    <div class="rounded-lg overflow-hidden border border-gray-200">
        <div class="bg-gray-100 flex items-center justify-between px-4 py-2 border-b border-gray-200">
            <span class="text-sm font-medium text-gray-700">
                <template v-if="index">{{ title }} {{ index }}</template>
                <template v-else>{{ title }}</template>
            </span>
            <CopyButton :text="code" />
        </div>
        <div class="bg-white">
            <div class="relative">
                <div class="absolute left-0 top-0 bottom-0 w-12 bg-[#f8f9fa] border-r border-gray-200">
                    <div class="py-8">
                        <div v-for="n in (code || '').split('\n').length" :key="n"
                            class="h-[24px] flex items-end justify-end px-3 text-xs font-mono text-gray-400 pb-1">
                            {{ n }}
                        </div>
                    </div>
                </div>
                <div class="overflow-x-auto">
                    <pre v-highlightjs class="pl-14 py-4 text-sm"><code class="language-sql block leading-[24px]">{{ code
                    }}</code></pre>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
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

/* Ensure line numbers and code lines align perfectly */
pre code {
    display: block;
    line-height: 24px;
}
</style>

<style>
.hljs {
    @apply bg-white;
    color: #24292e;
    font-family: 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
    padding: 0;
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
</style>