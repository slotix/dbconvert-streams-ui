<template>
  <header>
    <div
      class="bg-white flex flex-wrap justify-between space-y-4 sm:space-y-0 max-w-7xl mx-auto py-6 px-8"
    >
      <h1 class="flex-auto text-3xl font-bold text-gray-900 dark:text-white;">
        {{ connectionsCount }} Database Connections.
      </h1>
    </div>
  </header>
  <main>
    <!-- Main area -->
    <Connections />
  </main>
</template>

<script setup>
import Connections from '@/components/connection/Connections.vue'
// const connectionsCount = 18
</script>
