<script setup lang="ts">
import { SUPPORTED_FILE_FORMATS } from '@/constants/fileFormats'

defineProps<{
  fileName: string
  variant?: 'data' | 'structure'
}>()
</script>

<template>
  <div class="flex items-center justify-center py-12 bg-gray-50 rounded-md border border-gray-200">
    <div class="text-center p-8 max-w-md">
      <svg
        class="mx-auto h-12 w-12 text-gray-400 mb-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
      </svg>
      <h3 class="text-lg font-medium text-gray-900 mb-2">Unsupported File Type</h3>
      <p class="text-sm text-gray-600 mb-4">
        <template v-if="variant === 'structure'">
          Structure information is not available for
        </template>
        <template v-else> The file </template>
        <span class="font-mono font-semibold">{{ fileName }}</span>
        <template v-if="variant !== 'structure'"> cannot be previewed</template>.
      </p>
      <div class="text-xs text-gray-500 bg-white rounded p-3 border border-gray-200">
        <p class="font-semibold mb-1">Supported formats:</p>
        <ul class="list-disc list-inside text-left">
          <li v-for="format in SUPPORTED_FILE_FORMATS" :key="format.name">
            {{ format.name }} ({{ format.extensions.join(', ') }})
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>
