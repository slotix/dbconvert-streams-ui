<template>
  <div>
    <!-- White background header -->
    <div class="bg-white">
      <div class="max-w-7xl mx-auto py-6 px-8">
        <h1 class="text-3xl font-bold text-gray-900">
          DBConvert Streams Dashboard
        </h1>
      </div>
    </div>

    <!-- Grey background content area -->
    <div class="bg-gray-200 min-h-screen">
      <main class="max-w-7xl mx-auto px-4 py-6">
        <!-- Cards Grid -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <!-- Quick Actions Card -->
          <div class="bg-white shadow rounded-lg overflow-hidden">
            <QuickActions />
          </div>

          <!-- Account Overview Card -->
          <div class="bg-white shadow rounded-lg overflow-hidden">
            <AccountOverview />
          </div>

          <!-- System Status Card -->
          <div class="bg-white shadow rounded-lg overflow-hidden">
            <SystemStatus />
          </div>
        </div>

        <!-- Getting Started Section -->
        <div class="mt-6">
          <StepDisplay :steps="allSteps" />
        </div>
      </main>
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
