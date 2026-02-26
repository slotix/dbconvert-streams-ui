<template>
  <div class="flex flex-col h-full">
    <!-- Wizard Header -->
    <div class="shrink-0 mb-6">
      <nav aria-label="Progress">
        <ol
          role="list"
          class="divide-y divide-gray-200 dark:divide-gray-800 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm dark:shadow-gray-900/30 md:flex md:divide-y-0"
        >
          <li v-for="(step, stepIdx) in steps" :key="step.name" class="relative md:flex md:flex-1">
            <!-- Completed Step -->
            <div v-if="stepIdx < currentStepIndex" class="group flex w-full items-center">
              <span class="flex items-center px-6 py-4 text-sm font-medium">
                <span
                  class="flex size-10 shrink-0 items-center justify-center rounded-full bg-teal-600 shadow-sm"
                >
                  <Check class="size-6 text-white" aria-hidden="true" />
                </span>
                <span class="ml-4 text-sm font-medium text-gray-900 dark:text-gray-100">{{
                  step.title
                }}</span>
              </span>
            </div>

            <!-- Current Step -->
            <div
              v-else-if="stepIdx === currentStepIndex"
              class="flex items-center px-6 py-4 text-sm font-medium"
              aria-current="step"
            >
              <span
                class="flex size-10 shrink-0 items-center justify-center rounded-full border-2 border-teal-600 dark:border-teal-400 bg-teal-50 dark:bg-teal-900/40"
              >
                <span class="text-teal-600 dark:text-teal-300 font-semibold">
                  {{ stepIdx + 1 }}
                </span>
              </span>
              <span class="ml-4 text-sm font-semibold text-teal-600 dark:text-teal-300">{{
                step.title
              }}</span>
            </div>

            <!-- Upcoming Step -->
            <div v-else class="group flex items-center">
              <span class="flex items-center px-6 py-4 text-sm font-medium">
                <span
                  class="flex size-10 shrink-0 items-center justify-center rounded-full border-2 border-gray-300 dark:border-gray-600"
                >
                  <span class="text-gray-400 dark:text-gray-500">
                    {{ stepIdx + 1 }}
                  </span>
                </span>
                <span class="ml-4 text-sm font-medium text-gray-400 dark:text-gray-500">{{
                  step.title
                }}</span>
              </span>
            </div>

            <!-- Arrow separator for md screens and up -->
            <template v-if="stepIdx !== steps.length - 1">
              <div class="absolute top-0 right-0 hidden h-full w-5 md:block" aria-hidden="true">
                <svg
                  class="size-full text-gray-300 dark:text-gray-700"
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
    <div :class="contentContainerClass">
      <!-- Step Content Slot -->
      <div class="flex-1 mb-6 overflow-y-auto">
        <slot :currentStep="currentStep" :currentStepIndex="currentStepIndex"></slot>
      </div>

      <!-- Wizard Navigation -->
      <div class="flex justify-between shrink-0 items-center gap-4">
        <div class="flex min-w-0 flex-1 items-center gap-3">
          <BaseButton v-if="canGoBack" variant="secondary" @click="goToPreviousStep">
            <ArrowLeft class="w-4 h-4 mr-2" />
            Back
          </BaseButton>
          <slot name="footer-left" :current-step-index="currentStepIndex"></slot>
        </div>

        <div class="flex shrink-0 space-x-3">
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
              <Beaker class="w-4 h-4 mr-2" />
              Test Connection
            </span>
          </BaseButton>

          <!-- Quick Save button - only in edit mode on steps 1-2 -->
          <BaseButton
            v-if="isEditMode && !isLastStep"
            variant="primary"
            :disabled="!canProceed || isProcessing"
            @click="$emit('quick-save')"
          >
            <span v-if="isProcessing" class="flex items-center">
              <Spinner size="sm" class="mr-2" />
              Saving...
            </span>
            <span v-else class="flex items-center"> Save Changes </span>
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
              <ArrowRight v-if="!isLastStep" class="w-4 h-4 ml-2" />
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
import { ArrowLeft, ArrowRight, Beaker, Check } from 'lucide-vue-next'
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
  'quick-save': []
  test: []
  cancel: []
}>()

const currentStep = computed(() => props.steps[props.currentStepIndex])
const canGoBack = computed(() => props.currentStepIndex > 0)
const isLastStep = computed(() => props.currentStepIndex === props.steps.length - 1)
const contentContainerClass = computed(() => {
  if (props.wizardType === 'stream') {
    return 'flex flex-col flex-1 min-h-0'
  }
  return 'bg-white dark:bg-gray-850 rounded-lg p-6 shadow-lg dark:shadow-gray-900/30 flex flex-col flex-1 min-h-0'
})

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
