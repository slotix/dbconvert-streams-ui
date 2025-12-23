<template>
  <div class="relative">
    <!-- Button -->
    <button
      ref="buttonRef"
      class="inline-flex items-center gap-2 px-2 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-850 border border-gray-300 dark:border-gray-700 rounded hover:bg-gray-50 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 whitespace-nowrap min-w-[100px]"
      :title="buttonTooltip"
      @click="isOpen = !isOpen"
    >
      <Layers v-if="selectedTypes.length === 0" class="h-5 w-5 text-gray-500 dark:text-gray-300" />
      <img
        v-else-if="selectedTypes.length === 1"
        :src="getSingleTypeLogo()"
        :alt="selectedTypes[0]"
        class="h-5 w-5 dark:brightness-0 dark:invert dark:opacity-70"
      />
      <Layers v-else class="h-5 w-5 text-gray-600 dark:text-gray-400" />
      <span class="truncate">{{ buttonLabel }}</span>
      <ChevronDown class="h-4 w-4 text-gray-400 dark:text-gray-300" />
    </button>

    <!-- Dropdown -->
    <Teleport to="body">
      <div
        v-if="isOpen"
        ref="dropdownRef"
        :style="dropdownStyle"
        class="fixed z-50 w-56 rounded-md bg-white dark:bg-gray-850 shadow-lg dark:shadow-gray-900/50 ring-1 ring-black dark:ring-gray-700 ring-opacity-5 dark:ring-opacity-50"
      >
        <div class="py-1">
          <!-- Select All / Clear All -->
          <div class="px-3 py-2 border-b border-gray-200 dark:border-gray-700">
            <button
              v-if="selectedTypes.length > 0"
              class="text-xs text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 font-medium"
              @click.stop="clearAll"
            >
              Clear All
            </button>
            <button
              v-else
              class="text-xs text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 font-medium"
              @click.stop="selectAll"
            >
              Select All
            </button>
          </div>

          <!-- Checkbox options -->
          <div class="max-h-60 overflow-auto">
            <button
              v-for="option in availableTypes"
              :key="option.id"
              class="w-full text-left px-3 py-2 text-sm text-gray-900 dark:text-gray-100 flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-800"
              @click.stop="toggleType(option.type)"
            >
              <!-- Checkbox -->
              <div
                :class="[
                  'shrink-0 w-4 h-4 rounded border flex items-center justify-center',
                  isTypeSelected(option.type)
                    ? 'bg-gray-600 dark:bg-gray-500 border-gray-600 dark:border-gray-500'
                    : 'bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600'
                ]"
              >
                <Check v-if="isTypeSelected(option.type)" class="h-3 w-3 text-white" />
              </div>

              <!-- Icon -->
              <img
                :src="option.logo"
                :alt="option.type"
                class="h-5 w-5 dark:brightness-0 dark:invert dark:opacity-70"
              />

              <!-- Label -->
              <span class="flex-1 truncate">{{ option.type }}</span>
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { useConnectionsStore } from '@/stores/connections'
import { Check, ChevronDown, Layers } from 'lucide-vue-next'
import type { DbType } from '@/types/connections'

interface Props {
  selectedTypes?: string[]
  persistent?: boolean
}

const emit = defineEmits<{
  'update:selectedTypes': [value: string[]]
}>()

const props = withDefaults(defineProps<Props>(), {
  selectedTypes: () => [],
  persistent: false
})

const connectionsStore = useConnectionsStore()

// Get all available types except "All"
const availableTypes = computed<DbType[]>(() => {
  return connectionsStore.dbTypes.filter((type) => type.type !== 'All')
})

// Local state
const isOpen = ref(false)
const buttonRef = ref<HTMLElement | null>(null)
const dropdownRef = ref<HTMLElement | null>(null)
const dropdownStyle = ref({})

// Use props directly - no local copy needed
const selectedTypes = computed(() => props.selectedTypes || [])

// Position dropdown
async function positionDropdown() {
  await nextTick()
  if (!buttonRef.value || !isOpen.value) return

  const button = buttonRef.value.getBoundingClientRect()
  const dropdownHeight = 400 // Max height estimate
  const spaceBelow = window.innerHeight - button.bottom
  const spaceAbove = button.top

  // Position below by default, above if not enough space
  if (spaceBelow >= dropdownHeight || spaceBelow >= spaceAbove) {
    dropdownStyle.value = {
      top: `${button.bottom + window.scrollY + 4}px`,
      left: `${button.left + window.scrollX}px`
    }
  } else {
    dropdownStyle.value = {
      bottom: `${window.innerHeight - button.top - window.scrollY + 4}px`,
      left: `${button.left + window.scrollX}px`
    }
  }
}

watch(isOpen, async (open) => {
  if (open) {
    await positionDropdown()
  }
})

// Close on click outside
function handleClickOutside(event: MouseEvent) {
  if (!isOpen.value) return
  const target = event.target as Node
  if (
    buttonRef.value &&
    !buttonRef.value.contains(target) &&
    dropdownRef.value &&
    !dropdownRef.value.contains(target)
  ) {
    isOpen.value = false
  }
}

// Close on escape
function handleEscape(event: KeyboardEvent) {
  if (event.key === 'Escape' && isOpen.value) {
    isOpen.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
  document.addEventListener('keydown', handleEscape)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
  document.removeEventListener('keydown', handleEscape)
})

// Button label
const buttonLabel = computed(() => {
  if (selectedTypes.value.length === 0) {
    return 'All Types'
  } else if (selectedTypes.value.length === 1) {
    return selectedTypes.value[0]
  } else {
    return `${selectedTypes.value.length} Types`
  }
})

// Button tooltip
const buttonTooltip = computed(() => {
  if (selectedTypes.value.length === 0) {
    return 'Filter by connection type: Show all database and file sources'
  } else if (selectedTypes.value.length === 1) {
    return `Filter by connection type: ${selectedTypes.value[0]}`
  } else {
    return `Filter by connection types: ${selectedTypes.value.join(', ')}`
  }
})

// Get logo for single selection
function getSingleTypeLogo(): string {
  if (selectedTypes.value.length === 1) {
    const type = availableTypes.value.find((t) => t.type === selectedTypes.value[0])
    return type?.logo || '/images/db-logos/all.svg'
  }
  return '/images/db-logos/all.svg'
}

// Check if a type is selected
function isTypeSelected(type: string): boolean {
  return selectedTypes.value.includes(type)
}

// Toggle a type selection
function toggleType(type: string) {
  const current = [...selectedTypes.value]
  const index = current.indexOf(type)
  if (index > -1) {
    current.splice(index, 1)
  } else {
    current.push(type)
  }
  emit('update:selectedTypes', current)
}

// Select all types
function selectAll() {
  emit(
    'update:selectedTypes',
    availableTypes.value.map((t) => t.type)
  )
}

// Clear all selections
function clearAll() {
  emit('update:selectedTypes', [])
}
</script>
