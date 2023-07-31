<template>
  <div>
    <div class="sm:hidden">
      <label for="tabs" class="sr-only">Select a tab</label>
      <!-- Use an "onChange" listener to redirect the user to the selected tab URL. -->
      <select
        id="tabs"
        name="tabs"
        class="block w-full pt-0.2 rounded-md border-gray-300 focus:border-gray-500 focus:ring-gray-500"
        @change="emitCurrentTab($event.target.value)"
      >
        <option v-for="tab in tabs" :key="tab.name" :selected="tab.current">{{ tab.name }}</option>
      </select>
    </div>
    <div class="hidden sm:block">
      <nav class="isolate flex divide-x divide-gray-200 rounded-md shadow" aria-label="Tabs">
        <button
          type="button"
          v-for="(tab, tabIdx) in tabs"
          :key="tab.name"
          :class="[
            tab.current
              ? 'text-gray-900 ring-2 ring-inset ring-gray-600'
              : 'text-gray-500 hover:text-gray-700',
            tabIdx === 0 ? 'rounded-l-lg' : '',
            tabIdx === tabs.length - 1 ? 'rounded-r-lg' : '',
            'group inline-flex min-w-0  overflow-hidden bg-white py-2 px-4 text-center text-sm font-medium hover:bg-gray-50 focus:z-10'
          ]"
          :aria-current="tab.current ? 'page' : undefined"
          @click="toggleView(tab.name)"
        >
          <component
            :is="tab.icon"
            :class="[
              tab.current ? 'text-gray-500' : 'text-gray-400 group-hover:text-gray-500',
              '-ml-0.5 mr-2 h-5 w-5'
            ]"
            aria-hidden="true"
          />
          <span>{{ tab.name }}</span>
        </button>
      </nav>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { TableCellsIcon, Squares2X2Icon } from '@heroicons/vue/24/outline'
const tabs = ref([
  { name: 'Cards', icon: Squares2X2Icon, current: false },
  { name: 'Table', icon: TableCellsIcon, current: true }
])

const emit = defineEmits(['toggleView']);
const emitCurrentTab = (tabName) => {
  // Emit the current tab name to the parent component
  if (tabName) {
    emit('toggleView');
  }
};
const toggleView = (tabName) => {
  tabs.value.forEach((tab) => {
    tab.current = tab.name === tabName // Set the `current` value based on the selected tab
    // tab.current = !tab.current // Toggle the `current` value
  })
  emitCurrentTab(tabName) // Emit the current tab name to the parent component
  // this.cardsView = !this.cardsView
}
</script>
