<script setup lang="ts">
import { computed } from 'vue'
import type { SQLQueryLog, QueryGroup } from '@/stores/logs'
import { useLogsStore } from '@/stores/logs'
import LogFilters from './LogFilters.vue'
import QueryRow from './QueryRow.vue'
import QueryGroupComponent from './QueryGroup.vue'

const logsStore = useLogsStore()

const visibleLogs = computed(() => logsStore.visibleLogs)

function isGroup(item: SQLQueryLog | QueryGroup): item is QueryGroup {
  return 'queryIds' in item
}
</script>

<template>
  <div class="h-full flex flex-col">
    <!-- Filter Header -->
    <LogFilters />

    <!-- Query List -->
    <div
      v-if="visibleLogs.length === 0"
      class="flex items-center justify-center h-full text-gray-500"
    >
      <p>No queries match current filters.</p>
    </div>

    <div v-else class="overflow-auto flex-1">
      <div v-for="item in visibleLogs" :key="'groupId' in item ? item.groupId : item.id">
        <QueryGroupComponent v-if="isGroup(item)" :group="item" />
        <QueryRow v-else :log="item" />
      </div>
    </div>
  </div>
</template>
