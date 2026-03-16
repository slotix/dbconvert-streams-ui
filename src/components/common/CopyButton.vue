<script setup lang="ts">
import { Clipboard } from 'lucide-vue-next'
import { useCommonStore } from '@/stores/common'
import { useContextualIconSizes } from '@/composables/useIconSizes'

const props = defineProps<{
  text: string
  buttonClass?: string
  iconClass?: string
}>()

const commonStore = useCommonStore()
const iconSizes = useContextualIconSizes()

async function handleCopy() {
  try {
    await navigator.clipboard.writeText(props.text)
    commonStore.showNotification('Copied to clipboard', 'success')
  } catch {
    commonStore.showNotification('Failed to copy to clipboard', 'error')
  }
}
</script>

<template>
  <button
    :class="[
      'inline-flex items-center justify-center rounded-md hover:bg-(--ui-surface-muted) focus:outline-none transition-colors',
      buttonClass ||
        'ui-surface-raised ui-border-default px-2.5 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 border'
    ]"
    @click.stop="handleCopy"
  >
    <Clipboard :class="[iconSizes.tableAction, iconClass || 'text-gray-500 dark:text-gray-400']" />
    <span class="ml-1"><slot>Copy</slot></span>
  </button>
</template>
