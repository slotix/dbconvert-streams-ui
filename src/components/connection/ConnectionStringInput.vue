<template>
  <div class="mb-4 mt-8 mr-4">
    <label class="block text-sm font-medium text-gray-700 mb-2">Connection String (Optional)</label>
    <input
      v-model="connectionString"
      type="text"
      class="w-full rounded-md border border-gray-300 py-2 px-4 text-gray-900 shadow-sm focus:ring-2 focus:ring-gray-500 focus:border-transparent"
      placeholder="e.g. postgresql://user:pass@host:port/dbname"
      @input="handleConnectionString"
    />
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { parseConnectionString } from '@/utils/connectionStringParser'

const connectionString = ref('')

const emit = defineEmits(['update:connection-params'])

const handleConnectionString = () => {
  const parsed = parseConnectionString(connectionString.value)
  if (parsed) {
    emit('update:connection-params', parsed)
  }
}
</script>
