<template>
  <div class="antialiased bg-gray-200">
    <div class="flex flex-wrap max-w-7xl mx-auto px-4 overflow-hidden">
      <div class="w-full px-4 overflow-hidden mb-10">
        <div class="relative mt-10 mb-10">
          <div class="absolute inset-0 flex items-center" aria-hidden="true">
            <div class="w-full border-t border-gray-300" />
          </div>
          <div class="relative flex justify-center">
            <span class="bg-white px-3 text-xl font-semibold leading-6 text-gray-900">Logs</span>
          </div>
        </div>
        <div>
          <div class="sm:hidden">
            <label for="tabs" class="sr-only">Select a tab</label>
            <select id="tabs" name="tabs"
              class="block w-full rounded-md border-gray-300 focus:border-gray-500 focus:ring-gray-500">
              <option v-for="tab in tabs" :key="tab.id" :selected="tab.current">{{ tab.type }} - {{ tab.id }}</option>
            </select>
          </div>
          <div class="hidden sm:block">
            <nav class="isolate flex divide-x divide-gray-200 rounded-lg shadow" aria-label="Tabs">
              <a v-for="(tab, tabIdx) in tabs" :key="tab.id"
                :class="[tab.current ? 'text-gray-900' : 'text-gray-500 hover:text-gray-700', tabIdx === 0 ? 'rounded-l-lg' : '', tabIdx === tabs.length - 1 ? 'rounded-r-lg' : '', 'group relative min-w-0 flex-1 overflow-hidden bg-white py-4 px-4 text-center text-sm font-medium hover:bg-gray-50 focus:z-10']"
                :aria-current="tab.current ? 'page' : undefined" @click="changeTab(tabIdx)">
                <div class="flex flex-col items-center"> <!-- Wrap tab content in a flex column -->
                  <span class="text-lg font-medium">{{ tab.type }}</span> <!-- Tab type as title -->
                  <span class="text-xs text-gray-500">{{ tab.id }}</span> <!-- Grayed out tab ID -->
                </div>
                <span aria-hidden="true"
                  :class="[tab.current ? 'bg-gray-500' : 'bg-transparent', 'absolute inset-x-0 bottom-0 h-0.5']" />
              </a>
            </nav>
          </div>
        </div>
        <div class="divide-y divide-gray-200 overflow-hidden rounded-lg bg-white shadow">
          <div class="max-h-96 overflow-y-auto px-4 py-5 sm:p-6" ref="logContainer">
            <div v-for="log in filteredLogs" :key="log.id" :class="[
                'flex',
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
                <InformationCircleIcon class="mr-3 h-5 w-5 text-blue-400 group-hover:text-blue-500"
                  aria-hidden="true" />
              </div>
              <div v-else-if="log.level === 'debug'">
                <BugAntIcon class="mr-3 h-5 w-5 text-gray-400 group-hover:text-gray-500" aria-hidden="true" />
              </div>

              <div v-else-if="log.level === 'error'">
                <ExclamationCircleIcon class="mr-3 h-5 w-5 text-red-400 group-hover:text-red-500" aria-hidden="true" />
              </div>

              <div v-else-if="log.level === 'warn'">
                <ExclamationTriangleIcon class="mr-3 h-5 w-5 text-yellow-400 group-hover:text-yellow-500"
                  aria-hidden="true" />
              </div>
              <span class="text-gray-500 text-sm ml-2 mr-2">
                [{{ formatTimestamp(log.ts) }}]
              </span>
              {{ log.msg }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';

import { connect, AckPolicy, StringCodec } from 'nats.ws';
import { BugAntIcon, InformationCircleIcon, ExclamationCircleIcon, ExclamationTriangleIcon, ArrowUpIcon, ArrowDownIcon } from '@heroicons/vue/20/solid'

import { useMonitoringStore } from '@/stores/monitor.js'
const logContainer = ref(null);

const store = useMonitoringStore()
const logs = store.logs;
const tabs = store.runningStream.nodes;

const activeTab = ref(0); // Default active tab index
const filteredLogs = computed(() => {
  const activeNodeID = tabs[activeTab.value]?.id; // Get the ID of the active tab's node
  if (!activeNodeID) {
    return []; // If no active node, return an empty array
  }

  // Filter logs based on the active tab's node ID
  const filteredLogs = logs.filter(log => {
    return log.nodeID === activeNodeID;
  });

  if (logContainer.value) {
    logContainer.value.scrollTop = logContainer.value.scrollHeight;
  }
  return filteredLogs;
});


const changeTab = (index) => {
  tabs.forEach((tab, idx) => {
    tab.current = idx === index;
  });
  activeTab.value = index;
};

onMounted(() => {
  store.consumeLogsFromNATS();
});
const formatTimestamp = (timestamp) => {
  const date = new Date(timestamp * 1000); // Convert seconds to milliseconds
  return date.toLocaleTimeString(); // Adjust the formatting based on your preferences
};
</script>
