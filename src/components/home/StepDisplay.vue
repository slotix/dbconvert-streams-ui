<!-- src/components/home/StepDisplay.vue -->
<template>
  <div class="bg-white shadow rounded-lg p-6">
    <h2 class="text-xl font-semibold text-gray-900 mb-6">Getting Started</h2>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
      <div v-for="(step, index) in steps" :key="step.id" class="relative">
        <!-- Step Container -->
        <div class="flex items-start gap-6">
          <!-- Step Number -->
          <div class="hidden md:flex flex-shrink-0 mt-4">
            <div class="w-10 h-10 flex items-center justify-center bg-gray-50 rounded-full border border-gray-200">
              <span class="text-lg font-bold text-gray-700 ">{{ index + 1 }}</span>
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
            <div class="md:hidden text-sm font-medium text-gray-500 mb-2">
              Step {{ index + 1 }}
            </div>
            
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
  </div>
</template>

<script setup lang="ts">
import { defineProps } from 'vue'
import type { Step } from '@/stores/common'

interface Props {
  steps: Step[]
}

const props = defineProps<Props>()
</script>

