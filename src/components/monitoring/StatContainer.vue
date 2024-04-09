<template>


  <div class="relative mt-10 mb-10">
    <div class="absolute inset-0 flex items-center" aria-hidden="true">
      <div class="w-full border-t border-gray-300"></div>
    </div>
    <div class="relative flex justify-center">
      <span class="px-3 text-xl font-semibold leading-6 text-gray-600">Stats of Nodes </span>
    </div>
  </div>
  <div>
    <div
      class="mt-5 grid grid-cols-1 divide-y divide-gray-200 overflow-hidden rounded-lg bg-white shadow md:grid-cols-3 md:divide-x md:divide-y-0">
      <div v-for="stat in store.stats" :key="stat.id" class="">
        <div class="px-4 py-5 sm:p-6 bg-gray-100">
          <div class="flex items-center ">
            <img :src="step(stat.type)?.img" :alt="step(stat.type)?.title" class="object-scale-down h-8 mr-2" />
            <span class="capitalize text-lg font-medium"> {{ outType(stat.type) }} </span>
          </div>
        </div>
        <dl class="px-4 py-5 sm:p-6">
          <div class=" mt-1 mb-3 flex items-baseline justify-between md:block lg:flex  ">
            <dd class="flex items-baseline text-2xl font-semibold text-gray-600" :class="getStatusColor(stat.status)">
              {{ stat.status }}
            </dd>
          </div>
          <div class="flex items-baseline justify-between md:block lg:flex border-b border-gray-100">
            <dd class="mt-1 flex items-baseline text-2xl font-semibold text-gray-600"> {{ stat.events }} </dd>
            <dt class="ml-2 font-medium text-gray-500">
              events
            </dt>
          </div>

          <div v-if="stat.failed" class="flex items-baseline justify-between md:block lg:flex border-b border-gray-100">
            <dd class="mt-1 flex items-baseline text-2xl font-semibold text-red-600"> {{ stat.failed }} </dd>
            <dt class="ml-2 font-medium text-red-500">
              failed
            </dt>
          </div>

          <div class="flex items-baseline justify-between md:block lg:flex border-b border-gray-100">
            <dd class="mt-1 flex items-baseline text-2xl font-semibold text-gray-600"> {{ stat.size }} </dd>
            <dt class="ml-2 font-medium text-gray-500">
              size
            </dt>
          </div>
          <div class="flex items-baseline justify-between md:block lg:flex border-b border-gray-100">
            <dd class="mt-1 flex items-baseline text-2xl font-semibold text-gray-600"> {{ stat.rate || stat['avg.rate']
              }}
            </dd>
            <dt v-if="stat.rate" class="ml-2 font-medium text-gray-500">
              rate
            </dt>
            <dt v-else class="ml-2 font-medium text-gray-500">
              average rate
            </dt>
          </div>
          <div v-if="stat.elapsed"
            class="flex items-baseline justify-between md:block lg:flex border-b border-gray-100">
            <dd class="mt-1 flex items-baseline text-2xl font-semibold text-gray-600"> {{ stat.elapsed }} </dd>
            <dt class="ml-2 font-medium text-gray-500">
              elapsed
            </dt>
          </div>
        </dl>
      </div>
    </div>
  </div>

</template>
<script setup>

import { useCommonStore } from '@/stores/common.js'
import { useMonitoringStore } from '@/stores/monitor.js'

const steps = useCommonStore().steps
const step = (name) => steps.find(step => step.name === name)

const store = useMonitoringStore()
const outType = (type) => {
  switch (type) {
    case 'source':
      return 'Source Reader';
    case 'target':
      return 'Target Writer';
    default:
      return type;
  }
};

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