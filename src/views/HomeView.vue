<template>
  <div class="min-h-screen bg-gray-50 py-8">
    <!-- Page Title -->
    <div class="max-w-7xl mx-auto px-4 mb-8">
      <h1 class="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
        DBConvert Streams Dashboard
      </h1>
    </div>

    <!-- Actions, Overview, and Status Section -->
    <div class="max-w-7xl mx-auto px-4 grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
      <!-- Quick Actions -->
      <div class="lg:col-span-1">
        <QuickActions />
      </div>

      <!-- Account Overview -->
      <div class="lg:col-span-1">
        <AccountOverview />
      </div>

      <!-- System Status -->
      <div class="lg:col-span-1">
        <SystemStatus />
      </div>
    </div>

    <!-- Steps Section -->
    <div class="max-w-7xl mx-auto px-4">
      <StepDisplay :steps="allSteps" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useCommonStore } from '@/stores/common'
import StepDisplay from '@/components/home/StepDisplay.vue'
import QuickActions from '@/components/home/QuickActions.vue'
import AccountOverview from '@/components/home/AccountOverview.vue'
import SystemStatus from '@/components/home/SystemStatus.vue'

const commonStore = useCommonStore()
const allSteps = computed(() => commonStore.steps)
</script>
