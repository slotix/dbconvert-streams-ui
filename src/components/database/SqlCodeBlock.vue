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
  dialect: string
  compact?: boolean
}>()

const formattedCode = computed(() => {
  try {
    // For compact mode, just return the code as-is (it's already properly formatted)
    if (props.compact) {
      return props.code
    }

    // For normal mode, use sql-formatter with configured options
    const options = getFormattingOptions(props.dialect)
    return format(props.code, options)
  } catch (error) {
    // Silently fall back for abbreviated queries (contain " -- [" comment syntax)
    const isAbbreviatedQuery = props.code.includes(' -- [')
    if (!isAbbreviatedQuery) {
      console.warn('SQL formatting failed, falling back to original code:', error)
    }
    return props.code
  }
})
</script>

<template>
  <div class="rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
    <div
      class="flex items-center justify-between px-4 py-2 bg-gray-100 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700"
    >
      <span class="text-sm font-medium text-gray-700 dark:text-gray-300">{{
        index ? `${title} ${index}` : title
      }}</span>
      <CopyButton :text="code" />
    </div>
    <div class="relative bg-white dark:bg-gray-900">
      <div
        class="absolute inset-y-0 left-0 w-12 bg-[#f8f9fa] dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700"
      >
        <div class="py-8">
          <div
            v-for="n in formattedCode.split('\n').length"
            :key="n"
            class="h-6 flex items-end justify-end px-3 text-xs font-mono text-gray-400 dark:text-gray-500 pb-1"
          >
            {{ n }}
          </div>
        </div>
      </div>
      <div class="overflow-x-auto custom-scrollbar">
        <pre
          v-highlightjs
          class="pl-14 py-4"
        ><code class="language-sql block text-sm leading-6 select-text dark:text-gray-200">{{ formattedCode }}</code></pre>
      </div>
    </div>
  </div>
</template>

<style>
@reference '../../assets/style.css';

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
  @apply bg-blue-100 dark:bg-blue-800;
}

/* Syntax highlighting - with dark mode support */
.hljs {
  @apply bg-white dark:bg-gray-900 font-mono text-[#24292e] dark:text-[#e6edf3];
  padding: 0;
}

.hljs-keyword {
  @apply text-[#d73a49] dark:text-[#ff7b72] font-semibold;
}

.hljs-string {
  @apply text-[#032f62] dark:text-[#a5d6ff];
}

.hljs-number {
  @apply text-[#005cc5] dark:text-[#79c0ff];
}

.hljs-operator {
  @apply text-[#d73a49] dark:text-[#ff7b72];
}

.hljs-punctuation {
  @apply text-[#24292e] dark:text-[#c9d1d9];
}

.hljs-comment {
  @apply text-[#6a737d] dark:text-[#8b949e] italic;
}

.hljs-function {
  @apply text-[#005cc5] dark:text-[#d2a8ff];
}

.hljs-built_in {
  @apply text-[#005cc5] dark:text-[#79c0ff];
}
</style>
