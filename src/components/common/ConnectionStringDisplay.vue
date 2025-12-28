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
      <Eye v-if="!showPassword" class="h-4 w-4" />
      <EyeOff v-else class="h-4 w-4" />
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { Eye, EyeOff } from 'lucide-vue-next'
import { generateConnectionString } from '@/utils/connectionStringGenerator'
import { getConnectionKindFromSpec, isDatabaseKind, isFileBasedKind } from '@/types/specs'
import type { Connection } from '@/types/connections'

const props = defineProps<{
  connection: Partial<Connection>
}>()

const showPassword = ref(false)

// Check if this connection type has a password to show/hide
// File-based connections (S3, GCS, Azure, Files) don't have passwords in the connection string
const hasPassword = computed(() => {
  const kind = getConnectionKindFromSpec(props.connection?.spec)
  if (!kind) return false
  if (isFileBasedKind(kind)) return false
  return isDatabaseKind(kind)
})

const displayString = computed(() => {
  return generateConnectionString(props.connection, showPassword.value)
})

const togglePassword = () => {
  showPassword.value = !showPassword.value
}
</script>
