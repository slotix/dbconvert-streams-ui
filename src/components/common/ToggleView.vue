<template>
  <div>
    <div class="sm:hidden">
      <!-- <label for="tabs" class="sr-only">Select a tab</label> -->
      <select
        name="tabs"
        class="block w-full pt-[0.2rem] rounded-md border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-850 text-gray-900 dark:text-gray-100 focus:border-gray-500 dark:focus:border-gray-600 focus:ring-gray-500 dark:focus:ring-gray-600"
        @change="toggleView($event.target.value)"
      >
        <option v-for="tab in tabs" :id="'tab-' + tab.name" :key="tab.name" :selected="tab.current">
          {{ tab.name }}
        </option>
      </select>
    </div>
    <div class="hidden sm:block">
      <div class="flex items-center mb-2">
        <span class="text-gray-500 dark:text-gray-400 text-sm font-medium mr-4">View:</span>
        <nav
          class="isolate flex divide-x divide-gray-200 dark:divide-gray-700 rounded-md shadow dark:shadow-gray-900/30"
          aria-label="Tabs"
        >
          <button
            v-for="(tab, tabIdx) in tabs"
            :key="tab.name"
            type="button"
            :class="[
              tab.current
                ? 'text-gray-900 dark:text-gray-100 ring-2 ring-inset ring-gray-600 dark:ring-gray-500'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300',
              tabIdx === 0 ? 'rounded-l-lg' : '',
              tabIdx === tabs.length - 1 ? 'rounded-r-lg' : '',
              'group inline-flex min-w-0  overflow-hidden bg-white dark:bg-gray-850 py-2 px-4 text-center text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 focus:z-10'
            ]"
            :aria-current="tab.current ? 'page' : undefined"
            @click="toggleView(tab.name)"
          >
            <component
              :is="tab.icon"
              :class="[
                tab.current
                  ? 'text-gray-500 dark:text-gray-400'
                  : 'text-gray-400 dark:text-gray-500 group-hover:text-gray-500 dark:group-hover:text-gray-400',
                '-ml-0.5 mr-2 h-5 w-5'
              ]"
              aria-hidden="true"
            />
            <span>{{ tab.name }}</span>
          </button>
        </nav>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { TableCellsIcon, Squares2X2Icon } from '@heroicons/vue/24/outline'
import { useCommonStore } from '@/stores/common'
const store = useCommonStore()
const tabs = ref([
  { name: 'cards', icon: Squares2X2Icon, current: true },
  { name: 'table', icon: TableCellsIcon, current: false }
])
onMounted(() => {
  tabs.value.forEach((tab) => {
    tab.current = tab.name === store.currentViewType
  })
})
const toggleView = (tabName) => {
  tabs.value.forEach((tab) => {
    tab.current = tab.name === tabName // Set the `current` value based on the selected tab
  })
  // store.currentViewType = tabName
  store.setViewType(tabName)
}
</script>
