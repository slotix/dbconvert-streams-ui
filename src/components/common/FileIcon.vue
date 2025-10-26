<script setup lang="ts">
import {
  DocumentTextIcon,
  CodeBracketIcon,
  TableCellsIcon as ParquetIcon,
  DocumentIcon,
  FolderIcon
} from '@heroicons/vue/24/outline'
import { useIconSizes } from '@/composables/useIconSizes'
import type { IconSizeKey } from '@/constants'
import type { FileFormat } from '@/utils/fileFormat'

interface Props {
  fileFormat: FileFormat | null
  isDirectory?: boolean
  size?: IconSizeKey
}

const props = withDefaults(defineProps<Props>(), {
  size: 'LG',
  isDirectory: false
})

const { iconClass } = useIconSizes(props.size)

// Map file formats to Heroicons
const iconComponent = computed(() => {
  // If it's a directory, always show folder icon
  if (props.isDirectory) {
    return FolderIcon
  }

  switch (props.fileFormat) {
    case 'csv':
      return DocumentTextIcon // CSV files - document with lines
    case 'json':
    case 'jsonl':
      return CodeBracketIcon // JSON files - code brackets
    case 'parquet':
      return ParquetIcon // Parquet files - table/structured data
    default:
      return DocumentIcon // Generic file
  }
})

// Color coding for different file types
const iconColor = computed(() => {
  // Folders are blue
  if (props.isDirectory) {
    return 'text-blue-500'
  }

  switch (props.fileFormat) {
    case 'csv':
      return 'text-green-500' // CSV - green
    case 'json':
    case 'jsonl':
      return 'text-yellow-600' // JSON - yellow/amber
    case 'parquet':
      return 'text-blue-500' // Parquet - blue
    default:
      return 'text-gray-400' // Unknown - gray
  }
})
</script>

<script lang="ts">
import { computed } from 'vue'
</script>

<template>
  <component :is="iconComponent" :class="[iconClass, iconColor, 'shrink-0 flex-none']" />
</template>
