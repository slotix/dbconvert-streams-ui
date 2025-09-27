<template>
  <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <!-- Wizard Header -->
    <div class="mb-8">
      <nav aria-label="Progress">
        <ol class="flex items-center">
          <li v-for="(step, stepIdx) in steps" :key="step.name" class="relative">
            <!-- Step Icon -->
            <div class="flex items-center">
              <div
                :class="[
                  stepIdx <= currentStepIndex
                    ? 'bg-gray-600 text-white'
                    : 'bg-white text-gray-400 border-2 border-gray-300',
                  'relative w-8 h-8 flex items-center justify-center rounded-full text-sm font-medium'
                ]"
              >
                <CheckIcon v-if="stepIdx < currentStepIndex" class="w-5 h-5" />
                <span v-else>{{ stepIdx + 1 }}</span>
              </div>
              <span
                v-if="stepIdx < steps.length - 1"
                :class="[
                  stepIdx < currentStepIndex ? 'bg-gray-600' : 'bg-gray-300',
                  'absolute top-4 left-4 -ml-px h-0.5 w-20'
                ]"
              />
            </div>
            <!-- Step Label -->
            <div class="ml-4">
              <div
                :class="[
                  stepIdx <= currentStepIndex ? 'text-gray-900 font-medium' : 'text-gray-500',
                  'text-sm'
                ]"
              >
                {{ step.title }}
              </div>
              <div class="text-xs text-gray-500">{{ step.description }}</div>
            </div>
          </li>
        </ol>
      </nav>
    </div>

    <!-- Wizard Content -->
    <div class="bg-white rounded-lg shadow-sm border p-6">
      <div class="mb-6">
        <h2 class="text-xl font-semibold text-gray-900">{{ currentStep?.title }}</h2>
        <p class="text-sm text-gray-600 mt-1">{{ currentStep?.description }}</p>
      </div>

      <!-- Step Content Slot -->
      <div class="mb-8">
        <slot :currentStep="currentStep" :currentStepIndex="currentStepIndex"></slot>
      </div>

      <!-- Wizard Navigation -->
      <div class="flex justify-between">
        <button
          v-if="canGoBack"
          @click="goToPreviousStep"
          type="button"
          class="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
        >
          <ArrowLeftIcon class="w-4 h-4 mr-2" />
          Back
        </button>
        <div v-else></div>

        <div class="flex space-x-3">
          <button
            v-if="showTestButton"
            @click="$emit('test')"
            type="button"
            :disabled="isTestingConnection"
            class="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span v-if="isTestingConnection" class="flex items-center">
              <Spinner size="sm" class="mr-2" />
              Testing...
            </span>
            <span v-else class="flex items-center">
              <BeakerIcon class="w-4 h-4 mr-2" />
              Test Connection
            </span>
          </button>

          <button
            @click="handleNextOrFinish"
            type="button"
            :disabled="!canProceed || isProcessing"
            class="inline-flex items-center px-4 py-2 bg-gray-600 border border-transparent text-sm font-medium rounded-md text-white hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span v-if="isProcessing" class="flex items-center">
              <Spinner size="sm" class="mr-2" />
              {{ isLastStep ? 'Saving...' : 'Processing...' }}
            </span>
            <span v-else class="flex items-center">
              {{ isLastStep ? (isEditMode ? 'Update Connection' : 'Create Connection') : 'Next' }}
              <ArrowRightIcon v-if="!isLastStep" class="w-4 h-4 ml-2" />
            </span>
          </button>

          <button
            @click="$emit('cancel')"
            type="button"
            class="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { CheckIcon, ArrowLeftIcon, ArrowRightIcon, BeakerIcon } from '@heroicons/vue/24/outline'
import Spinner from '@/components/common/Spinner.vue'

interface WizardStep {
  name: string
  title: string
  description: string
}

interface Props {
  steps: WizardStep[]
  currentStepIndex: number
  canProceed?: boolean
  isProcessing?: boolean
  isTestingConnection?: boolean
  isEditMode?: boolean
  showTestButton?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  canProceed: true,
  isProcessing: false,
  isTestingConnection: false,
  isEditMode: false,
  showTestButton: false
})

const emit = defineEmits<{
  'next-step': []
  'previous-step': []
  finish: []
  test: []
  cancel: []
}>()

const currentStep = computed(() => props.steps[props.currentStepIndex])
const canGoBack = computed(() => props.currentStepIndex > 0)
const isLastStep = computed(() => props.currentStepIndex === props.steps.length - 1)

function goToPreviousStep() {
  if (canGoBack.value) {
    emit('previous-step')
  }
}

function handleNextOrFinish() {
  if (isLastStep.value) {
    emit('finish')
  } else {
    emit('next-step')
  }
}
</script>
