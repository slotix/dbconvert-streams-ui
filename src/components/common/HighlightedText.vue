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
import { highlightParts } from '@/utils/highlight'

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
const parts = computed(() => highlightParts(props.text, props.query))

defineOptions({
  inheritAttrs: false
})
</script>
