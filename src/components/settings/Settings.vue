<template>
  <div class="bg-gray-200">
    <div class="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
      <div class="lg:flex lg:flex-row">
        <div class="lg:w-1/2 pb-8">
          <TableList />
        </div>
        <div class="lg:w-1/2 lg:pl-8">
          <StreamSettings class="pb-8" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import TableList from './TableList.vue'
import StreamSettings from './StreamSettings.vue'
</script>
