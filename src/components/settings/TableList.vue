
<template>
  <div class="relative p-6 bg-white rounded-lg shadow-md">
    <div>
      <h2 class="text-lg font-semibold text-gray-700">Select Tables:</h2>
      <div class="flex flex-col sm:flex-row justify-between items-center mt-3">
        <div class="relative flex items-center">
          <input
            type="text"
            v-model="searchQuery"
            placeholder="Filter tables..."
            class="rounded-md border-0 py-1.5 pl-10 pr-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-gray-600 sm:text-sm sm:leading-6"
          />
          <FunnelIcon class="absolute h-5 w-5 text-gray-400 left-3" aria-hidden="true" />
        </div>
        <div class="mt-3 sm:mt-0 sm:ml-0 space-y-2 sm:space-y-0 sm:space-x-2">
          <button
            class="px-3 py-2 text-sm text-gray-600 hover:text-gray-800 rounded-md transition-colors duration-300 sm:inline-block"
            @click="selectAll"
          >
            Select All
          </button>
          <button
            class="px-3 py-2 text-sm text-gray-600 hover:text-gray-800 rounded-md transition-colors duration-300 sm:inline-block"
            @click="deselectAll"
          >
            Deselect All
          </button>
        </div>
      </div>
      <ul class="mt-4 space-y-2">
        <li v-for="item in filteredItems" :key="item.id">
          <label class="inline-flex items-center space-x-2">
            <input
              type="checkbox"
              class="form-checkbox text-gray-600 focus:ring-gray-400"
              :value="item.id"
              v-model="selectedItems"
            />
            <span class="text-gray-800">{{ item.label }}</span>
          </label>
        </li>
      </ul>
      <div class="mt-6 border-t border-gray-300 pt-4">
        <p class="text-sm text-gray-600">
          Selected: {{ selectedItems.length }} of {{ items.length }} tables
        </p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { FunnelIcon } from '@heroicons/vue/24/outline'
const searchQuery = ref('')

const items = ref([
  { id: 1, label: 'Very looooooooong Table Name 1' },
  { id: 2, label: 'Table 2' },
  { id: 3, label: 'Table 3' },
  { id: 4, label: 'Table 4' },
  { id: 5, label: 'Table 5' }
  // Add more items
])

const selectedItems = ref([])

const selectAll = () => {
  selectedItems.value = items.value.map((item) => item.id)
}

const deselectAll = () => {
  selectedItems.value = []
}

const filteredItems = computed(() => {
  if (!searchQuery.value) {
    return items.value
  }
  const query = searchQuery.value.toLowerCase()
  return items.value.filter((item) => item.label.toLowerCase().includes(query))
})
</script>
