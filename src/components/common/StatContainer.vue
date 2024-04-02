<template>

  <div>
    <dl
      class="mt-5 grid grid-cols-2 divide-y divide-gray-200 overflow-hidden rounded-lg bg-white shadow md:grid-cols-4 md:divide-x md:divide-y-0">
      <div v-for="stat in store.stats" :key="stat.id" class="px-4 py-5 sm:p-6 ">
        <img :src="step(stat.type)?.img" :alt="step(stat.type)?.title" class="object-scale-down h-8 mr-2" />
        <dt class="pb-5 text-base font-normal text-gray-900 ">
          {{ stat.type }}
          {{ stat.nodeID }}
        </dt>
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

import { computed } from 'vue';

import { useStreamsStore } from '@/stores/streams.js'
import { useMonitoringStore } from '@/stores/monitor.js'

const steps = useStreamsStore().steps
const step = (name) => steps.find(step => step.name === name)

const store = useMonitoringStore()

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