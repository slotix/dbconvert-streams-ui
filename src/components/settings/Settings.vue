<template>
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <div class="bg-white shadow rounded-lg border border-gray-200 p-6">
        <TableList />
      </div>
      <div class="bg-white shadow rounded-lg border border-gray-200 p-6">
        <StreamSettings />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import TableList from './TableList.vue'
import StreamSettings from './StreamSettings.vue'
</script>
