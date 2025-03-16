<template>
  <div class="p-6">
    <h2 class="text-xl font-semibold text-gray-900 mb-6">Account Overview</h2>
    <div class="space-y-6">
      <!-- User Info -->
      <div class="flex items-start group hover:bg-gray-50 p-3 rounded-lg transition-colors">
        <div class="flex-shrink-0">
          <div class="bg-indigo-50 rounded-lg p-3 group-hover:bg-indigo-100 transition-colors">
            <UserIcon class="h-6 w-6 text-indigo-600" />
          </div>
        </div>
        <div class="ml-4 flex-1">
          <p class="text-sm font-medium text-gray-500">Account</p>
          <p class="text-xl font-semibold text-gray-900 mt-1">{{ userData?.name || 'N/A' }}</p>
          <p class="text-sm text-gray-500 mt-0.5">{{ userData?.email || 'N/A' }}</p>
        </div>
      </div>

      <!-- Current Plan -->
      <div class="flex items-start group hover:bg-gray-50 p-3 rounded-lg transition-colors">
        <div class="flex-shrink-0">
          <div class="bg-violet-50 rounded-lg p-3 group-hover:bg-violet-100 transition-colors">
            <CreditCardIcon
              class="h-6 w-6"
              :class="{
                'text-violet-600':
                  subscriptionStatus !== 'canceled' && subscriptionStatus !== 'paused',
                'text-gray-400': subscriptionStatus === 'canceled',
                'text-yellow-600': subscriptionStatus === 'paused',
                'text-indigo-600': subscriptionStatus === 'trialing'
              }"
            />
          </div>
        </div>
        <div class="ml-4 flex-1">
          <div class="flex items-center justify-between">
            <p class="text-sm font-medium text-gray-500">Current Subscription</p>
            <span
              v-if="subscriptionStatus === 'paused'"
              class="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-medium bg-orange-100 text-orange-800 rounded-full"
            >
              <svg class="w-1 h-1 fill-current" viewBox="0 0 4 4">
                <circle cx="2" cy="2" r="2" />
              </svg>
              Paused
            </span>
            <span
              v-if="subscriptionStatus === 'canceled'"
              class="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-medium bg-red-100 text-red-800 rounded-full"
            >
              <svg class="w-1 h-1 fill-current" viewBox="0 0 4 4">
                <circle cx="2" cy="2" r="2" />
              </svg>
              Canceled
            </span>
          </div>
          <div class="mt-1">
            <p class="text-xl font-semibold text-gray-900">
              {{ subscriptionStatus === 'trialing' ? 'Trial' : currentPlanName }}
            </p>
            <p
              v-if="subscriptionStatus === 'trialing' && userData?.trialEnd"
              class="text-sm text-gray-500 mt-1"
            >
              Trial ends on {{ formatDate(userData.trialEnd) }}
            </p>
            <a
              href="http://streams.dbconvert.com/pricing"
              target="_blank"
              class="mt-2 inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-500"
            >
              Manage Subscription
              <svg
                class="ml-1 h-4 w-4"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fill-rule="evenodd"
                  d="M5.22 14.78a.75.75 0 001.06 0l7.22-7.22v5.69a.75.75 0 001.5 0v-7.5a.75.75 0 00-.75-.75h-7.5a.75.75 0 000 1.5h5.69l-7.22 7.22a.75.75 0 000 1.06z"
                  clip-rule="evenodd"
                />
              </svg>
            </a>
          </div>
          <div v-if="subscriptionStatus === 'paused'" class="mt-2 flex items-start space-x-2">
            <div class="flex-shrink-0 mt-0.5">
              <svg
                class="h-4 w-4 text-orange-500"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path
                  fill-rule="evenodd"
                  d="M9.401 3.003c1.155-2 4.043-2 5.197 0l7.355 12.748c1.154 2-.29 4.5-2.599 4.5H4.645c-2.309 0-3.752-2.5-2.598-4.5L9.4 3.003zM12 8.25a.75.75 0 01.75.75v3.75a.75.75 0 01-1.5 0V9a.75.75 0 01.75-.75zm0 8.25a.75.75 0 100-1.5.75.75 0 000 1.5z"
                  clip-rule="evenodd"
                />
              </svg>
            </div>
            <div class="flex-1">
              <p class="text-sm text-orange-800 font-medium">
                {{ trialEnded ? 'Trial period ended' : 'Usage limit exceeded' }}
              </p>
              <a
                href="http://streams.dbconvert.com/account"
                target="_blank"
                class="mt-1 inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-500"
              >
                Update subscription
                <svg
                  class="ml-1 h-4 w-4"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fill-rule="evenodd"
                    d="M5.22 14.78a.75.75 0 001.06 0l7.22-7.22v5.69a.75.75 0 001.5 0v-7.5a.75.75 0 00-.75-.75h-7.5a.75.75 0 000 1.5h5.69l-7.22 7.22a.75.75 0 000 1.06z"
                    clip-rule="evenodd"
                  />
                </svg>
              </a>
            </div>
          </div>
          <div v-if="subscriptionStatus === 'canceled'" class="mt-2 flex items-start space-x-2">
            <div class="flex-shrink-0 mt-0.5">
              <svg
                class="h-4 w-4 text-red-500"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path
                  fill-rule="evenodd"
                  d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zm-1.72 6.97a.75.75 0 10-1.06 1.06L10.94 12l-1.72 1.72a.75.75 0 101.06 1.06L12 13.06l1.72 1.72a.75.75 0 101.06-1.06L13.06 12l1.72-1.72a.75.75 0 10-1.06-1.06L12 10.94l-1.72-1.72z"
                  clip-rule="evenodd"
                />
              </svg>
            </div>
            <div class="flex-1">
              <p class="text-sm text-red-800 font-medium">Your subscription has been canceled</p>
              <a
                href="http://streams.dbconvert.com/account"
                target="_blank"
                class="mt-1 inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-500"
              >
                Reactivate subscription
                <svg
                  class="ml-1 h-4 w-4"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fill-rule="evenodd"
                    d="M5.22 14.78a.75.75 0 001.06 0l7.22-7.22v5.69a.75.75 0 001.5 0v-7.5a.75.75 0 00-.75-.75h-7.5a.75.75 0 000 1.5h5.69l-7.22 7.22a.75.75 0 000 1.06z"
                    clip-rule="evenodd"
                  />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </div>

      <!-- Usage Summary -->
      <div class="flex items-start group hover:bg-gray-50 p-3 rounded-lg transition-colors">
        <div class="flex-shrink-0">
          <div class="bg-emerald-50 rounded-lg p-3 group-hover:bg-emerald-100 transition-colors">
            <ChartBarIcon class="h-6 w-6 text-emerald-600" />
          </div>
        </div>
        <div class="ml-4 flex-1">
          <div class="flex items-center justify-between">
            <p class="text-sm font-medium text-gray-500">Current Period Usage</p>
            <span class="text-sm text-gray-500">
              {{ currentPeriodStart ? currentPeriodStart : 'N/A' }} -
              {{ currentPeriodEnd ? currentPeriodEnd : 'N/A' }}
            </span>
          </div>
          <div class="mt-3">
            <div class="flex items-baseline">
              <span class="text-xl font-semibold text-gray-900">{{
                formatDataSize(usedData)
              }}</span>
              <span class="text-sm text-gray-500 ml-1">of {{ formatDataSize(totalData) }}</span>
            </div>
            <!-- Progress bar -->
            <div class="w-full bg-gray-100 rounded-full h-2.5 mt-2">
              <div
                class="h-2.5 rounded-full transition-all duration-300"
                :style="{ width: `${usagePercentage}%` }"
                :class="{
                  'bg-red-500': usagePercentage > 90,
                  'bg-yellow-500': usagePercentage > 75 && usagePercentage <= 90,
                  'bg-emerald-500': usagePercentage <= 75
                }"
              ></div>
            </div>
            <div class="flex items-center justify-between mt-1">
              <p class="text-sm text-gray-500">{{ usagePercentage }}% used</p>
              <p v-if="usagePercentage > 90" class="text-sm text-red-600 font-medium">
                Critical usage
              </p>
              <p v-else-if="usagePercentage > 75" class="text-sm text-yellow-600 font-medium">
                High usage
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- API Key Management -->
      <div class="flex items-start group hover:bg-gray-50 p-3 rounded-lg transition-colors">
        <div class="flex-shrink-0">
          <div class="bg-blue-50 rounded-lg p-3 group-hover:bg-blue-100 transition-colors">
            <KeyIcon class="h-6 w-6 text-blue-600" />
          </div>
        </div>
        <div class="ml-4 flex-1">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm font-medium text-gray-500">API Key</p>
              <p class="text-xs text-gray-500 mt-0.5">
                Use this key to authenticate your API requests
              </p>
            </div>
          </div>
          <div class="mt-3 space-y-3">
            <div class="relative">
              <input
                type="text"
                readonly
                :value="maskedApiKey"
                class="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 pr-10 text-sm font-mono text-gray-900 focus:ring-0 focus:outline-none focus:border-blue-300 transition-colors"
              />
              <button
                class="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md hover:bg-gray-200 transition-colors group"
                title="Copy API Key"
                @click="copyApiKey"
              >
                <DocumentDuplicateIcon class="h-4 w-4 text-gray-500 group-hover:text-gray-700" />
              </button>
            </div>
            <div class="flex justify-end">
              <a
                href="http://streams.dbconvert.com/account"
                target="_blank"
                class="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-500"
              >
                Manage API Key
                <svg
                  class="ml-1 h-4 w-4"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fill-rule="evenodd"
                    d="M5.22 14.78a.75.75 0 001.06 0l7.22-7.22v5.69a.75.75 0 001.5 0v-7.5a.75.75 0 00-.75-.75h-7.5a.75.75 0 000 1.5h5.69l-7.22 7.22a.75.75 0 000 1.06z"
                    clip-rule="evenodd"
                  />
                </svg>
              </a>
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
import {
  CreditCardIcon,
  ChartBarIcon,
  KeyIcon,
  UserIcon,
  DocumentDuplicateIcon
} from '@heroicons/vue/24/outline'
import { formatDate, formatDataSize } from '@/utils/formats'

const commonStore = useCommonStore()

const userData = computed(() => commonStore.userData)

// Add status computation
const subscriptionStatus = computed(() => commonStore.userData?.subscriptionStatus || 'active')
const currentPlanName = computed(() => {
  const name = commonStore.userData?.subscription?.name
  if (subscriptionStatus.value === 'canceled' || subscriptionStatus.value === 'paused') {
    return `${name} `
  }
  return name
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

const trialEnded = computed(() => {
  const trialEnd = commonStore.userData?.trialEnd
  return trialEnd ? Date.now() > trialEnd * 1000 : false
})
</script>
