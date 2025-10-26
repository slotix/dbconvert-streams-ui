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

// Color coding for different object types
const iconColor = computed(() => {
  switch (props.objectType) {
    case 'table':
      return 'text-indigo-500' // Tables - indigo
    case 'view':
      return 'text-purple-500' // Views - purple
    default:
      return 'text-gray-400'
  }
})
</script>

<template>
  <component
    :is="props.objectType === 'table' ? TableCellsIcon : ViewfinderCircleIcon"
    :class="[iconClass, iconColor, 'shrink-0 flex-none']"
  />
</template>
