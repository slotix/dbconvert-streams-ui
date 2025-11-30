<script setup lang="ts">
import {
  DocumentTextIcon,
  CodeBracketIcon,
  TableCellsIcon,
  DocumentIcon,
  FolderIcon,
  RectangleStackIcon,
  ArchiveBoxIcon
} from '@heroicons/vue/24/outline'
import { useIconSizes } from '@/composables/useIconSizes'
import type { IconSizeKey } from '@/constants'
import type { FileFormat } from '@/utils/fileFormat'

interface Props {
  fileFormat: FileFormat | null
  isDirectory?: boolean
  isTableFolder?: boolean // Folder containing files that DuckDB can read as a table
  isBucket?: boolean // S3 bucket
  size?: IconSizeKey
}

const props = withDefaults(defineProps<Props>(), {
  size: 'BASE',
  isDirectory: false,
  isTableFolder: false,
  isBucket: false
})

const { iconClass } = useIconSizes(props.size)

// Map file formats to Heroicons
const iconComponent = computed(() => {
  // S3 bucket - distinct from regular folders
  if (props.isBucket) {
    return ArchiveBoxIcon
  }

  // Table folder - a special folder that DuckDB can treat as a table
  if (props.isTableFolder) {
    return RectangleStackIcon // Stacked rectangles - represents partitioned data
  }

  // Regular directory
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
      return TableCellsIcon // Parquet files - table/structured data
    default:
      return DocumentIcon // Generic file
  }
})

// Color coding for different file types with dark mode support
const iconColor = computed(() => {
  // S3 buckets - distinct blue color
  if (props.isBucket) {
    return 'text-sky-500 dark:text-sky-400'
  }

  // Table folders get special color - teal to indicate queryable data
  if (props.isTableFolder) {
    return 'text-teal-500 dark:text-teal-400'
  }

  // Regular folders - amber/yellow color
  if (props.isDirectory) {
    return 'text-amber-500 dark:text-amber-400'
  }

  switch (props.fileFormat) {
    case 'csv':
      return 'text-green-500 dark:text-green-400' // CSV - green
    case 'json':
    case 'jsonl':
      return 'text-orange-500 dark:text-orange-400' // JSON - orange
    case 'parquet':
      return 'text-blue-500 dark:text-blue-400' // Parquet - blue (structured data)
    default:
      return 'text-gray-400 dark:text-gray-500' // Unsupported/Unknown - lighter gray
  }
})
</script>

<script lang="ts">
import { computed } from 'vue'
</script>

<template>
  <component :is="iconComponent" :class="[iconClass, iconColor, 'shrink-0 flex-none']" />
</template>
