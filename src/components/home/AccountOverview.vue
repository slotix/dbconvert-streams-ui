<template>
  <div class="bg-white shadow rounded-lg p-6 h-full">
    <h2 class="text-xl font-semibold text-gray-900 mb-6">Account Overview</h2>
    <div class="space-y-6">
      <!-- Current Plan -->
      <div class="flex items-center">
        <div class="flex-shrink-0">
          <div class="bg-blue-50 rounded-md p-3">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
        </div>
        <div class="ml-4">
          <p class="text-sm font-medium text-gray-500">Current Subscription</p>
          <p class="text-lg font-semibold text-gray-900 capitalize">{{ currentPlanName }}</p>
        </div>
      </div>

      <!-- Usage Summary -->
      <div class="flex items-center">
        <div class="flex-shrink-0">
          <div class="bg-green-50 rounded-md p-3">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
        </div>
        <div class="ml-4 flex-grow">
          <p class="text-sm font-medium text-gray-500">Usage this month</p>
          <div class="mt-1">
            <div class="flex items-center">
              <span class="text-lg font-semibold text-gray-900">{{ formatDataSize(usedData) }}</span>
              <span class="text-sm text-gray-500 ml-1">of {{ formatDataSize(totalData) }}</span>
            </div>
            <!-- Progress bar -->
            <div class="w-full bg-gray-200 rounded-full h-2.5 mt-2">
              <div
                class="bg-blue-600 h-2.5 rounded-full"
                :style="{ width: `${usagePercentage}%` }"
                :class="{
                  'bg-red-600': usagePercentage > 90,
                  'bg-yellow-600': usagePercentage > 75 && usagePercentage <= 90,
                  'bg-blue-600': usagePercentage <= 75
                }"
              ></div>
            </div>
            <p class="text-sm text-gray-500 mt-1">{{ usagePercentage }}% used</p>
          </div>
        </div>
      </div>

      <!-- API Key Management -->
      <div class="flex items-center">
        <div class="flex-shrink-0">
          <div class="bg-purple-50 rounded-md p-3">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
          </div>
        </div>
        <div class="ml-4">
          <button
            @click="manageApiKey"
            class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-gray-600 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
          >
            Manage API Key
            <svg xmlns="http://www.w3.org/2000/svg" class="ml-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useCommonStore } from '@/stores/common'
import { useRouter } from 'vue-router'

const commonStore = useCommonStore()
const router = useRouter()

const currentPlanName = computed(() => commonStore.userData?.subscription?.name || 'Free')

// Extract usage data
const usedData = computed(() => commonStore.currentMonthUsage?.data_volume || 0)
const totalData = computed(() => commonStore.monthlyLimit || 0)

// Calculate usage percentage
const usagePercentage = computed(() => {
  if (totalData.value === 0) return 0
  return Math.round((usedData.value / totalData.value) * 100)
})

function formatDataSize(bytes: number): string {
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  if (bytes === 0) return '0 B'
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`
}

function manageApiKey() {
  router.push({ name: 'User' })
}
</script>

