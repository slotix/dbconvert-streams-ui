<!-- src/components/home/StepDisplay.vue -->
<template>
  <div class="bg-white p-6">
    <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
      <div v-for="(step, index) in homeSteps" :key="step.id" class="relative">
        <!-- Step Container -->
        <div class="flex items-start gap-6">
          <!-- Step Number -->
          <div class="hidden md:flex flex-shrink-0 mt-4">
            <div
              class="w-10 h-10 flex items-center justify-center bg-gray-50 rounded-full border border-gray-200"
            >
              <span class="text-lg font-bold text-gray-700">{{ index + 1 }}</span>
            </div>
          </div>

          <!-- Step Image -->
          <div class="hidden md:block flex-shrink-0">
            <img
              :src="step.img"
              :alt="step.title"
              class="w-16 h-16 object-contain rounded-lg"
              loading="lazy"
            />
          </div>

          <!-- Step Content -->
          <div class="flex-auto">
            <!-- Mobile Step Number -->
            <div class="md:hidden text-sm font-medium text-gray-500 mb-2">Step {{ index + 1 }}</div>

            <!-- Title and Description -->
            <h3 class="text-lg font-semibold text-gray-800 mb-2">
              {{ step.title }}
            </h3>
            <p class="text-sm text-gray-600">
              {{ step.description }}
            </p>

            <!-- Mobile Image -->
            <div class="md:hidden mt-4">
              <img
                :src="step.img"
                :alt="step.title"
                class="w-16 h-16 object-contain rounded-lg"
                loading="lazy"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
    <!-- Documentation Link -->
    <div class="mt-8 text-center">
      <a
        href="https://docs.dbconvert.com"
        target="_blank"
        rel="noopener noreferrer"
        class="inline-flex items-center text-blue-600 hover:text-blue-800"
      >
        <span class="text-base">View Documentation</span>
        <svg class="w-5 h-5 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
          />
        </svg>
      </a>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useCommonStore } from '@/stores/common'
import { storeToRefs } from 'pinia'

const commonStore = useCommonStore()
const { homeSteps } = storeToRefs(commonStore)
</script>
