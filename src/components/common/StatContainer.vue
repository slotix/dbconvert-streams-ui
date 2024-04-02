<template>

  <div>
    <dl
      class="mt-5 grid grid-cols-1 divide-y divide-gray-200 overflow-hidden rounded-lg bg-white shadow md:grid-cols-4 md:divide-x md:divide-y-0">
      <div v-for="stat in stats" :key="stat.id" class="px-4 py-5 sm:p-6">
        <dt class="pb-5 text-base font-normal text-gray-900 ">{{ stat.type }} {{ stat.nodeID }}</dt>
        <dd class="mt-1 flex items-baseline justify-between md:block lg:flex">
          <div class="flex items-baseline text-2xl font-semibold text-gray-600" :class="getStatusColor(stat.status)">
            {{ stat.status }}
          </div>
        </dd>
        <dd class="mt-1 flex items-baseline justify-between md:block lg:flex">
          <div class="flex items-baseline text-2xl font-semibold text-gray-600">
            {{ stat.events }}
            <span class="ml-2 text-sm font-medium text-gray-500"> events </span>
          </div>
        </dd>

        <dd class="mt-1 flex items-baseline justify-between md:block lg:flex">
          <div class="flex items-baseline text-2xl font-semibold text-gray-600">
            {{ stat.size }}
            <span class="ml-2 text-sm font-medium text-gray-500"> size </span>
          </div>
        </dd>
        <dd class="mt-1 flex items-baseline justify-between md:block lg:flex">
          <div class="flex items-baseline text-2xl font-semibold text-gray-600">
            {{ stat.rate }}
            <span class="ml-2 text-sm font-medium text-gray-500"> rate </span>
          </div>
        </dd>

        <dd class="mt-1 flex items-baseline justify-between md:block lg:flex">
          <div class="flex items-baseline text-2xl font-semibold text-gray-600">
            {{ stat.elapsed }}
            <span class="ml-2 text-sm font-medium text-gray-500"> elapsed </span>
          </div>
        </dd>
      </div>
    </dl>
  </div>

  <!-- <div v-for="stat in stats" :key="stat.id" class="px-4 py-5 sm:p-0">
    <dl
      class="mt-5 grid grid-cols-1 divide-y divide-gray-200 overflow-hidden rounded-lg bg-white shadow md:grid-cols-6 md:divide-x md:divide-y-0">
      <dt class="pb-5 text-base font-normal text-gray-900 ">{{ stat.type }} {{ stat.nodeID }}</dt>
      <dd class="mt-1 flex items-baseline justify-between md:block lg:flex">
        <div class="flex items-baseline text-2xl font-semibold text-gray-600" :class="getStatusColor(stat.status)">
          {{ stat.status }}
        </div>
      </dd>
      <dd class="mt-1 flex items-baseline justify-between md:block lg:flex">
        <div class="flex items-baseline text-2xl font-semibold text-gray-600">
          {{ stat.events }}
          <span class="ml-2 text-sm font-medium text-gray-500"> events </span>
        </div>
      </dd>

      <dd class="mt-1 flex items-baseline justify-between md:block lg:flex">
        <div class="flex items-baseline text-2xl font-semibold text-gray-600">
          {{ stat.size }}
          <span class="ml-2 text-sm font-medium text-gray-500"> size </span>
        </div>
      </dd>
      <dd class="mt-1 flex items-baseline justify-between md:block lg:flex">
        <div class="flex items-baseline text-2xl font-semibold text-gray-600">
          {{ stat.rate }}
          <span class="ml-2 text-sm font-medium text-gray-500"> rate </span>
        </div>
      </dd>

      <dd class="mt-1 flex items-baseline justify-between md:block lg:flex">
        <div class="flex items-baseline text-2xl font-semibold text-gray-600">
          {{ stat.elapsed }}
          <span class="ml-2 text-sm font-medium text-gray-500"> elapsed </span>
        </div>
      </dd>
    </dl>
  </div> -->

</template>
<script setup>

import { ref, onMounted, computed } from 'vue';

import { useMonitoringStore } from '@/stores/monitor.js'
const store = useMonitoringStore()
const logs = store.logs;
const stats = computed(() => {
  const nodes = store.runningStream.nodes.filter(node => {
    return node.type === 'source' || node.type === 'target';
  });

  const filteredLogs = nodes.map(node => {
    // Filter logs for each node
    const logsForNode = logs.filter(log => log.nodeID === node.id && log.msg.startsWith('[progress]'));

    // Find the last log entry for the current node
    const lastLogEntry = logsForNode.length > 0 ? logsForNode[logsForNode.length - 1] : null;
    if (lastLogEntry) {
      // Split the message into parts
      const parts = lastLogEntry.msg.split('|').map(part => part.trim());
      lastLogEntry['status'] = parts[0].split(' ')[1];
      // Extract individual parts using key-value pairs
      parts.forEach(part => {
        const [key, value] = part.split(':');
        if (key && value) {
          lastLogEntry[key.toLowerCase()] = value.trim();
        }
      });
    }
    return lastLogEntry

  });
  // Remove null entries (nodes without any logs)
  const filtered = filteredLogs.filter(log => log !== null);
  return filtered;

});

const getStatusColor = (status) => {
  // Return a class based on the status value
  switch (status) {
    case 'FINISHED':
      return 'text-green-600'; // Green color for 'FINISHED' status
    case 'RUNNING':
      return 'text-blue-600'; // Blue color for 'RUNNING' status
    case 'FAILED':
      return 'text-red-600'; // Red color for 'FAILED' status
    default:
      return ''; // Default class (no color change)
  }
};

</script>