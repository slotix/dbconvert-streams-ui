<template>
  <Listbox v-if="selectedDbType" v-model="selectedDbType" as="div" class="relative">
    <ListboxButton
      class="inline-flex items-center gap-2 px-2 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-slate-400 whitespace-nowrap min-w-[100px]"
      :title="
        selectedDbType.type === 'All'
          ? 'Connections: Show all database and file sources'
          : `Filter by ${selectedDbType.type}`
      "
    >
      <RectangleStackIcon v-if="selectedDbType.type === 'All'" class="h-4 w-4 text-gray-500" />
      <img v-else :src="selectedDbType.logo" :alt="selectedDbType.type" class="h-4 w-4" />
      <span class="truncate">{{
        selectedDbType.type === 'All' ? 'Connections' : selectedDbType.type
      }}</span>
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
            <RectangleStackIcon v-if="option.type === 'All'" class="h-4 w-4 text-gray-500" />
            <img v-else :src="option.logo" :alt="option.type" class="h-4 w-4" />
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
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useConnectionsStore } from '@/stores/connections'
import { Listbox, ListboxButton, ListboxOption, ListboxOptions } from '@headlessui/vue'
import { ChevronDownIcon, CheckIcon, RectangleStackIcon } from '@heroicons/vue/24/outline'
import type { DbType } from '@/types/connections'

interface Props {
  selectedType?: string | null
  persistent?: boolean
}

const emit = defineEmits<{
  'update:selectedType': [value: string | null]
}>()

const props = withDefaults(defineProps<Props>(), {
  selectedType: null,
  persistent: false
})

const connectionsStore = useConnectionsStore()
const dbTypeOptions = computed<DbType[]>(() => connectionsStore.dbTypes)

// Local state for selected type
const selectedDbType = ref<DbType | null>(null)
const hasInitialized = ref(false)

// Sync with prop
const syncedSelectedType = computed({
  get: () => props.selectedType,
  set: (value) => emit('update:selectedType', value)
})

watch(
  dbTypeOptions,
  (options) => {
    if (!options.length) return
    if (!hasInitialized.value) {
      const typeToSelect = syncedSelectedType.value
        ? options.find((opt) => opt.type === syncedSelectedType.value) || options[0]
        : options[0]
      selectedDbType.value = typeToSelect
      hasInitialized.value = true
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
    if (!hasInitialized.value) return
    syncedSelectedType.value = val || null
  }
)
</script>
