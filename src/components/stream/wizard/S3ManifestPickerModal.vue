<template>
  <TransitionRoot :show="isOpen" as="template">
    <Dialog as="div" class="relative z-50" @close="closeModal">
      <TransitionChild
        as="template"
        enter="ease-out duration-200"
        enter-from="opacity-0"
        enter-to="opacity-100"
        leave="ease-in duration-150"
        leave-from="opacity-100"
        leave-to="opacity-0"
      >
        <div class="fixed inset-0 bg-gray-950/60" />
      </TransitionChild>

      <div class="fixed inset-0 overflow-y-auto">
        <div class="flex min-h-full items-center justify-center p-4">
          <TransitionChild
            as="template"
            enter="ease-out duration-200"
            enter-from="opacity-0 translate-y-2 scale-95"
            enter-to="opacity-100 translate-y-0 scale-100"
            leave="ease-in duration-150"
            leave-from="opacity-100 translate-y-0 scale-100"
            leave-to="opacity-0 translate-y-2 scale-95"
          >
            <DialogPanel
              class="w-full max-w-4xl overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-900"
            >
              <div class="border-b border-gray-200 px-6 py-4 dark:border-gray-700">
                <div class="flex items-start justify-between gap-4">
                  <div>
                    <DialogTitle class="text-lg font-semibold text-gray-900 dark:text-gray-100">
                      {{ title }}
                    </DialogTitle>
                    <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      Browse buckets and pick a manifest JSON file from the selected S3 connection.
                    </p>
                  </div>
                  <button
                    type="button"
                    class="rounded-md p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-200"
                    @click="closeModal"
                  >
                    <X class="h-5 w-5" />
                  </button>
                </div>
              </div>

              <div class="grid gap-0 lg:grid-cols-[220px_minmax(0,1fr)]">
                <div
                  class="border-b border-gray-200 bg-gray-50/80 p-4 dark:border-gray-700 dark:bg-gray-950/50 lg:border-b-0 lg:border-r"
                >
                  <div class="mb-3 flex items-center justify-between">
                    <h4
                      class="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500 dark:text-gray-400"
                    >
                      Buckets
                    </h4>
                    <BaseButton
                      size="sm"
                      variant="ghost"
                      :disabled="loadingBuckets"
                      @click="loadBuckets"
                    >
                      Refresh
                    </BaseButton>
                  </div>

                  <div v-if="loadingBuckets" class="py-6 text-sm text-gray-500 dark:text-gray-400">
                    Loading buckets...
                  </div>
                  <div
                    v-else-if="buckets.length === 0"
                    class="rounded-xl border border-dashed border-gray-300 px-3 py-5 text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400"
                  >
                    No buckets available.
                  </div>
                  <div v-else class="space-y-1">
                    <button
                      v-for="bucketName in buckets"
                      :key="bucketName"
                      type="button"
                      class="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors"
                      :class="
                        bucketName === currentBucket
                          ? 'bg-teal-600 text-white shadow-sm'
                          : 'text-gray-700 hover:bg-white dark:text-gray-200 dark:hover:bg-gray-800'
                      "
                      @click="selectBucket(bucketName)"
                    >
                      <Database class="h-4 w-4 shrink-0" />
                      <span class="truncate">{{ bucketName }}</span>
                    </button>
                  </div>
                </div>

                <div class="min-w-0 p-4 sm:p-6">
                  <div
                    class="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p
                        class="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500 dark:text-gray-400"
                      >
                        Path
                      </p>
                      <div class="mt-2 flex flex-wrap items-center gap-2 text-sm">
                        <button
                          v-if="currentBucket"
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
                    <BaseButton
                      size="sm"
                      variant="ghost"
                      :disabled="!currentBucket || loadingObjects"
                      @click="loadObjects"
                    >
                      Refresh
                    </BaseButton>
                  </div>

                  <div
                    v-if="selectionError"
                    class="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-200"
                  >
                    {{ selectionError }}
                  </div>

                  <div class="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
                    <div class="rounded-2xl border border-gray-200 dark:border-gray-700">
                      <div class="border-b border-gray-200 px-4 py-3 dark:border-gray-700">
                        <div class="flex items-center justify-between gap-3">
                          <div>
                            <h4 class="text-sm font-semibold text-gray-900 dark:text-gray-100">
                              Manifests
                            </h4>
                            <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                              JSON objects in the current bucket/prefix.
                            </p>
                          </div>
                          <span class="text-xs text-gray-500 dark:text-gray-400">
                            {{ visibleObjectCount }} files
                          </span>
                        </div>
                      </div>

                      <div
                        v-if="loadingObjects"
                        class="px-4 py-8 text-sm text-gray-500 dark:text-gray-400"
                      >
                        Loading objects...
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
                              ? 'bg-teal-50 text-teal-900 dark:bg-teal-950/40 dark:text-teal-100'
                              : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                          "
                          @click="selectedPath = toS3Path(objectKey)"
                          @dblclick="confirmSelection"
                        >
                          <FileJson class="h-4 w-4 shrink-0 text-sky-500" />
                          <div class="min-w-0 flex-1">
                            <p
                              class="truncate text-sm font-medium text-gray-900 dark:text-gray-100"
                            >
                              {{ objectKey.split('/').pop() }}
                            </p>
                            <p class="truncate text-xs text-gray-500 dark:text-gray-400">
                              {{ objectKey }}
                            </p>
                          </div>
                        </button>
                        <div
                          v-if="!prefixes.length && !visibleObjects.length"
                          class="px-4 py-8 text-sm text-gray-500 dark:text-gray-400"
                        >
                          No manifest JSON files found in this location.
                        </div>
                      </div>
                    </div>

                    <div
                      class="rounded-2xl border border-gray-200 bg-gray-50/70 p-4 dark:border-gray-700 dark:bg-gray-950/40"
                    >
                      <h4 class="text-sm font-semibold text-gray-900 dark:text-gray-100">
                        Selection
                      </h4>
                      <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        Pick a manifest file and confirm to use its full `s3://` path.
                      </p>
                      <div
                        class="mt-4 rounded-xl border border-gray-200 bg-white p-3 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
                      >
                        <span v-if="selectedPath" class="break-all">{{ selectedPath }}</span>
                        <span v-else class="text-gray-400 dark:text-gray-500"
                          >No manifest selected</span
                        >
                      </div>

                      <div class="mt-4 flex gap-2">
                        <BaseButton variant="secondary" class="flex-1" @click="closeModal">
                          Cancel
                        </BaseButton>
                        <BaseButton
                          class="flex-1"
                          :disabled="!selectedPath"
                          @click="confirmSelection"
                        >
                          Use manifest
                        </BaseButton>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </DialogPanel>
          </TransitionChild>
        </div>
      </div>
    </Dialog>
  </TransitionRoot>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Dialog, DialogPanel, DialogTitle, TransitionChild, TransitionRoot } from '@headlessui/vue'
import { ChevronRight, Database, FileJson, Folder, X } from 'lucide-vue-next'
import BaseButton from '@/components/base/BaseButton.vue'
import { listS3Buckets, listS3Objects } from '@/api/files'

interface Props {
  isOpen: boolean
  connectionId: string
  title?: string
}

const props = withDefaults(defineProps<Props>(), {
  title: 'Select manifest'
})

const emit = defineEmits<{
  (e: 'update:isOpen', value: boolean): void
  (e: 'select', path: string): void
}>()

const loadingBuckets = ref(false)
const loadingObjects = ref(false)
const buckets = ref<string[]>([])
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
const visibleObjectCount = computed(() => visibleObjects.value.length)

watch(
  () => props.isOpen,
  async (isOpen) => {
    if (!isOpen) {
      return
    }
    selectionError.value = ''
    if (buckets.value.length === 0) {
      await loadBuckets()
    } else if (currentBucket.value) {
      await loadObjects()
    }
  }
)

watch(
  () => props.connectionId,
  () => {
    buckets.value = []
    prefixes.value = []
    objects.value = []
    currentBucket.value = ''
    currentPrefix.value = ''
    selectedPath.value = ''
  }
)

function closeModal() {
  emit('update:isOpen', false)
}

function toS3Path(objectKey: string): string {
  return currentBucket.value ? `s3://${currentBucket.value}/${objectKey}` : ''
}

function formatPrefixName(prefix: string): string {
  const trimmed = prefix.endsWith('/') ? prefix.slice(0, -1) : prefix
  return trimmed.split('/').pop() || prefix
}

async function loadBuckets() {
  if (!props.connectionId) {
    selectionError.value = 'S3 connection is required'
    return
  }

  loadingBuckets.value = true
  selectionError.value = ''
  try {
    const response = await listS3Buckets(props.connectionId)
    buckets.value = response.buckets
    if (!currentBucket.value && response.buckets.length > 0) {
      currentBucket.value = response.buckets[0]
    }
    if (currentBucket.value) {
      await loadObjects()
    }
  } catch (error) {
    selectionError.value = error instanceof Error ? error.message : 'Failed to load buckets'
  } finally {
    loadingBuckets.value = false
  }
}

async function loadObjects() {
  if (!currentBucket.value) {
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
    selectionError.value = error instanceof Error ? error.message : 'Failed to load objects'
    prefixes.value = []
    objects.value = []
  } finally {
    loadingObjects.value = false
  }
}

async function selectBucket(bucketName: string) {
  currentBucket.value = bucketName
  currentPrefix.value = ''
  selectedPath.value = ''
  await loadObjects()
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
  closeModal()
}
</script>
