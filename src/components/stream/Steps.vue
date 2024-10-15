<template>
  <div class="relative">
    <div v-for="step in allSteps" :key="step.id">
      <div v-show="currentStepIndex === step.id" class="p-4">
        <div class="uppercase tracking-wide text-sm font-bold text-gray-500 mb-1 leading-tight">
          Step: {{ currentStepIndex }} of {{ stepsCount }}
        </div>
        <div class="flex items-center md:w-64">
          <div class="w-full bg-gray-200 rounded-full mr-2 h-4">
            <div
              class="rounded-full bg-green-500 text-sm leading-none h-full text-center text-white transition-all duration-300 ease-in-out"
              :style="{ width: stepsBarValue }"></div>
          </div>
          <div class="text-sm w-10 text-gray-600">
            {{ stepsBarValue }}
          </div>
        </div>
        <div class="flex items-center mt-4">
          <img class="mr-3 h-8 w-8" :src="step.img" :alt="step.title" />
          <div class="text-xl font-bold text-gray-700 leading-tight">
            {{ step.title }}
          </div>
        </div>
      </div>
    </div>
    <div class="mt-4 sm:mt-0 sm:flex-none flex space-x-2 justify-between w-full">
      <div class="flex space-x-2">
        <button type="button" @click="cancelStream"
          class="inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500">
          Cancel
        </button>
        <button type="button" @click="prev" :disabled="currentStepIndex === 1" aria-label="Go to previous step"
          class="inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed">
          <ChevronLeftIcon class="h-5 w-5 mr-1" aria-hidden="true" />
          Back
        </button>
      </div>
      <div class="flex space-x-2">
        <button type="button" @click="next" :disabled="currentStepIndex === stepsCount" aria-label="Go to next step"
          class="inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-gray-600 text-sm font-medium text-white hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed">
          Next
          <ChevronRightIcon class="h-5 w-5 ml-1" aria-hidden="true" />
        </button>
        <button type="button" @click="saveStream"
          class="inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-green-600 text-sm font-medium text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          :disabled="isSaveDisabled">
          Save
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useStreamsStore } from '@/stores/streamConfig'
import { useCommonStore } from '@/stores/common'
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/vue/24/outline'

const router = useRouter()
const store = useStreamsStore()
const commonStore = useCommonStore()

const allSteps = commonStore.steps
const stepsCount = commonStore.steps.length

const currentStepIndex = ref(1)
const currentStreamConfig = store.currentStreamConfig

const isSaveDisabled = computed(() => {
  return currentStreamConfig.source === 0 || currentStreamConfig.target === 0
})

const stepsBarValue = computed(() => {
  return parseInt((currentStepIndex.value / stepsCount) * 100) + '%'
})

function next() {
  if (currentStepIndex.value < stepsCount) {
    currentStepIndex.value++
  }
}

function prev() {
  if (currentStepIndex.value > 1) {
    currentStepIndex.value--
  }
}

watch(currentStepIndex, (newVal) => {
  store.currentStep = allSteps[newVal - 1]
})

async function saveStream() {
  try {
    await store.saveStream()
    router.push({ name: 'Streams' })
    commonStore.showNotification('Stream saved', 'success')
  } catch (err) {
    commonStore.showNotification(err.message)
  }
}

function cancelStream() {
  if (confirm('Are you sure you want to cancel? All unsaved changes will be lost.')) {
    store.resetCurrentStream()
    router.push({ name: 'Streams' })
  }
}

onMounted(() => {
  store.currentStep = allSteps[0]
})
</script>
