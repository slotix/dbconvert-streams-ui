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
    class="h-4 w-4 text-gray-400"
  />
</template>
