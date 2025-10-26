<script setup lang="ts">
import { TableCellsIcon, ViewfinderCircleIcon } from '@heroicons/vue/24/outline'

type ObjectType = 'table' | 'view'

const props = defineProps<{
  objectType: ObjectType
}>()
</script>

<template>
  <component
    :is="props.objectType === 'table' ? TableCellsIcon : ViewfinderCircleIcon"
    class="h-6 w-6 text-gray-400 shrink-0 flex-none"
  />
</template>
