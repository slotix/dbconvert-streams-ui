<!-- A reusable component for displaying SQL code with syntax highlighting -->
<script setup lang="ts">
import { format } from 'sql-formatter'
import { computed } from 'vue'
import CopyButton from '@/components/common/CopyButton.vue'
import { getFormattingOptions } from '@/components/database/sqlDialect'

const props = defineProps<{
  code: string
  title?: string
  index?: number | string
  dialect: 'mysql' | 'postgresql' | 'sql'
}>()


const formattedCode = computed(() => {
  try {
    return format(props.code, getFormattingOptions(props.dialect))
  } catch (error) {
    console.warn('SQL formatting failed, falling back to original code:', error)
    return props.code
  }
})

</script>

<template>
  <div class="rounded-lg overflow-hidden border border-gray-200">
    <div class="flex items-center justify-between px-4 py-2 bg-gray-100 border-b border-gray-200">
      <span class="text-sm font-medium text-gray-700">{{ index ? `${title} ${index}` : title }}</span>
      <CopyButton :text="code" />
    </div>
    <div class="relative bg-white">
      <div class="absolute inset-y-0 left-0 w-12 bg-[#f8f9fa] border-r border-gray-200">
        <div class="py-8">
          <div v-for="n in formattedCode.split('\n').length" :key="n"
            class="h-6 flex items-end justify-end px-3 text-xs font-mono text-gray-400 pb-1">
            {{ n }}
          </div>
        </div>
      </div>
      <div class="overflow-x-auto custom-scrollbar">
        <pre v-highlightjs
          class="pl-14 py-4"><code class="language-sql block text-sm leading-6 select-text">{{ formattedCode }}</code></pre>
      </div>
    </div>
  </div>
</template>

<style>
/* Base styles */
.custom-scrollbar {
  scrollbar-width: thin;
  scrollbar-color: #e5e7eb transparent;
}

.custom-scrollbar::-webkit-scrollbar {
  @apply h-2 w-2;
}

.custom-scrollbar::-webkit-scrollbar-track {
  @apply bg-gray-50;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
  @apply bg-gray-300 rounded-full hover:bg-gray-400 transition-colors;
}

/* Code block styles */
pre {
  tab-size: 4;
  user-select: text;
}

::selection {
  @apply bg-blue-100;
}

/* Syntax highlighting */
.hljs {
  @apply bg-white font-mono;
  color: #24292e;
  padding: 0;
}

.hljs-keyword {
  @apply text-[#d73a49] font-semibold;
}

.hljs-string {
  @apply text-[#032f62];
}

.hljs-number {
  @apply text-[#005cc5];
}

.hljs-operator {
  @apply text-[#d73a49];
}

.hljs-punctuation {
  @apply text-[#24292e];
}

.hljs-comment {
  @apply text-[#6a737d] italic;
}
</style>
