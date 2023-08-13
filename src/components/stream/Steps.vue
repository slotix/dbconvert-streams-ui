<template>
  <div class="flex-auto">
    <div v-for="step in allSteps" :key="step.id">
      <div v-show="currentStepNumber === step.id">
        <div class="uppercase tracking-wide text-sm font-bold text-gray-500 mb-1 leading-tight">
          Step: {{ currentStepNumber }} of {{ stepsCount }}
        </div>
        <div class="flex flex-col md:flex-row md:items-center md:justify-between">
          <img class="mr-3 h-10 w-10" :src="step.img" :alt="step.title" />

          <div class="flex-1">
            <div class="text-xl font-bold text-gray-700 leading-tight">
              {{ step.title }}
            </div>
          </div>

          <div class="flex items-center md:w-64">
            <div class="w-full bg-gray-200 rounded-full mr-2">
              <div
                class="rounded-full bg-green-500 text-sm leading-none h-3 text-center text-white"
                :style="{ width: stepsBarValue }"
              ></div>
            </div>
            <div class="text-sm w-10 text-gray-600">
              {{ stepsBarValue }}
            </div>
          </div>
        </div>
      </div>
    </div>
    <!-- <div class="" v-show="currentStepNumber != 'complete'"> -->
      <div class="justify-center px-4 my-6 sm:px-6 sm:flex sm:flex-row">
        <button
          type="button"
          @click="prev"
          class="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-gray-600 text-base font-medium text-white hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 sm:ml-3 sm:w-auto"
          :class="{
            visible: currentStepNumber > 1,
            invisible: currentStepNumber == 1
          }"
        >
          <ChevronLeftIcon class="h-6 w-6 text-white" aria-hidden="true" />
          Back
        </button>
        <button
          type="button"
          @click="next"
          class="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-gray-600 text-base font-medium text-white hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 sm:ml-3 sm:w-auto"
          :class="{
            visible: currentStepNumber < stepsCount,
            invisible: currentStepNumber == stepsCount
          }"
        >
          Next
          <ChevronRightIcon class="h-6 w-6 text-white" aria-hidden="true" />
        </button>
        <button
          type="button"
          @click="currentStepNumber = 'complete'"
          class="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 sm:mt-0 sm:ml-3 sm:w-auto"
        >
          Finish
        </button>
      </div>
    </div>
  <!-- </div> -->
</template>
<script setup>
import { useStreamsStore } from '@/stores/streams.js'
import { ref, computed, onMounted } from 'vue'
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/vue/24/outline'

const store = useStreamsStore()
const allSteps = store.steps
let currentStepNumber = ref(1)
const stepsCount = store.steps.length

const stepsBarValue = computed(() => {
  return parseInt((currentStepNumber.value / stepsCount) * 100) + '%'
})
function next() {
  currentStepNumber.value++
  store.currentStep = allSteps[currentStepNumber.value - 1]
}
function prev() {
  currentStepNumber.value--
  store.currentStep = allSteps[currentStepNumber.value - 1]
}
onMounted(() => {
  store.currentStep = allSteps[0]
})
</script>
