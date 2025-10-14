<template>
  <div class="p-2 space-y-2">
    <div class="flex flex-wrap items-center gap-2">
      <Listbox v-if="selectedDbType" v-model="selectedDbType" as="div" class="relative">
        <ListboxButton
          class="inline-flex items-center gap-2 px-2 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-slate-400 whitespace-nowrap min-w-[100px]"
        >
          <img :src="selectedDbType.logo" :alt="selectedDbType.type" class="h-4 w-4" />
          <span class="truncate">{{ selectedDbType.type }}</span>
          <ChevronDownIcon class="h-4 w-4 text-gray-400" />
        </ListboxButton>
        <transition
          leave-active-class="transition ease-in duration-100"
          leave-from-class="opacity-100"
          leave-to-class="opacity-0"
        >
          <ListboxOptions
            class="absolute left-0 z-30 mt-1 max-h-60 w-48 overflow-auto rounded-md bg-white py-1 text-sm shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none"
          >
            <ListboxOption
              v-for="option in dbTypeOptions"
              :key="option.id"
              v-slot="{ active, selected }"
              :value="option"
            >
              <li
                :class="[
                  active ? 'bg-gray-100' : '',
                  'relative cursor-default select-none py-2 px-3 flex items-center gap-2'
                ]"
              >
                <img :src="option.logo" :alt="option.type" class="h-4 w-4" />
                <span :class="[selected ? 'font-semibold' : 'font-normal', 'truncate']">
                  {{ option.type }}
                </span>
                <CheckIcon
                  v-if="selected"
                  class="absolute right-2 h-4 w-4 text-gray-600"
                  aria-hidden="true"
                />
              </li>
            </ListboxOption>
          </ListboxOptions>
        </transition>
      </Listbox>
      <div class="flex-1 min-w-[120px]">
        <SearchInput v-model="connectionSearch" placeholder="Filter..." size="sm" />
      </div>
      <button
        type="button"
        class="inline-flex items-center gap-2 px-2 py-1.5 text-xs font-medium text-white bg-gray-600 border border-gray-600 rounded hover:bg-gray-500"
        @click="$emit('add-connection')"
      >
        <span>New</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useConnectionsStore } from '@/stores/connections'
import { usePersistedState } from '@/composables/usePersistedState'
import { Listbox, ListboxButton, ListboxOption, ListboxOptions } from '@headlessui/vue'
import { ChevronDownIcon, CheckIcon } from '@heroicons/vue/24/outline'
import SearchInput from '@/components/common/SearchInput.vue'
import type { DbType } from '@/types/connections'

const connectionsStore = useConnectionsStore()

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

// Connection type filter (persisted) - plain string, not JSON
const selectedConnectionType = usePersistedState<string | null>('explorer.connectionType', null, {
  serializer: (value) => value || '',
  deserializer: (value) => value || null
})
const dbTypeOptions = computed<DbType[]>(() => connectionsStore.dbTypes)
const selectedDbType = ref<DbType | null>(null)
let hasInitializedTypeFilter = false

watch(
  dbTypeOptions,
  (options) => {
    if (!options.length) return
    if (!hasInitializedTypeFilter) {
      selectedDbType.value = selectedConnectionType.value
        ? options.find((opt) => opt.type === selectedConnectionType.value) || options[0]
        : options[0]
      hasInitializedTypeFilter = true
      return
    }
    if (selectedDbType.value) {
      const match = options.find((opt) => opt.type === selectedDbType.value?.type)
      selectedDbType.value = match || options[0]
    } else {
      selectedDbType.value = options[0]
    }
  },
  { immediate: true }
)

watch(
  () => selectedDbType.value?.type,
  (val) => {
    if (!hasInitializedTypeFilter) return
    selectedConnectionType.value = val || null
  }
)

// Expose the selected type for parent component
defineExpose({
  selectedDbTypeLabel: computed(() => selectedDbType.value?.type || 'All')
})
</script>
