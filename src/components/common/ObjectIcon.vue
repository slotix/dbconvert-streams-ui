<script setup lang="ts">
import { computed } from 'vue'
import { Code, Focus, Sheet, Zap } from 'lucide-vue-next'
import { useIconSizes } from '@/composables/useIconSizes'
import type { IconSizeKey } from '@/constants'

type ObjectType = 'table' | 'view' | 'trigger' | 'function' | 'procedure'

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
    case 'trigger':
      return 'text-amber-500 dark:text-amber-400' // Triggers - amber (event-driven)
    case 'function':
      return 'text-indigo-500 dark:text-indigo-400' // Functions - indigo (logic)
    case 'procedure':
      return 'text-violet-500 dark:text-violet-400' // Procedures - violet (workflow)
    default:
      return 'text-gray-400 dark:text-gray-500'
  }
})
</script>

<template>
  <component
    :is="
      props.objectType === 'table'
        ? Sheet
        : props.objectType === 'view'
          ? Focus
          : props.objectType === 'trigger'
            ? Zap
            : Code
    "
    :class="[iconClass, iconColor, 'shrink-0 flex-none']"
  />
</template>
