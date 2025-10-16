<script setup lang="ts">
import { computed } from 'vue'
import { useLogsStore, type LocationGroup } from '@/stores/logs'
import { ChevronDownIcon, ChevronRightIcon } from '@heroicons/vue/24/outline'
import QueryRow from './QueryRow.vue'

const props = defineProps<{
  group: LocationGroup
}>()

const logsStore = useLogsStore()

const isExpanded = computed(() => logsStore.expandedLocations.has(props.group.location))

function toggle() {
  logsStore.toggleLocation(props.group.location)
}

function getGroupClass(): string {
  // Color-code based on whether there are errors
  if (props.group.hasErrors) {
    return 'bg-red-50 border-red-300'
  }
  return 'bg-blue-50 border-blue-300'
}
</script>

<template>
  <div class="border-l-4 mb-2" :class="getGroupClass()">
    <!-- Group Header -->
    <div
      class="flex items-center gap-3 px-4 py-2 cursor-pointer hover:bg-opacity-80"
      :class="getGroupClass()"
      @click="toggle"
    >
      <!-- Expand Icon -->
      <component
        :is="isExpanded ? ChevronDownIcon : ChevronRightIcon"
        class="w-4 h-4 text-gray-600 flex-shrink-0"
      />

      <!-- Location Summary -->
      <span class="text-sm font-semibold text-gray-800">
        {{ group.location }}
      </span>

      <!-- Stats -->
      <span class="text-xs text-gray-600">
        {{ group.queryCount }} queries, {{ group.totalDurationMs }}ms total
      </span>

      <!-- Error Badge -->
      <span v-if="group.hasErrors" class="text-xs bg-red-600 text-white px-2 py-0.5 rounded">
        Has Errors
      </span>
    </div>

    <!-- Expanded Queries -->
    <div v-if="isExpanded" class="ml-4">
      <QueryRow v-for="query in group.queries" :key="query.id" :log="query" />
    </div>
  </div>
</template>
