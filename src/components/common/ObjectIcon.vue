<script setup lang="ts">
import { computed } from 'vue'
import { TableCellsIcon, ViewfinderCircleIcon } from '@heroicons/vue/24/outline'
import { useIconSizes } from '@/composables/useIconSizes'
import type { IconSizeKey } from '@/constants'

type ObjectType = 'table' | 'view'

interface Props {
  objectType: ObjectType
  size?: IconSizeKey
}

const props = withDefaults(defineProps<Props>(), {
  size: 'LG'
})

const { iconClass } = useIconSizes(props.size)

// Color coding for different object types with dark mode support
const iconColor = computed(() => {
  switch (props.objectType) {
    case 'table':
      return 'text-slate-500 dark:text-slate-400' // Tables - neutral gray (don't compete with connection colors)
    case 'view':
      return 'text-slate-400 dark:text-slate-500' // Views - lighter gray
    default:
      return 'text-gray-400 dark:text-gray-500'
  }
})
</script>

<template>
  <component
    :is="props.objectType === 'table' ? TableCellsIcon : ViewfinderCircleIcon"
    :class="[iconClass, iconColor, 'shrink-0 flex-none']"
  />
</template>
