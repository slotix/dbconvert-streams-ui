<template>
  <div class="relative">
    <div v-for="step in editSteps" :key="step.id">
      <div v-show="currentStepIndex === step.id" class="p-4">
        <div class="flex items-center space-x-3 mb-4">
          <img class="h-8 w-8" :src="step.img" :alt="step.title" />
          <div class="text-sm font-bold text-gray-700 leading-tight">
            {{ step.title }}
          </div>
        </div>
        <div class="flex items-center w-full mb-2">
          <div class="w-full bg-gray-200 rounded-full mr-2 h-4">
            <div
              class="rounded-full bg-green-500 text-xs leading-none h-full text-center text-white transition-all duration-300 ease-in-out"
              :style="{ width: stepsBarValue }"
            ></div>
          </div>
          <div class="text-xs w-24 text-gray-600 text-right">
            Step {{ currentStepIndex }} of {{ stepsCount }}
          </div>
        </div>
      </div>
    </div>
    <div class="mt-6 flex justify-between w-full">
      <div class="flex space-x-2">
        <button
          type="button"
          class="inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
          @click="cancelStream"
        >
          Cancel
        </button>
        <button
          type="button"
          :disabled="currentStepIndex === 1"
          aria-label="Go to previous step"
          class="inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
          @click="prev"
        >
          <ChevronLeftIcon class="h-5 w-5 mr-1" aria-hidden="true" />
          Back
        </button>
      </div>
      <div class="flex space-x-2">
        <button
          type="button"
          :disabled="currentStepIndex === stepsCount"
          aria-label="Go to next step"
          class="inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-gray-600 text-sm font-medium text-white hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
          @click="next"
        >
          Next
          <ChevronRightIcon class="h-5 w-5 ml-1" aria-hidden="true" />
        </button>
        <button
          type="button"
          class="inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-green-600 text-sm font-medium text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          :disabled="isSaveDisabled"
          @click="saveStream"
        >
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

const editSteps = commonStore.steps.slice(0, 3)
const stepsCount = commonStore.steps.length-1

const currentStepIndex = ref(1)
const currentStreamConfig = store.currentStreamConfig

const isSaveDisabled = computed(() => {
  return currentStreamConfig?.source === '' || currentStreamConfig?.target === ''
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
  store.currentStep = editSteps[newVal - 1]
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
  store.currentStep = editSteps[0]
})
</script>
