<script setup lang="ts">
import { computed } from 'vue'
import CopyButton from '@/components/common/CopyButton.vue'
import JsonCodeMirror from '@/components/codemirror/JsonCodeMirror.vue'

interface Props {
  json: string | object
  title?: string
  height?: string
  compact?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  title: 'JSON',
  height: '300px',
  compact: false
})

const jsonString = computed(() => {
  if (typeof props.json === 'string') {
    try {
      const parsed = JSON.parse(props.json)
      return JSON.stringify(parsed, null, 2)
    } catch {
      return props.json
    }
  }

  return JSON.stringify(props.json, null, 2)
})
</script>

<template>
  <div class="ui-surface-raised rounded-lg overflow-hidden border">
    <div class="ui-surface-toolbar flex items-center justify-between border-b px-4 py-2">
      <span class="text-sm font-medium text-gray-700 dark:text-gray-300">
        {{ title }}
      </span>
      <CopyButton :text="jsonString" />
    </div>

    <div class="ui-surface-raised">
      <JsonCodeMirror :model-value="jsonString" :height="height" read-only :resizable="false" />
    </div>
  </div>
</template>
