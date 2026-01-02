<template>
  <div class="inline-flex items-center gap-1 font-mono text-sm">
    <span class="text-gray-600 dark:text-gray-400 break-all">{{ displayString }}</span>
    <button
      v-if="hasPassword"
      v-tooltip="showPassword ? 'Hide password' : 'Show password'"
      class="shrink-0 p-0.5 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors"
      @click.stop="togglePassword"
    >
      <Eye v-if="!showPassword" class="h-3.5 w-3.5" />
      <EyeOff v-else class="h-3.5 w-3.5" />
    </button>
  </div>
</template>

<script lang="ts">
import { vTooltip } from '@/directives/tooltip'

export default {
  directives: {
    tooltip: vTooltip
  }
}
</script>

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
