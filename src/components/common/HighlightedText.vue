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
  highlightClass: 'ui-accent-highlight font-semibold rounded px-0.5'
})

const attrs = useAttrs()

function tokenizeQuery(query: string): string[] {
  if (!query) return []

  const tokens = query
    .trim()
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean)

  const seen = new Set<string>()
  const uniqueTokens: string[] = []
  for (const token of tokens) {
    const normalized = token.toLowerCase()
    if (seen.has(normalized)) continue
    seen.add(normalized)
    uniqueTokens.push(token)
  }

  return uniqueTokens
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// Inline text highlighting logic (tokenized, case-insensitive)
function highlightParts(text: string, query: string): Array<{ text: string; match: boolean }> {
  if (!text) {
    return [{ text, match: false }]
  }

  const tokens = tokenizeQuery(query)
  if (!tokens.length) {
    return [{ text, match: false }]
  }

  // Prefer longer tokens when there is overlap ("postgres" before "post")
  const sortedTokens = [...tokens].sort((a, b) => b.length - a.length)
  const regex = new RegExp(`(${sortedTokens.map((token) => escapeRegExp(token)).join('|')})`, 'gi')
  const tokenSet = new Set(sortedTokens.map((token) => token.toLowerCase()))

  const parts: Array<{ text: string; match: boolean }> = []
  const matches = text.split(regex)

  for (const part of matches) {
    if (!part) continue
    parts.push({
      text: part,
      match: tokenSet.has(part.toLowerCase())
    })
  }

  return parts
}

const parts = computed(() => highlightParts(props.text, props.query))

defineOptions({
  inheritAttrs: false
})
</script>
