<template>
  <div class="w-full px-4 sm:px-6 lg:px-8 py-8">
    <!-- Wizard Header -->
    <div class="mb-8">
      <nav aria-label="Progress">
        <ol
          role="list"
          class="divide-y divide-gray-200 rounded-md border border-gray-300 bg-white md:flex md:divide-y-0"
        >
          <li v-for="(step, stepIdx) in steps" :key="step.name" class="relative md:flex md:flex-1">
            <!-- Completed Step -->
            <div v-if="stepIdx < currentStepIndex" class="group flex w-full items-center">
              <span class="flex items-center px-6 py-4 text-sm font-medium">
                <span
                  class="flex size-10 shrink-0 items-center justify-center rounded-full bg-teal-600 shadow-sm"
                >
                  <CheckIcon class="size-6 text-white" aria-hidden="true" />
                </span>
                <span class="ml-4 text-sm font-medium text-gray-900">{{ step.title }}</span>
              </span>
            </div>

            <!-- Current Step -->
            <div
              v-else-if="stepIdx === currentStepIndex"
              class="flex items-center px-6 py-4 text-sm font-medium"
              aria-current="step"
            >
              <span
                class="flex size-10 shrink-0 items-center justify-center rounded-full border-2 border-teal-600 bg-teal-50"
              >
                <span class="text-teal-600 font-semibold">{{ stepIdx + 1 }}</span>
              </span>
              <span class="ml-4 text-sm font-semibold text-teal-600">{{ step.title }}</span>
            </div>

            <!-- Upcoming Step -->
            <div v-else class="group flex items-center">
              <span class="flex items-center px-6 py-4 text-sm font-medium">
                <span
                  class="flex size-10 shrink-0 items-center justify-center rounded-full border-2 border-gray-300"
                >
                  <span class="text-gray-400">{{ stepIdx + 1 }}</span>
                </span>
                <span class="ml-4 text-sm font-medium text-gray-400">{{ step.title }}</span>
              </span>
            </div>

            <!-- Arrow separator for md screens and up -->
            <template v-if="stepIdx !== steps.length - 1">
              <div class="absolute top-0 right-0 hidden h-full w-5 md:block" aria-hidden="true">
                <svg
                  class="size-full text-gray-300"
                  viewBox="0 0 22 80"
                  fill="none"
                  preserveAspectRatio="none"
                >
                  <path
                    d="M0 -2L20 40L0 82"
                    vector-effect="non-scaling-stroke"
                    stroke="currentcolor"
                    stroke-linejoin="round"
                  />
                </svg>
              </div>
            </template>
          </li>
        </ol>
      </nav>
    </div>

    <!-- Wizard Content -->
    <div class="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
      <!-- Step Content Slot -->
      <div class="mb-8">
        <slot :currentStep="currentStep" :currentStepIndex="currentStepIndex"></slot>
      </div>

      <!-- Wizard Navigation -->
      <div class="flex justify-between">
        <BaseButton v-if="canGoBack" variant="secondary" @click="goToPreviousStep">
          <ArrowLeftIcon class="w-4 h-4 mr-2" />
          Back
        </BaseButton>
        <div v-else></div>

        <div class="flex space-x-3">
          <BaseButton
            v-if="showTestButton"
            variant="secondary"
            :disabled="isTestingConnection"
            @click="$emit('test')"
          >
            <span v-if="isTestingConnection" class="flex items-center">
              <Spinner size="sm" class="mr-2" />
              Testing...
            </span>
            <span v-else class="flex items-center">
              <BeakerIcon class="w-4 h-4 mr-2" />
              Test Connection
            </span>
          </BaseButton>

          <BaseButton
            variant="primary"
            :disabled="!canProceed || isProcessing"
            @click="handleNextOrFinish"
          >
            <span v-if="isProcessing" class="flex items-center">
              <Spinner size="sm" class="mr-2" />
              {{ isLastStep ? 'Saving...' : 'Processing...' }}
            </span>
            <span v-else class="flex items-center">
              {{
                isLastStep
                  ? isEditMode
                    ? wizardType === 'stream'
                      ? 'Update Stream'
                      : 'Update Connection'
                    : wizardType === 'stream'
                      ? 'Create Stream'
                      : 'Create Connection'
                  : 'Next'
              }}
              <ArrowRightIcon v-if="!isLastStep" class="w-4 h-4 ml-2" />
            </span>
          </BaseButton>

          <BaseButton variant="secondary" @click="$emit('cancel')"> Cancel </BaseButton>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { CheckIcon, ArrowLeftIcon, ArrowRightIcon, BeakerIcon } from '@heroicons/vue/24/outline'
import BaseButton from '@/components/base/BaseButton.vue'
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
  wizardType?: 'connection' | 'stream'
}

const props = withDefaults(defineProps<Props>(), {
  canProceed: true,
  isProcessing: false,
  isTestingConnection: false,
  wizardType: 'connection',
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
