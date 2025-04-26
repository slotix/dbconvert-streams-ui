<script setup lang="ts">
import { ClipboardIcon } from '@heroicons/vue/24/outline'
import { useCommonStore } from '@/stores/common'

const props = defineProps<{
  text: string
  buttonClass?: string
  iconClass?: string
}>()

const commonStore = useCommonStore()

async function handleCopy() {
  try {
    await navigator.clipboard.writeText(props.text)
    commonStore.showNotification('Copied to clipboard', 'success')
  } catch (error) {
    commonStore.showNotification('Failed to copy to clipboard', 'error')
  }
}
</script>

<template>
  <button
    :class="[
      'inline-flex items-center justify-center rounded-md hover:bg-gray-50 focus:outline-none transition-colors',
      buttonClass ||
        'px-2.5 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-200'
    ]"
    @click.stop="handleCopy"
  >
    <ClipboardIcon :class="['h-4 w-4', iconClass || 'text-gray-500']" />
    <slot>Copy</slot>
  </button>
</template>
