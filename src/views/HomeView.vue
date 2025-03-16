<template>
  <div>
    <!-- White background header -->
    <div class="bg-white border-b border-gray-200">
      <div class="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div class="flex items-center justify-between">
          <div>
            <h1 class="text-2xl font-bold text-gray-900 sm:text-3xl">
              DBConvert Streams Dashboard
            </h1>
          </div>
        </div>
      </div>
    </div>

    <!-- Grey background content area -->
    <div class="min-h-screen bg-gray-50">
      <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <!-- Cards Grid -->
        <div class="py-6">
          <div class="grid grid-cols-1 gap-6 lg:grid-cols-2 mb-6">
            <!-- Account Overview Card -->
            <div
              class="bg-white overflow-hidden rounded-xl shadow-sm border border-gray-100 hover:border-gray-200 transition-all duration-200"
            >
              <AccountOverview />
            </div>

            <!-- System Status Card -->
            <div
              class="bg-white overflow-hidden rounded-xl shadow-sm border border-gray-100 hover:border-gray-200 transition-all duration-200"
            >
              <SystemStatus />
            </div>
          </div>

          <!-- Quick Actions Card -->
          <div
            class="bg-white overflow-hidden rounded-xl shadow-sm border border-gray-100 hover:border-gray-200 transition-all duration-200"
          >
            <QuickActions />
          </div>
        </div>

        <!-- Getting Started Section -->
        <div class="pb-6">
          <div class="bg-white rounded-xl shadow-sm border border-gray-100">
            <div class="p-6">
              <h2 class="text-xl font-semibold text-gray-900 flex items-center gap-2">
                Getting Started
              </h2>
              <StepDisplay :steps="allSteps" />
            </div>
          </div>
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
