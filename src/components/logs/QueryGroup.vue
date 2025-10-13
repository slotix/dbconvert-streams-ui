<script setup lang="ts">
import { computed } from 'vue'
import { useLogsStore, type QueryGroup } from '@/stores/logs'
import { ChevronDownIcon, ChevronRightIcon } from '@heroicons/vue/24/outline'
import QueryRow from './QueryRow.vue'

const props = defineProps<{
  group: QueryGroup
}>()

const logsStore = useLogsStore()

const isExpanded = computed(() => logsStore.expandedGroups.has(props.group.groupId))

const groupQueries = computed(() =>
  props.group.queryIds.map((id) => logsStore.flatLogs.get(id)).filter(Boolean)
)

function toggle() {
  logsStore.toggleGroup(props.group.groupId)
}

function getGroupTypeClass(type: string): string {
  const classes: Record<string, string> = {
    metadata: 'bg-gray-100 border-gray-300',
    pagination: 'bg-orange-50 border-orange-300',
    repeated: 'bg-yellow-50 border-yellow-300',
    'table-open': 'bg-blue-50 border-blue-300'
  }
  return classes[type] || 'bg-gray-100 border-gray-300'
}
</script>

<template>
  <div
    class="border-l-4 mb-2"
    :class="[getGroupTypeClass(group.type), { 'border-red-500': group.hasErrors }]"
  >
    <!-- Group Header -->
    <div
      class="flex items-center gap-3 px-4 py-2 cursor-pointer hover:bg-opacity-80"
      :class="getGroupTypeClass(group.type)"
      @click="toggle"
    >
      <!-- Expand Icon -->
      <component
        :is="isExpanded ? ChevronDownIcon : ChevronRightIcon"
        class="w-4 h-4 text-gray-600 flex-shrink-0"
      />

      <!-- Group Summary -->
      <span class="text-sm font-semibold text-gray-800">
        {{ group.summary }}
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
      <QueryRow v-for="query in groupQueries" :key="query!.id" :log="query!" />
    </div>
  </div>
</template>
