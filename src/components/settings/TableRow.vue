<template>
  <tr :class="{ 'bg-gray-200': isSelected }" @click="handleSelectTable">
    <td class="relative py-4 px-7 sm:w-12 sm:px-6" :class="{ 'border-l border-white': isSelected }">
      <input
        :id="'checkbox-' + table.name"
        v-model="table.selected"
        type="checkbox"
        class="absolute left-4 top-1/2 -mt-2 h-4 w-4 rounded border-gray-300 text-gray-600 focus:ring-gray-600"
        @change.stop="handleCheckboxChange"
      />
    </td>
    <td class="py-4 px-3" :class="{ 'border-r border-white': isSelected }">
      {{ table.name }}
    </td>
    <td class="p-4">
      <button
        class="flex items-center text-blue-600 hover:text-blue-800"
        @click.stop="toggleSettings"
      >
        Options
        <ChevronDownIcon v-if="!showSettings" class="h-5 w-5 ml-1" />
        <ChevronUpIcon v-if="showSettings" class="h-5 w-5 ml-1" />
      </button>
    </td>
  </tr>
  <!-- Additional <tr> for collapsible panel -->
  <tr v-if="showSettings">
    <td :colspan="colspan">
      <div class="bg-white px-4 pb-4 shadow">
        <!-- Content for the settings panel -->
        <slot></slot>
      </div>
    </td>
  </tr>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/vue/24/outline'

const props = defineProps({
  table: {
    type: Object,
    required: true
  },
  isSelected: {
    type: Boolean,
    default: false
  },
  colspan: {
    type: Number,
    required: true
  }
})

const emit = defineEmits(['selectTable', 'checkboxChange', 'toggleSettings'])

const showSettings = ref(false)

const handleSelectTable = () => {
  emit('selectTable', props.table)
}

const handleCheckboxChange = (event: Event) => {
  const target = event.target as HTMLInputElement
  emit('checkboxChange', { table: props.table, checked: target.checked })
}

const toggleSettings = () => {
  showSettings.value = !showSettings.value
  emit('toggleSettings', props.table.name)
}
</script>
