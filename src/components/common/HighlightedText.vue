<template>
  <component :is="tag" v-bind="attrs">
    <template v-for="(part, index) in parts" :key="index">
      <component :is="highlightTag" v-if="part.match" :class="highlightClass">
        {{ part.text }}
      </component>
      <span v-else>{{ part.text }}</span>
    </template>
  </component>
</template>

<script setup lang="ts">
import { computed, useAttrs, type Component } from 'vue'

interface Props {
  text: string
  query?: string
  tag?: string | Component
  highlightTag?: string | Component
  highlightClass?: string
}

const props = withDefaults(defineProps<Props>(), {
  query: '',
  tag: 'span',
  highlightTag: 'mark',
  highlightClass:
    'bg-yellow-200 dark:bg-amber-500/30 text-gray-900 dark:text-gray-100 font-semibold rounded px-0.5'
})

const attrs = useAttrs()

// Inline text highlighting logic
function highlightParts(text: string, query: string): Array<{ text: string; match: boolean }> {
  if (!query || !text) {
    return [{ text, match: false }]
  }

  const parts: Array<{ text: string; match: boolean }> = []
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
  const matches = text.split(regex)

  for (const part of matches) {
    if (part) {
      parts.push({
        text: part,
        match: regex.test(part)
      })
      // Reset regex lastIndex for next iteration
      regex.lastIndex = 0
    }
  }

  return parts
}

const parts = computed(() => highlightParts(props.text, props.query))

defineOptions({
  inheritAttrs: false
})
</script>
