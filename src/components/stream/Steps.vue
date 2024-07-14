<template>
  <div class="relative">
    <div v-for="step in allSteps" :key="step.id">
      <div v-show="currentStepIndex === step.id">
        <div class="uppercase tracking-wide text-sm font-bold text-gray-500 mb-1 leading-tight">
          Step: {{ currentStepIndex }} of {{ stepsCount }}
        </div>

        <div class="flex items-center md:w-64">
          <div class="w-full bg-gray-200 rounded-full mr-2">
            <div
              class="rounded-full bg-green-500 text-sm leading-none h-3 text-center text-white transition-all duration-300 ease-in-out"
              :style="{ width: stepsBarValue }"></div>
          </div>
          <div class="text-sm w-10 text-gray-600">
            {{ stepsBarValue }}
          </div>
        </div>
        <div class="flex flex-row">
          <img class="mr-3 h-8 w-8" :src="step.img" :alt="step.title" />
          <div class="mt-1 text-xl  text-gray-700 leading-tight">
            {{ step.title }}
          </div>
        </div>
      </div>
    </div>
    <div class="fixed bottom-20 right-4 flex space-x-2 z-50">
      <button type="button" @click="prev" :disabled="currentStepIndex === 1" aria-label="Go to previous step"
        class="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 sm:mt-0 sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed">
        <ChevronLeftIcon class="h-6 w-6" aria-hidden="true" />
        Back
      </button>
      <button type="button" @click="next" :disabled="currentStepIndex === stepsCount" aria-label="Go to next step"
        class="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 sm:mt-0 sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed">
        Next
        <ChevronRightIcon class="h-6 w-6" aria-hidden="true" />
      </button>
      <button type="button" @click="saveStream"
        class="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-gray-600 text-base font-medium text-white hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed"
        :disabled="isSaveDisabled">
        Save
      </button>
    </div>
  </div>
</template>

<script setup>
import { useStreamsStore } from '@/stores/streams'
import { useCommonStore } from '@/stores/common'
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
const router = useRouter()

import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/vue/24/outline'
const currentStream = useStreamsStore().currentStream
const store = useStreamsStore()
const commonStore = useCommonStore()
const allSteps = commonStore.steps
let currentStepIndex = ref(1)
const stepsCount = commonStore.steps.length

const isSaveDisabled = computed(() => {
  return currentStream.source === 0 || currentStream.target === 0
})

const stepsBarValue = computed(() => {
  return parseInt((currentStepIndex.value / stepsCount) * 100) + '%'
})
function next() {
  currentStepIndex.value++
}
function prev() {
  currentStepIndex.value--
}

watch(currentStepIndex, (newVal) => {
  store.currentStep = allSteps[newVal - 1]
})
async function saveStream() {
  try {
    await store.saveStream();
    router.push({ name: 'Streams' });
    commonStore.showNotification('Stream saved', 'success');
  } catch (err) {
    commonStore.showNotification(err.message);
  }
}
onMounted(() => {
  store.currentStep = allSteps[0]
})
</script>
