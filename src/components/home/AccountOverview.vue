<template>
  <div class="bg-white shadow rounded-lg p-6 h-full">
    <h2 class="text-xl font-semibold text-gray-900 mb-6">Account Overview</h2>
    <div class="space-y-6">
      <!-- Current Plan -->
      <div class="flex items-center">
        <div class="flex-shrink-0">
          <div class="bg-gray-50 rounded-md p-4">
            <CreditCardIcon class="h-8 w-8" :class="{
              'text-violet-600': subscriptionStatus !== 'canceled',
              'text-gray-400': subscriptionStatus === 'canceled'
            }" />
          </div>
        </div>
        <div class="ml-4">
          <p class="text-sm font-medium text-gray-500">Current Subscription</p>
          <div class="flex items-center gap-2">
            <p class="text-lg font-semibold text-gray-900 capitalize">{{ currentPlanName }}</p>
            <span v-if="subscriptionStatus === 'canceled'"
              class="px-2 py-0.5 text-xs font-medium bg-red-100 text-red-800 rounded-full">
              Canceled
            </span>
          </div>
        </div>
      </div>

      <!-- Usage Summary -->
      <div class="flex items-center">
        <div class="flex-shrink-0">
          <div class="bg-gray-50 rounded-md p-4">
            <ChartBarIcon class="h-8 w-8 text-emerald-600" />
          </div>
        </div>
        <div class="ml-4 flex-grow">
          <p class="text-sm font-medium text-gray-500">Current Period Usage </p>
          <p class="text-sm text-gray-500">({{ currentPeriodStart ? currentPeriodStart : 'N/A' }} - {{ currentPeriodEnd
            ? currentPeriodEnd : 'N/A' }})</p>
          <div class="mt-1">
            <div class="flex items-center">
              <span class="text-lg font-semibold text-gray-900">{{ formatDataSize(usedData) }}</span>
              <span class="text-sm text-gray-500 ml-1">of {{ formatDataSize(totalData) }}</span>
            </div>
            <!-- Progress bar -->
            <div class="w-full bg-gray-200 rounded-full h-2.5 mt-2">
              <div class="bg-blue-600 h-2.5 rounded-full" :style="{ width: `${usagePercentage}%` }" :class="{
                'bg-red-600': usagePercentage > 90,
                'bg-yellow-600': usagePercentage > 75 && usagePercentage <= 90,
                'bg-blue-600': usagePercentage <= 75
              }"></div>
            </div>
            <p class="text-sm text-gray-500 mt-1">{{ usagePercentage }}% used</p>
          </div>
        </div>
      </div>

      <!-- API Key Management -->
      <div class="flex items-center">
        <div class="flex-shrink-0">
          <div class="bg-gray-50 rounded-md p-4">
            <KeyIcon class="h-8 w-8 text-blue-600" />
          </div>
        </div>
        <div class="ml-4">
          <button @click="manageApiKey"
            class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-gray-600 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500">
            Manage API Key
            <ChevronRightIcon class="ml-2 h-4 w-4" />
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
import { CreditCardIcon, ChartBarIcon, KeyIcon, ChevronRightIcon } from '@heroicons/vue/24/outline'
import { formatDate, formatDataSize } from '@/utils/formats'
const commonStore = useCommonStore()
const router = useRouter()

// Add status computation
const subscriptionStatus = computed(() => commonStore.userData?.subscriptionStatus || 'active')
const currentPlanName = computed(() => {
  const name = commonStore.userData?.subscription?.name || 'Free'
  return subscriptionStatus.value === 'canceled' ? `${name} ` : name
})

// Extract usage data
const usedData = computed(() => commonStore.userData?.subscriptionPeriodUsage?.data_volume || 0)
const totalData = computed(() => commonStore.userData?.subscription?.monthly_limit || 0)

// Calculate usage percentage
const usagePercentage = computed(() => {
  if (totalData.value === 0) return 0
  return Math.round((usedData.value / totalData.value) * 100)
})

function manageApiKey() {
  router.push({ name: 'User' })
}

// Add period information
const currentPeriodStart = computed(() => {
  const date = commonStore.userData?.subscriptionPeriodUsage?.period_start
  return date ? formatDate(date) : null
})

const currentPeriodEnd = computed(() => {
  const date = commonStore.userData?.subscriptionPeriodUsage?.period_end
  return date ? formatDate(date) : null
})
</script>
