<template>

  <div class="relative mt-20  pb-5">
    <h3 class="text-xl font-semibold leading-6 text-gray-900">Logs</h3>
  </div>
  <div>
    <div class="sm:hidden">
      <label for="tabs" class="sr-only">Select a node</label>
      <select id="tabs" name="tabs"
        class="block w-full rounded-md border-gray-300 focus:border-gray-500 focus:ring-gray-500"
        @change="changeTab($event.target.selectedIndex)">
        <option v-for="(node, nodeIdx) in store.nodes" :key="node.id" :value="nodeIdx"
          :selected="nodeIdx === activeNode">{{ node.type }} - {{ node.id }}</option>
      </select>
    </div>
    <div class="hidden sm:block">
      <nav class="isolate flex divide-x divide-gray-200 rounded-lg shadow" aria-label="Tabs">
        <a v-for="(node, nodeIdx) in store.nodes" :key="node.id"
          :class="[node.current ? 'text-gray-900' : 'text-gray-500 hover:text-gray-700', nodeIdx === 0 ? 'rounded-l-lg' : '', nodeIdx === store.nodes.length - 1 ? 'rounded-r-lg' : '', 'group relative min-w-0 flex-1 overflow-hidden bg-white py-4 px-4 text-center text-sm font-medium hover:bg-gray-100 focus:z-10']"
          :aria-current="node.current ? 'page' : undefined" @click="changeTab(nodeIdx)">
          <div class="flex flex-col items-center"> <!-- Wrap tab content in a flex column -->
            <span class="text-lg font-medium">{{ node.type }}</span> <!-- Tab type as title -->
            <span class="text-xs text-gray-500">{{ node.id }}</span> <!-- Grayed out tab ID -->
          </div>
          <span aria-hidden="true"
            :class="[node.current ? 'bg-gray-500' : 'bg-transparent', 'absolute inset-x-0 bottom-0 h-0.5']" />
        </a>
      </nav>
    </div>
  </div>
  <div class="divide-y divide-gray-200 overflow-hidden rounded-lg bg-white shadow">
    <div class="max-h-96 overflow-y-auto px-4 py-5 sm:p-6" ref="logContainer">
      <div v-for="log in filteredLogs" :key="log.id" :class="[
        'flex',
        'flex-row',
        'items-center',
        'p-2',
        'text-gray-800',
        'font-mono',
        'border-b border-gray-100',
        { 'bg-white': log.level !== 'warn' && log.level !== 'error' },
        { 'bg-yellow-100': log.level === 'warn' },
        { 'bg-red-100': log.level === 'error' }
      ]">

        <div v-if="log.level === 'info'">
          <InformationCircleIcon class="mr-3 h-5 w-5 text-green-600 group-hover:text-green-700" aria-hidden="true" />
        </div>
        <div v-else-if="log.level === 'debug'">
          <BugAntIcon class="mr-3 h-5 w-5 text-gray-600 group-hover:text-gray-700" aria-hidden="true" />
        </div>

        <div v-else-if="log.level === 'error'">
          <ExclamationCircleIcon class="mr-3 h-5 w-5 text-red-600 group-hover:text-red-700" aria-hidden="true" />
        </div>

        <div v-else-if="log.level === 'warn'">
          <ExclamationTriangleIcon class="mr-3 h-5 w-5 text-yellow-600 group-hover:text-yellow-700"
            aria-hidden="true" />
        </div>
        <span class="text-gray-500 tabular-nums text-sm ml-0 mr-2">
          [{{ formatTimestamp(log.ts) }}]
        </span>
        <span class="basis-5/6">
          {{ log.msg }}
        </span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';

import { BugAntIcon, InformationCircleIcon, ExclamationCircleIcon, ExclamationTriangleIcon, ArrowUpIcon, ArrowDownIcon } from '@heroicons/vue/20/solid'

import { useMonitoringStore } from '@/stores/monitor.js'
const logContainer = ref(null);

const store = useMonitoringStore()
const logs = store.logs;

const activeNode = ref(0); // Default active tab index
const filteredLogs = computed(() => {
  const activeNodeID = store.nodes[activeNode.value]?.id; // Get the ID of the active tab's node
  if (!activeNodeID) {
    return []; // If no active node, return an empty array
  }

  // Filter logs based on the active tab's node ID
  const filtered = logs.filter(log => {
    return log.nodeID === activeNodeID;
  });

  if (logContainer.value) {
    logContainer.value.scrollTop = logContainer.value.scrollHeight;
  }
  return filtered;
});


const changeTab = (index) => {
  store.nodes.forEach((tab, idx) => {
    tab.current = idx === index;
  });
  activeNode.value = index;
};

const formatTimestamp = (timestamp) => {
  const date = new Date(timestamp * 1000); // Convert seconds to milliseconds
  return date.toLocaleTimeString(); // Adjust the formatting based on your preferences
};
</script>
