<template>
  <div class="mb-4 mt-8 mr-4">
    <FormInput
      v-model="connectionString"
      label="Connection String (Optional)"
      type="text"
      :placeholder="connectionStringPlaceholder"
      @input="handleConnectionString"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { parseConnectionString } from '@/utils/connectionStringParser'
import FormInput from '@/components/base/FormInput.vue'

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
    case 'snowflake':
      return 'e.g. snowflake://user:pass@account.region.snowflakecomputing.com:443/dbname'
    case 'files':
      return 'e.g. file:///path/to/data/folder'
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
