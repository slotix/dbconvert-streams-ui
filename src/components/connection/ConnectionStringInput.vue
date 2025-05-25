<template>
  <div class="mb-4 mt-8 mr-4">
    <label class="block text-sm font-medium text-gray-700 mb-2">Connection String (Optional)</label>
    <input
      v-model="connectionString"
      type="text"
      class="w-full rounded-md border border-gray-300 py-2 px-4 text-gray-900 shadow-sm focus:ring-2 focus:ring-gray-500 focus:border-transparent"
      :placeholder="connectionStringPlaceholder"
      @input="handleConnectionString"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { parseConnectionString } from '@/utils/connectionStringParser'

interface Props {
  connectionType?: string
}

const props = defineProps<Props>()

const connectionString = ref('')

const emit = defineEmits(['update:connection-params'])

// Dynamic placeholder based on connection type
const connectionStringPlaceholder = computed(() => {
  const type = props.connectionType?.toLowerCase()
  
  switch (type) {
    case 'postgresql':
      return 'e.g. postgresql://user:pass@host:port/dbname'
    case 'mysql':
      return 'e.g. mysql://user:pass@host:port/dbname'
    case 'oracle':
      return 'e.g. oracle://user:pass@host:port/service'
    case 'sqlserver':
      return 'e.g. sqlserver://user:pass@host:port/dbname'
    case 'mongodb':
      return 'e.g. mongodb://user:pass@host:port/dbname'
    default:
      return 'e.g. postgresql://user:pass@host:port/dbname'
  }
})

const handleConnectionString = () => {
  const parsed = parseConnectionString(connectionString.value)
  if (parsed) {
    emit('update:connection-params', parsed)
  }
}
</script>
