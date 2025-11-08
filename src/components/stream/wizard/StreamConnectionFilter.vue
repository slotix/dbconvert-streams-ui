<template>
  <div class="p-2">
    <div class="flex flex-wrap items-center gap-2">
      <ConnectionTypeFilter
        :key="`stream-filter-${instanceId}`"
        :selected-type="selectedType"
        :persistent="false"
        @update:selected-type="handleTypeChange"
      />
      <div class="flex-1 min-w-[120px]">
        <SearchInput v-model="connectionSearch" placeholder="Filter..." size="sm" />
      </div>
      <button
        type="button"
        class="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-white bg-teal-600 dark:bg-teal-500 border border-transparent rounded-lg hover:shadow-md dark:hover:shadow-teal-900/40 hover:scale-105 transition-all duration-200"
        @click="$emit('add-connection', props.paneType || 'source')"
      >
        <span>New Connection</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import ConnectionTypeFilter from '@/components/common/ConnectionTypeFilter.vue'
import SearchInput from '@/components/common/SearchInput.vue'

interface Props {
  connectionSearch: string
  paneType?: 'source' | 'target'
}

const emit = defineEmits<{
  'update:connectionSearch': [value: string]
  'update:selectedType': [value: string | null]
  'add-connection': [paneType: 'source' | 'target']
}>()

const props = defineProps<Props>()

// Generate unique instance ID to ensure each filter has independent state
const instanceId = ref<string>('')

onMounted(() => {
  instanceId.value = Math.random().toString(36).substr(2, 9)
})

const connectionSearch = computed({
  get: () => props.connectionSearch,
  set: (value) => emit('update:connectionSearch', value)
})

// Local state for the type filter - independent per instance
const selectedType = ref<string | null>(null)

// Watch selectedType and emit changes to parent
const handleTypeChange = (newType: string | null) => {
  selectedType.value = newType
  emit('update:selectedType', newType)
}

defineExpose({
  selectedType
})
</script>
