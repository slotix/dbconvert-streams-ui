<template>
  <div class="relative font-mono text-sm">
    <div class="text-gray-600 break-all pr-8">
      {{ displayString }}
    </div>
    <button
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

const displayString = computed(() => {
  return generateConnectionString(props.connection, showPassword.value)
})

const togglePassword = () => {
  showPassword.value = !showPassword.value
}
</script>
