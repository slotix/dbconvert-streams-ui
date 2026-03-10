<template>
  <div class="flex h-full flex-col overflow-hidden bg-white dark:bg-gray-900">
    <!-- Compact header bar -->
    <div
      class="flex items-center justify-between gap-4 border-b border-gray-200 px-5 py-3 dark:border-gray-700"
    >
      <div class="flex items-center gap-3 min-w-0">
        <div
          class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-teal-50 dark:bg-teal-900/30"
        >
          <FolderOpen class="h-4 w-4 text-teal-600 dark:text-teal-400" :stroke-width="1.75" />
        </div>
        <div class="min-w-0">
          <h2 class="truncate text-sm font-semibold text-gray-900 dark:text-gray-100">
            {{ locationLabel }}
          </h2>
          <p class="truncate font-mono text-xs text-gray-500 dark:text-gray-400">
            {{ locationPath }}
          </p>
        </div>
      </div>

      <div class="hidden items-center gap-4 text-xs text-gray-500 dark:text-gray-400 sm:flex">
        <div class="flex items-center gap-1.5">
          <span class="font-medium text-gray-400 dark:text-gray-500">Bucket</span>
          <span class="font-semibold text-gray-700 dark:text-gray-200">{{ bucketName }}</span>
        </div>
        <div class="h-3 w-px bg-gray-200 dark:bg-gray-700" />
        <div class="flex items-center gap-1.5">
          <span class="font-medium text-gray-400 dark:text-gray-500">Prefix</span>
          <span class="font-mono font-semibold text-gray-700 dark:text-gray-200">{{
            prefixLabel
          }}</span>
        </div>
        <div class="h-3 w-px bg-gray-200 dark:bg-gray-700" />
        <div class="flex items-center gap-1.5">
          <span class="font-medium text-gray-400 dark:text-gray-500">Objects</span>
          <span class="font-semibold text-gray-700 dark:text-gray-200">{{
            visibleObjectCount
          }}</span>
          <span class="text-gray-400 dark:text-gray-500"
            >({{ visibleManifestCount }} manifests, {{ visibleFolderCount }} folders)</span
          >
        </div>
      </div>
    </div>

    <!-- Manifest manager fills remaining space -->
    <div class="min-h-0 flex-1 overflow-y-auto">
      <S3ManifestManagerPanel
        :connection-id="connectionId"
        :directory-path="directoryRootPath"
        :selected-path="locationPath"
        :file-entries="rootEntries"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { FolderOpen } from 'lucide-vue-next'
import S3ManifestManagerPanel from '@/components/database/S3ManifestManagerPanel.vue'
import type { FileSystemEntry } from '@/api/fileSystem'

const props = defineProps<{
  connectionId: string
  locationPath: string
  directoryRootPath?: string
  rootEntries?: FileSystemEntry[]
}>()

const parsedLocation = computed(() => parseS3Uri(props.locationPath))

const bucketName = computed(() => parsedLocation.value?.bucket || 'Unknown bucket')
const prefixLabel = computed(() => parsedLocation.value?.prefix || '/')
const locationLabel = computed(() => {
  const prefix = parsedLocation.value?.prefix || ''
  if (!prefix) {
    return bucketName.value
  }
  const trimmed = prefix.replace(/\/+$/, '')
  const parts = trimmed.split('/').filter(Boolean)
  return parts[parts.length - 1] || bucketName.value
})

const currentEntry = computed(() => {
  if (!props.locationPath) return null
  return findEntryByPath(props.rootEntries || [], props.locationPath)
})

const visibleEntries = computed(() => currentEntry.value?.children || [])
const visibleFolderCount = computed(
  () => visibleEntries.value.filter((entry) => entry.type === 'dir').length
)
const visibleManifestCount = computed(
  () =>
    visibleEntries.value.filter(
      (entry) => entry.type === 'file' && entry.name.toLowerCase().endsWith('.json')
    ).length
)
const visibleObjectCount = computed(
  () => visibleEntries.value.filter((entry) => entry.type === 'file').length
)

function parseS3Uri(uri: string): { bucket: string; prefix: string } | null {
  const match = uri.match(/^s3:\/\/([^/]+)(?:\/(.*))?$/)
  if (!match) return null
  return {
    bucket: match[1] || '',
    prefix: match[2] || ''
  }
}

function findEntryByPath(entries: FileSystemEntry[], path: string): FileSystemEntry | null {
  for (const entry of entries) {
    if (entry.path === path) {
      return entry
    }
    if (entry.children?.length) {
      const found = findEntryByPath(entry.children, path)
      if (found) {
        return found
      }
    }
  }
  return null
}
</script>
