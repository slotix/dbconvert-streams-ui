<template>
  <div class="relative font-mono text-sm">
    <div class="text-gray-600 break-all" :class="{ 'pr-8': hasPassword }">
      {{ displayString }}
    </div>
    <button
      v-if="hasPassword"
      class="absolute right-0 top-1/2 -translate-y-1/2 p-1 text-gray-500 hover:text-gray-700"
      :title="showPassword ? 'Hide password' : 'Show password'"
      @click.stop="togglePassword"
    >
      <EyeIcon v-if="!showPassword" class="h-4 w-4" />
      <EyeSlashIcon v-else class="h-4 w-4" />
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { EyeIcon, EyeSlashIcon } from '@heroicons/vue/24/outline'
import { generateConnectionString } from '@/utils/connectionStringGenerator'
import type { Connection } from '@/types/connections'

const props = defineProps<{
  connection: Partial<Connection>
}>()

const showPassword = ref(false)

// Check if this connection type has a password to show/hide
// File-based connections (S3, GCS, Azure, Files) don't have passwords in the connection string
const hasPassword = computed(() => {
  const spec = props.connection?.spec
  const type = props.connection?.type?.toLowerCase() || ''

  // Check spec first (more reliable), then fall back to type string
  const isCloudStorage = spec?.s3 || spec?.gcs || spec?.azure || spec?.files
  const isFileType = type === 's3' || type === 'gcs' || type === 'azure' || type === 'files'

  return !isCloudStorage && !isFileType
})

const displayString = computed(() => {
  return generateConnectionString(props.connection, showPassword.value)
})

const togglePassword = () => {
  showPassword.value = !showPassword.value
}
</script>
