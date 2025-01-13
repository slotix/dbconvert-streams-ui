<template>
  <div class="p-6">
    <h2 class="text-xl font-semibold text-gray-900 mb-6">Account Overview</h2>
    <div class="space-y-6">
      <!-- User Info -->
      <div class="flex items-center group hover:bg-gray-50 p-3 rounded-lg transition-colors">
        <div class="flex-shrink-0">
          <div class="bg-indigo-50 rounded-lg p-3 group-hover:bg-indigo-100 transition-colors">
            <UserIcon class="h-6 w-6 text-indigo-600" />
          </div>
        </div>
        <div class="ml-4">
          <p class="text-sm font-medium text-gray-500">Account</p>
          <p class="text-lg font-semibold text-gray-900">{{ userData?.name || 'N/A' }}</p>
          <p class="text-sm text-gray-500">{{ userData?.email || 'N/A' }}</p>
        </div>
      </div>

      <!-- Current Plan -->
      <div class="flex items-center group hover:bg-gray-50 p-3 rounded-lg transition-colors">
        <div class="flex-shrink-0">
          <div class="bg-violet-50 rounded-lg p-3 group-hover:bg-violet-100 transition-colors">
            <CreditCardIcon
              class="h-6 w-6"
              :class="{
                'text-violet-600': subscriptionStatus !== 'canceled',
                'text-gray-400': subscriptionStatus === 'canceled'
              }"
            />
          </div>
        </div>
        <div class="ml-4">
          <p class="text-sm font-medium text-gray-500">Current Subscription</p>
          <div class="flex items-center gap-2">
            <p class="text-lg font-semibold text-gray-900 capitalize">{{ currentPlanName }}</p>
            <span
              v-if="subscriptionStatus === 'canceled'"
              class="px-2 py-0.5 text-xs font-medium bg-red-100 text-red-800 rounded-full"
            >
              Canceled
            </span>
          </div>
        </div>
      </div>

      <!-- Usage Summary -->
      <div class="group hover:bg-gray-50 p-3 rounded-lg transition-colors">
        <div class="flex items-center">
          <div class="flex-shrink-0">
            <div class="bg-emerald-50 rounded-lg p-3 group-hover:bg-emerald-100 transition-colors">
              <ChartBarIcon class="h-6 w-6 text-emerald-600" />
            </div>
          </div>
          <div class="ml-4 flex-grow">
            <p class="text-sm font-medium text-gray-500">Current Period Usage</p>
            <p class="text-sm text-gray-500">
              ({{ currentPeriodStart ? currentPeriodStart : 'N/A' }} -
              {{ currentPeriodEnd ? currentPeriodEnd : 'N/A' }})
            </p>
            <div class="mt-1">
              <div class="flex items-center">
                <span class="text-lg font-semibold text-gray-900">{{
                  formatDataSize(usedData)
                }}</span>
                <span class="text-sm text-gray-500 ml-1">of {{ formatDataSize(totalData) }}</span>
              </div>
              <!-- Progress bar -->
              <div class="w-full bg-gray-200 rounded-full h-2 mt-2">
                <div
                  class="h-2 rounded-full"
                  :style="{ width: `${usagePercentage}%` }"
                  :class="{
                    'bg-red-600': usagePercentage > 90,
                    'bg-yellow-600': usagePercentage > 75 && usagePercentage <= 90,
                    'bg-green-600': usagePercentage <= 75
                  }"
                ></div>
              </div>
              <p class="text-sm text-gray-500 mt-1">{{ usagePercentage }}% used</p>
            </div>
          </div>
        </div>
      </div>

      <!-- API Key Management -->
      <div class="group hover:bg-gray-50 p-3 rounded-lg transition-colors">
        <div class="flex items-center">
          <div class="flex-shrink-0">
            <div class="bg-blue-50 rounded-lg p-3 group-hover:bg-blue-100 transition-colors">
              <KeyIcon class="h-6 w-6 text-blue-600" />
            </div>
          </div>
          <div class="ml-4 flex-grow">
            <div class="flex items-center justify-between">
              <div>
                <h3 class="text-sm font-medium text-gray-500">API Key</h3>
                <p class="text-xs text-gray-500">Use this key to authenticate your API requests</p>
              </div>
            </div>
            <div class="mt-2 space-y-2">
              <div class="relative">
                <input
                  type="text"
                  readonly
                  :value="maskedApiKey"
                  class="w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2 pr-10 text-sm font-mono text-gray-900 focus:ring-0 focus:outline-none"
                />
                <button
                  @click="copyApiKey"
                  class="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md hover:bg-gray-200 transition-colors group"
                  title="Copy API Key"
                >
                  <DocumentDuplicateIcon class="h-4 w-4 text-gray-500 group-hover:text-gray-700" />
                </button>
              </div>
              <div class="flex justify-end">
                <a
                  href="http://localhost:3000/account"
                  target="_blank"
                  class="text-sm text-blue-600 hover:text-blue-500 flex items-center gap-1"
                >
                  Manage API Key
                  <ArrowTopRightOnSquareIcon class="h-4 w-4" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useCommonStore } from '@/stores/common'
import { useRouter } from 'vue-router'
import {
  CreditCardIcon,
  ChartBarIcon,
  KeyIcon,
  UserIcon,
  DocumentDuplicateIcon,
  ArrowTopRightOnSquareIcon
} from '@heroicons/vue/24/outline'
import { formatDate, formatDataSize } from '@/utils/formats'

const commonStore = useCommonStore()
const router = useRouter()

const userData = computed(() => commonStore.userData)

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

const maskedApiKey = computed(() => {
  const apiKey = commonStore.userData?.apiKey || ''
  if (!apiKey) return ''
  const prefix = apiKey.slice(0, 4)
  const suffix = apiKey.slice(-4)
  return `${prefix}${'•'.repeat(20)}${suffix}`
})

async function copyApiKey() {
  const apiKey = commonStore.userData?.apiKey
  if (apiKey) {
    await navigator.clipboard.writeText(apiKey)
    commonStore.showNotification('API key copied to clipboard', 'success')
  }
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
