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
            <button
              v-if="stepIdx < currentStepIndex"
              type="button"
              :disabled="!canJumpToStep(stepIdx)"
              :class="[
                'group flex w-full items-center text-left',
                canJumpToStep(stepIdx)
                  ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-850/80'
                  : 'cursor-default'
              ]"
              @click="handleStepClick(stepIdx)"
            >
              <span class="flex items-center px-6 py-4 text-sm font-medium min-w-0">
                <span
                  class="flex size-10 shrink-0 items-center justify-center rounded-full bg-teal-600 shadow-sm"
                >
                  <Check class="size-6 text-white" aria-hidden="true" />
                </span>
                <span class="ml-4 min-w-0">
                  <span class="block text-sm font-medium text-gray-900 dark:text-gray-100">
                    {{ step.title }}
                  </span>
                  <span
                    v-if="stepContext[stepIdx]?.length"
                    class="mt-1 flex flex-wrap items-center gap-1.5"
                  >
                    <span
                      v-for="badge in stepContext[stepIdx]"
                      :key="`completed-${stepIdx}-${badge}`"
                      class="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium border border-teal-200 dark:border-teal-700 text-teal-700 dark:text-teal-300 bg-teal-50/80 dark:bg-teal-900/30"
                    >
                      {{ badge }}
                    </span>
                  </span>
                </span>
              </span>
            </button>

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
              <span class="ml-4 min-w-0">
                <span class="block text-sm font-semibold text-teal-600 dark:text-teal-300">
                  {{ step.title }}
                </span>
                <span
                  v-if="stepContext[stepIdx]?.length"
                  class="mt-1 flex flex-wrap items-center gap-1.5"
                >
                  <span
                    v-for="badge in stepContext[stepIdx]"
                    :key="`current-${stepIdx}-${badge}`"
                    class="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium border border-teal-300 dark:border-teal-600 text-teal-700 dark:text-teal-200 bg-teal-50 dark:bg-teal-900/40"
                  >
                    {{ badge }}
                  </span>
                </span>
              </span>
            </div>

            <!-- Upcoming Step -->
            <button
              v-else-if="canJumpToStep(stepIdx)"
              type="button"
              class="group flex items-center w-full text-left cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-850/80"
              @click="handleStepClick(stepIdx)"
            >
              <span class="flex items-center px-6 py-4 text-sm font-medium min-w-0">
                <span
                  class="flex size-10 shrink-0 items-center justify-center rounded-full border-2 border-gray-300 dark:border-gray-600"
                >
                  <span class="text-gray-400 dark:text-gray-500">
                    {{ stepIdx + 1 }}
                  </span>
                </span>
                <span class="ml-4 min-w-0">
                  <span class="block text-sm font-medium text-gray-400 dark:text-gray-500">
                    {{ step.title }}
                  </span>
                  <span
                    v-if="stepContext[stepIdx]?.length"
                    class="mt-1 flex flex-wrap items-center gap-1.5"
                  >
                    <span
                      v-for="badge in stepContext[stepIdx]"
                      :key="`upcoming-${stepIdx}-${badge}`"
                      class="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/70"
                    >
                      {{ badge }}
                    </span>
                  </span>
                </span>
              </span>
            </button>

            <div v-else class="group flex items-center">
              <span class="flex items-center px-6 py-4 text-sm font-medium min-w-0">
                <span
                  class="flex size-10 shrink-0 items-center justify-center rounded-full border-2 border-gray-300 dark:border-gray-600"
                >
                  <span class="text-gray-400 dark:text-gray-500">
                    {{ stepIdx + 1 }}
                  </span>
                </span>
                <span class="ml-4 min-w-0">
                  <span class="block text-sm font-medium text-gray-400 dark:text-gray-500">
                    {{ step.title }}
                  </span>
                  <span
                    v-if="stepContext[stepIdx]?.length"
                    class="mt-1 flex flex-wrap items-center gap-1.5"
                  >
                    <span
                      v-for="badge in stepContext[stepIdx]"
                      :key="`upcoming-${stepIdx}-${badge}`"
                      class="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/70"
                    >
                      {{ badge }}
                    </span>
                  </span>
                </span>
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
      <div :class="footerContainerClass">
        <div class="flex min-w-0 flex-1 items-center gap-3">
          <BaseButton v-if="canGoBack" variant="secondary" @click="goToPreviousStep">
            <ArrowLeft class="w-4 h-4 mr-2" />
            Back
          </BaseButton>
          <slot name="footer-left" :current-step-index="currentStepIndex"></slot>
        </div>

        <div :class="footerActionsClass">
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

          <template v-if="isStreamEditFinalStep">
            <BaseButton variant="ghost" @click="$emit('cancel')"> Cancel </BaseButton>
            <div class="flex flex-col items-start">
              <BaseButton
                variant="primary"
                :disabled="!canProceed || isProcessing"
                @click="handleNextOrFinish"
              >
                <span v-if="isProcessing" class="flex items-center">
                  <Spinner size="sm" class="mr-2" />
                  Saving...
                </span>
                <span v-else class="flex items-center"> Update Stream </span>
              </BaseButton>
              <p
                v-if="showStreamRestartHint"
                class="mt-1 text-[11px] text-gray-500 dark:text-gray-400 whitespace-nowrap"
              >
                Stream will restart if running
              </p>
            </div>
          </template>

          <template v-else>
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
                {{ primaryActionLabel }}
                <ArrowRight v-if="!isLastStep" class="w-4 h-4 ml-2" />
              </span>
            </BaseButton>

            <BaseButton variant="secondary" @click="$emit('cancel')"> Cancel </BaseButton>
          </template>
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
  stepContext?: Record<number, string[]>
  allowStepJump?: boolean
  maxStepJumpIndex?: number
  canProceed?: boolean
  isProcessing?: boolean
  isTestingConnection?: boolean
  isEditMode?: boolean
  showTestButton?: boolean
  showStreamRestartHint?: boolean
  wizardType?: 'connection' | 'stream'
}

const props = withDefaults(defineProps<Props>(), {
  stepContext: () => ({}),
  allowStepJump: false,
  maxStepJumpIndex: -1,
  canProceed: true,
  isProcessing: false,
  isTestingConnection: false,
  wizardType: 'connection',
  isEditMode: false,
  showTestButton: false,
  showStreamRestartHint: false
})

const emit = defineEmits<{
  'next-step': []
  'previous-step': []
  'go-to-step': [stepIndex: number]
  finish: []
  'quick-save': []
  test: []
  cancel: []
}>()

const currentStep = computed(() => props.steps[props.currentStepIndex])
const canGoBack = computed(() => props.currentStepIndex > 0)
const isLastStep = computed(() => props.currentStepIndex === props.steps.length - 1)
const isStreamEditFinalStep = computed(
  () => props.wizardType === 'stream' && isLastStep.value && props.isEditMode
)
const primaryActionLabel = computed(() => {
  if (!isLastStep.value) {
    return 'Next'
  }
  if (props.isEditMode) {
    return props.wizardType === 'stream' ? 'Update Stream' : 'Update Connection'
  }
  return props.wizardType === 'stream' ? 'Create Stream' : 'Create Connection'
})
const contentContainerClass = computed(() => {
  if (props.wizardType === 'stream') {
    return 'flex flex-col flex-1 min-h-0'
  }
  return 'bg-white dark:bg-gray-850 rounded-lg p-6 shadow-lg dark:shadow-gray-900/30 flex flex-col flex-1 min-h-0'
})

const footerContainerClass = computed(() => {
  const base = 'flex justify-between shrink-0 items-center gap-4'
  if (props.wizardType === 'stream') {
    return `${base} pr-20`
  }
  return base
})

const footerActionsClass = computed(() => {
  const base = 'flex shrink-0 items-center space-x-3'
  if (props.wizardType === 'stream') {
    return `${base} min-w-0`
  }
  return base
})

function canJumpToStep(stepIndex: number): boolean {
  if (!props.allowStepJump || props.isProcessing || stepIndex === props.currentStepIndex) {
    return false
  }

  const maxStep =
    props.maxStepJumpIndex >= 0 ? props.maxStepJumpIndex : Math.max(0, props.currentStepIndex - 1)
  return stepIndex <= maxStep
}

function handleStepClick(stepIndex: number) {
  if (!canJumpToStep(stepIndex)) {
    return
  }
  emit('go-to-step', stepIndex)
}

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
