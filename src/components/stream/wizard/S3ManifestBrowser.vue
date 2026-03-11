<template>
  <div class="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
    <div class="rounded-xl border border-gray-200 dark:border-gray-700">
      <div class="border-b border-gray-200 px-4 py-3 dark:border-gray-700">
        <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div class="min-w-0">
            <p class="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500 dark:text-gray-400">
              Path
            </p>
            <div class="mt-2 flex flex-wrap items-center gap-2 text-sm">
              <span
                v-if="!currentBucket"
                class="rounded-full bg-gray-100 px-3 py-1 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
              >
                No bucket selected
              </span>
              <button
                v-else
                type="button"
                class="rounded-full bg-gray-100 px-3 py-1 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                @click="goToPrefix('')"
              >
                {{ currentBucket }}
              </button>
              <template v-for="segment in prefixSegments" :key="segment.path">
                <ChevronRight class="h-4 w-4 text-gray-400" />
                <button
                  type="button"
                  class="rounded-full bg-gray-100 px-3 py-1 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                  @click="goToPrefix(segment.path)"
                >
                  {{ segment.label }}
                </button>
              </template>
            </div>
          </div>

          <button
            type="button"
            class="text-xs font-medium text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200"
            :disabled="!currentBucket || loadingObjects"
            @click="loadObjects"
          >
            Refresh
          </button>
        </div>
      </div>

      <div
        v-if="selectionError"
        class="border-b border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-200"
      >
        {{ selectionError }}
      </div>

      <div v-if="loadingObjects" class="px-4 py-10 text-sm text-gray-500 dark:text-gray-400">
        Loading manifest objects...
      </div>
      <div
        v-else
        class="max-h-[420px] divide-y divide-gray-100 overflow-y-auto dark:divide-gray-800"
      >
        <button
          v-for="prefix in prefixes"
          :key="prefix"
          type="button"
          class="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-gray-50 dark:hover:bg-gray-800"
          @click="openPrefix(prefix)"
        >
          <Folder class="h-4 w-4 shrink-0 text-amber-500" />
          <span class="truncate text-sm text-gray-800 dark:text-gray-100">
            {{ formatPrefixName(prefix) }}
          </span>
        </button>

        <button
          v-for="objectKey in visibleObjects"
          :key="objectKey"
          type="button"
          class="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors"
          :class="
            selectedPath === toS3Path(objectKey)
              ? 'bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100'
              : 'hover:bg-gray-50 dark:hover:bg-gray-800'
          "
          @click="selectedPath = toS3Path(objectKey)"
          @dblclick="confirmSelection"
        >
          <FileJson class="h-4 w-4 shrink-0 text-sky-500" />
          <div class="min-w-0 flex-1">
            <p class="truncate text-sm font-medium text-gray-900 dark:text-gray-100">
              {{ objectKey.split('/').pop() }}
            </p>
            <p class="truncate text-xs text-gray-500 dark:text-gray-400">
              {{ objectKey }}
            </p>
          </div>
        </button>

        <div
          v-if="!prefixes.length && !visibleObjects.length"
          class="px-4 py-10 text-sm text-gray-500 dark:text-gray-400"
        >
          No manifest JSON files found in this location.
        </div>
      </div>
    </div>

    <div class="rounded-xl border border-gray-200 bg-gray-50/40 p-4 dark:border-gray-700 dark:bg-gray-900/30">
      <h4 class="text-sm font-semibold text-gray-900 dark:text-gray-100">Selection</h4>
      <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
        Pick a manifest file and apply it as the source snapshot.
      </p>

      <div
        class="mt-4 rounded-xl border border-gray-200 bg-white p-3 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
      >
        <span v-if="selectedPath" class="break-all">{{ selectedPath }}</span>
        <span v-else class="text-gray-400 dark:text-gray-500">No manifest selected</span>
      </div>

      <BaseButton class="mt-4" full-width :disabled="!selectedPath" @click="confirmSelection">
        Use manifest
      </BaseButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { ChevronRight, FileJson, Folder } from 'lucide-vue-next'
import { listS3Objects } from '@/api/files'
import BaseButton from '@/components/base/BaseButton.vue'

interface Props {
  connectionId: string
  bucket: string
  prefix?: string
  selectedPath?: string
}

const props = withDefaults(defineProps<Props>(), {
  prefix: '',
  selectedPath: ''
})

const emit = defineEmits<{
  (e: 'select', path: string): void
}>()

const loadingObjects = ref(false)
const prefixes = ref<string[]>([])
const objects = ref<string[]>([])
const currentBucket = ref('')
const currentPrefix = ref('')
const selectedPath = ref('')
const selectionError = ref('')

const prefixSegments = computed(() => {
  return currentPrefix.value
    .split('/')
    .filter((segment) => segment)
    .map((segment, index, segments) => ({
      label: segment,
      path: `${segments.slice(0, index + 1).join('/')}/`
    }))
})

const visibleObjects = computed(() =>
  objects.value.filter((key) => key.toLowerCase().endsWith('.json'))
)

watch(
  () => [props.bucket, props.prefix, props.selectedPath],
  () => {
    currentBucket.value = props.bucket
    currentPrefix.value = props.prefix || ''
    selectedPath.value = props.selectedPath || ''
    prefixes.value = []
    objects.value = []

    if (currentBucket.value) {
      void loadObjects()
    }
  },
  { immediate: true }
)

function toS3Path(objectKey: string): string {
  return currentBucket.value ? `s3://${currentBucket.value}/${objectKey}` : ''
}

function formatPrefixName(prefix: string): string {
  const trimmed = prefix.endsWith('/') ? prefix.slice(0, -1) : prefix
  return trimmed.split('/').pop() || prefix
}

async function loadObjects() {
  if (!currentBucket.value) {
    selectionError.value = 'S3 bucket is required'
    return
  }

  loadingObjects.value = true
  selectionError.value = ''
  try {
    const response = await listS3Objects({
      bucket: currentBucket.value,
      prefix: currentPrefix.value || undefined,
      connectionId: props.connectionId,
      recursive: false,
      maxKeys: 500
    })
    prefixes.value = response.prefixes || []
    objects.value = response.objects.map((object) => object.key)
  } catch (error) {
    selectionError.value = error instanceof Error ? error.message : 'Failed to load manifest objects'
    prefixes.value = []
    objects.value = []
  } finally {
    loadingObjects.value = false
  }
}

async function goToPrefix(prefix: string) {
  currentPrefix.value = prefix
  selectedPath.value = ''
  await loadObjects()
}

async function openPrefix(prefix: string) {
  await goToPrefix(prefix)
}

function confirmSelection() {
  if (!selectedPath.value) {
    return
  }
  emit('select', selectedPath.value)
}
</script>
