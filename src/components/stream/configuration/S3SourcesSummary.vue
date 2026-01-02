<template>
  <div>
    <label class="block text-xs font-medium uppercase text-gray-500 dark:text-gray-400 mb-2">
      S3 Sources
    </label>
    <div
      class="bg-gray-50 dark:bg-gray-800 rounded-md p-3 border border-gray-300 dark:border-gray-700 space-y-2"
    >
      <div v-for="source in s3Sources" :key="source.connectionId" class="text-sm">
        <div class="flex items-center gap-2">
          <span class="font-medium text-gray-900 dark:text-gray-100">{{ source.bucket }}</span>
          <span
            v-if="source.alias"
            class="inline-flex items-center rounded px-1.5 py-0.5 text-xs font-mono bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
          >
            {{ source.alias }}
          </span>
        </div>
        <div v-if="source.objects?.length" class="mt-1 text-gray-600 dark:text-gray-400 text-xs">
          {{ formatObjects(source.objects) }}
        </div>
        <div
          v-else-if="source.prefixes?.length"
          class="mt-1 text-gray-600 dark:text-gray-400 text-xs"
        >
          Prefixes: {{ source.prefixes.join(', ') }}
        </div>
        <div v-else class="mt-1 text-gray-500 dark:text-gray-500 text-xs italic">All objects</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface S3Source {
  connectionId: string
  alias?: string
  bucket: string
  objects?: string[]
  prefixes?: string[]
}

defineProps<{
  s3Sources: S3Source[]
}>()

function formatObjects(objects: string[]): string {
  const maxDisplay = 3
  if (objects.length <= maxDisplay) {
    return objects.join(', ')
  }
  return `${objects.slice(0, maxDisplay).join(', ')}, ... (${objects.length - maxDisplay} more)`
}
</script>
