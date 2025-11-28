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
  size: 'BASE'
})

const { iconClass } = useIconSizes(props.size)

// Color coding for different object types with dark mode support
const iconColor = computed(() => {
  switch (props.objectType) {
    case 'table':
      return 'text-blue-500 dark:text-blue-400' // Tables - blue (primary data)
    case 'view':
      return 'text-teal-500 dark:text-teal-400' // Views - teal (derived/virtual)
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
