<template>
  <div class="p-2 space-y-2">
    <div class="flex flex-wrap items-center gap-2">
      <ConnectionTypeFilter
        :selected-type="selectedConnectionType"
        :persistent="true"
        @update:selected-type="selectedConnectionType = $event"
      />
      <div class="flex-1 min-w-[120px]">
        <SearchInput v-model="connectionSearch" placeholder="Filter..." size="sm" />
      </div>
      <button
        type="button"
        class="inline-flex items-center gap-2 px-2 py-1.5 text-xs font-medium text-white bg-gray-600 border border-gray-600 rounded hover:bg-gray-500"
        @click="$emit('add-connection')"
      >
        <span>New Connection</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { usePersistedState } from '@/composables/usePersistedState'
import ConnectionTypeFilter from '@/components/common/ConnectionTypeFilter.vue'
import SearchInput from '@/components/common/SearchInput.vue'

// Define props
interface Props {
  connectionSearch: string
}

// Define emits
const emit = defineEmits<{
  'update:connectionSearch': [value: string]
  'add-connection': []
}>()

const props = defineProps<Props>()

// Local search model
const connectionSearch = computed({
  get: () => props.connectionSearch,
  set: (value) => emit('update:connectionSearch', value)
})

// Connection type filter (persisted)
const selectedConnectionType = usePersistedState<string | null>('explorer.connectionType', null, {
  serializer: (value) => value || '',
  deserializer: (value) => value || null
})

// Expose the selected type for parent component
defineExpose({
  selectedDbTypeLabel: computed(() => selectedConnectionType.value || 'All')
})
</script>
