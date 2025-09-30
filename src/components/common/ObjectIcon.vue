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
    class="w-[16px] h-[16px] text-gray-400 shrink-0 flex-none"
  />
</template>
