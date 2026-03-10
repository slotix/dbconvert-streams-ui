<template>
  <div class="space-y-6">
    <section class="ui-surface-panel p-6">
      <div class="flex items-start justify-between gap-4">
        <div class="min-w-0">
          <p class="text-xs font-semibold uppercase tracking-[0.28em] text-teal-400">S3 Location</p>
          <h2 class="mt-2 truncate text-3xl font-semibold text-slate-900 dark:text-white">
            {{ locationLabel }}
          </h2>
          <p class="mt-2 max-w-3xl text-sm text-gray-400">
            Bucket-scoped view for browsing objects and managing manifests in the current S3
            location.
          </p>
        </div>
      </div>

      <div class="mt-6 grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <div
          class="rounded-2xl border border-gray-200 bg-gray-50/70 p-4 dark:border-gray-700 dark:bg-gray-950/40"
        >
          <div
            class="text-xs font-medium uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400"
          >
            Current path
          </div>
          <div
            class="mt-3 rounded-xl border border-gray-200 bg-white px-4 py-3 font-mono text-sm text-gray-800 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
          >
            {{ locationPath }}
          </div>
        </div>

        <div class="grid gap-4 sm:grid-cols-3">
          <div
            class="rounded-2xl border border-gray-200 bg-gray-50/70 p-4 dark:border-gray-700 dark:bg-gray-950/40"
          >
            <div
              class="text-xs font-medium uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400"
            >
              Bucket
            </div>
            <div class="mt-2 truncate text-lg font-semibold text-gray-900 dark:text-gray-100">
              {{ bucketName }}
            </div>
          </div>
          <div
            class="rounded-2xl border border-gray-200 bg-gray-50/70 p-4 dark:border-gray-700 dark:bg-gray-950/40"
          >
            <div
              class="text-xs font-medium uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400"
            >
              Prefix
            </div>
            <div class="mt-2 truncate text-lg font-semibold text-gray-900 dark:text-gray-100">
              {{ prefixLabel }}
            </div>
          </div>
          <div
            class="rounded-2xl border border-gray-200 bg-gray-50/70 p-4 dark:border-gray-700 dark:bg-gray-950/40"
          >
            <div
              class="text-xs font-medium uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400"
            >
              Visible objects
            </div>
            <div class="mt-2 text-lg font-semibold text-gray-900 dark:text-gray-100">
              {{ visibleObjectCount }}
            </div>
            <div class="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {{ visibleManifestCount }} manifests, {{ visibleFolderCount }} folders
            </div>
          </div>
        </div>
      </div>
    </section>

    <S3ManifestManagerPanel
      :connection-id="connectionId"
      :directory-path="directoryRootPath"
      :selected-path="locationPath"
      :file-entries="rootEntries"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
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
