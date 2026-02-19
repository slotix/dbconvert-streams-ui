<template>
  <div class="p-6">
    <h2 class="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-6">Account Overview</h2>
    <div class="space-y-6">
      <div
        v-if="showConnectCta"
        class="flex flex-col gap-4 rounded-xl border border-gray-200/70 dark:border-gray-700/70 bg-gradient-to-br from-slate-50 to-white dark:from-gray-850 dark:to-gray-900 p-5 shadow-sm"
      >
        <div class="flex items-start gap-4">
          <div class="shrink-0">
            <div class="rounded-lg bg-teal-50 dark:bg-teal-900/30 p-3">
              <KeyRound
                class="h-6 w-6 text-teal-600 dark:text-teal-400"
                :stroke-width="iconStroke"
              />
            </div>
          </div>
          <div class="flex-1">
            <p class="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Connect your account
            </p>
            <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Add an API key to unlock stream runs, usage stats, and history. Your local data stays
              on this machine.
            </p>
          </div>
        </div>
        <div class="flex flex-wrap items-center gap-3">
          <button
            type="button"
            class="inline-flex items-center rounded-md bg-teal-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-teal-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600"
            @click="promptApiKey"
          >
            Enter API key
          </button>
          <button
            type="button"
            class="inline-flex items-center rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-850 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800"
            @click="openAccountPage"
          >
            Create account
          </button>
        </div>
      </div>

      <!-- User Info -->
      <div v-else class="flex items-start p-3 rounded-lg bg-slate-50 dark:bg-gray-800/50">
        <div class="shrink-0">
          <div class="bg-blue-50 dark:bg-blue-900/30 rounded-lg p-3">
            <User class="h-6 w-6 text-blue-600 dark:text-blue-400" :stroke-width="iconStroke" />
          </div>
        </div>
        <div class="ml-4 flex-1">
          <p class="text-sm font-medium text-gray-500 dark:text-gray-400">Account</p>
          <p class="text-xl font-semibold text-gray-900 dark:text-gray-100 mt-1">
            {{ userData?.name || 'N/A' }}
          </p>
          <p class="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {{ userData?.email || 'N/A' }}
          </p>
        </div>
      </div>

      <div
        v-if="!showConnectCta && isCurrentInstallDeactivated"
        class="flex items-start p-3 rounded-lg border border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-900/20"
      >
        <div class="shrink-0 mt-0.5">
          <AlertTriangle
            class="h-5 w-5 text-amber-600 dark:text-amber-300"
            :stroke-width="iconStroke"
          />
        </div>
        <div class="ml-3 flex-1">
          <p class="text-sm font-medium text-amber-800 dark:text-amber-200">
            This device is deactivated
          </p>
          <p class="mt-1 text-sm text-amber-700 dark:text-amber-300">
            This device was deactivated. Reactivate it from https://streams.dbconvert.com/account
          </p>
          <button
            type="button"
            class="mt-2 inline-flex items-center text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300"
            @click="openAccountPage"
          >
            Open account page
            <ExternalLink class="ml-1 h-4 w-4" />
          </button>
        </div>
      </div>

      <!-- Current Plan -->
      <div
        v-if="!showConnectCta"
        class="flex items-start p-3 rounded-lg bg-slate-50 dark:bg-gray-800/50"
      >
        <div class="shrink-0">
          <div class="bg-teal-50 dark:bg-teal-900/30 rounded-lg p-3">
            <CreditCard
              class="h-6 w-6"
              :stroke-width="iconStroke"
              :class="{
                'text-teal-600 dark:text-teal-400': isPaid,
                'text-gray-400 dark:text-gray-500': !isPaid
              }"
            />
          </div>
        </div>
        <div class="ml-4 flex-1">
          <div class="flex items-center justify-between">
            <p class="text-sm font-medium text-gray-500 dark:text-gray-400">Subscription</p>
            <span
              v-if="subscriptionStatus === 'paused'"
              class="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-medium bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-300 rounded-full"
            >
              <svg class="w-1 h-1 fill-current" viewBox="0 0 4 4">
                <circle cx="2" cy="2" r="2" />
              </svg>
              Paused
            </span>
            <span
              v-if="subscriptionStatus === 'canceled'"
              class="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-medium bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-300 rounded-full"
            >
              <svg class="w-1 h-1 fill-current" viewBox="0 0 4 4">
                <circle cx="2" cy="2" r="2" />
              </svg>
              Canceled
            </span>
            <span
              v-if="showEvaluationBadge"
              class="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-medium rounded-full"
              :class="evaluationBadgeClass"
            >
              <svg class="w-1 h-1 fill-current" viewBox="0 0 4 4">
                <circle cx="2" cy="2" r="2" />
              </svg>
              {{ evaluationBadgeText }}
            </span>
          </div>
          <div class="mt-1">
            <p class="text-xl font-semibold text-gray-900 dark:text-gray-100">
              {{ planLabel }}
            </p>
            <p v-if="isPaid" class="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Billing: {{ billingLabel }}
            </p>
            <p v-else class="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Evaluation limits apply
            </p>
            <button
              type="button"
              class="mt-2 inline-flex items-center text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300"
              @click="openPricingPage"
            >
              Manage Subscription
              <ExternalLink class="ml-1 h-4 w-4" />
            </button>
          </div>
          <div v-if="subscriptionStatus === 'paused'" class="mt-2 flex items-start space-x-2">
            <div class="shrink-0 mt-0.5">
              <svg
                class="h-4 w-4 text-orange-500 dark:text-orange-400"
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
              <p class="text-sm text-orange-800 dark:text-orange-300 font-medium">
                Subscription paused
              </p>
              <button
                type="button"
                class="mt-1 inline-flex items-center text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300"
                @click="openAccountPage"
              >
                Update subscription
                <ExternalLink class="ml-1 h-4 w-4" />
              </button>
            </div>
          </div>
          <div v-if="subscriptionStatus === 'canceled'" class="mt-2 flex items-start space-x-2">
            <div class="shrink-0 mt-0.5">
              <svg
                class="h-4 w-4 text-red-500 dark:text-red-300"
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
              <p class="text-sm text-red-800 dark:text-red-300 font-medium">
                Your subscription has been canceled
              </p>
              <button
                type="button"
                class="mt-1 inline-flex items-center text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300"
                @click="openAccountPage"
              >
                Reactivate subscription
                <ExternalLink class="ml-1 h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Evaluation Summary -->
      <div
        v-if="!showConnectCta && !isPaid"
        class="flex items-start p-3 rounded-lg bg-slate-50 dark:bg-gray-800/50"
      >
        <div class="shrink-0">
          <div class="bg-teal-50 dark:bg-teal-900/30 rounded-lg p-3">
            <CircleUser
              class="h-6 w-6 text-teal-600 dark:text-teal-400"
              :stroke-width="iconStroke"
            />
          </div>
        </div>
        <div class="ml-4 flex-1">
          <div class="flex items-center justify-between">
            <p class="text-sm font-medium text-gray-500 dark:text-gray-400">Evaluation Usage</p>
            <span v-if="evaluationEnded" class="text-sm text-amber-600 dark:text-amber-400"
              >Completed</span
            >
          </div>
          <div class="mt-3 space-y-4">
            <div>
              <div class="flex items-baseline justify-between">
                <span class="text-sm text-gray-600 dark:text-gray-400">Convert data</span>
                <span class="text-xs text-gray-500 dark:text-gray-500"
                  >{{ formatDataSize(evalConvertBytes) }} /
                  {{ formatDataSize(evalConvertLimit) }}</span
                >
              </div>
              <div class="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2.5 mt-2">
                <div
                  class="h-2.5 rounded-full bg-teal-500 transition-all duration-300"
                  :style="{ width: `${evalConvertPercent}%` }"
                ></div>
              </div>
            </div>
            <div>
              <div class="flex items-baseline justify-between">
                <span class="text-sm text-gray-600 dark:text-gray-400">CDC runtime</span>
                <span class="text-xs text-gray-500 dark:text-gray-500"
                  >{{ formatDuration(evalCdcSeconds) }} / {{ formatDuration(evalCdcLimit) }}</span
                >
              </div>
              <div class="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2.5 mt-2">
                <div
                  class="h-2.5 rounded-full bg-teal-500 transition-all duration-300"
                  :style="{ width: `${evalCdcPercent}%` }"
                ></div>
              </div>
            </div>
            <p v-if="evaluationEnded" class="text-xs text-amber-600 dark:text-amber-400">
              Evaluation completed. Upgrade to continue running streams.
            </p>
          </div>
        </div>
      </div>

      <!-- API Key Management -->
      <div
        v-if="!showConnectCta"
        class="flex items-start p-3 rounded-lg bg-slate-50 dark:bg-gray-800/50"
      >
        <div class="shrink-0">
          <div class="bg-blue-50 dark:bg-blue-900/30 rounded-lg p-3">
            <Key class="h-6 w-6 text-blue-600 dark:text-blue-400" :stroke-width="iconStroke" />
          </div>
        </div>
        <div class="ml-4 flex-1">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm font-medium text-gray-500 dark:text-gray-400">API Key</p>
              <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
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
                class="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-2 pr-10 text-sm font-mono text-gray-900 dark:text-gray-100 focus:ring-0 focus:outline-none focus:border-blue-300 dark:focus:border-blue-600 transition-colors"
              />
              <button
                class="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors group"
                title="Copy API Key"
                @click="copyApiKey"
              >
                <Copy
                  class="h-4 w-4 text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300"
                  :stroke-width="iconStroke"
                />
              </button>
            </div>
            <div class="flex items-center justify-end gap-3">
              <button
                type="button"
                class="inline-flex items-center text-sm font-medium text-red-600 dark:text-red-300 hover:text-red-500 dark:hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-50"
                :disabled="!hasApiKey || isClearingApiKey"
                @click="confirmClearApiKey"
              >
                Clear API Key
              </button>
              <button
                type="button"
                class="inline-flex items-center text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300"
                @click="openAccountPage"
              >
                Manage API Key
                <ExternalLink class="ml-1 h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useCommonStore } from '@/stores/common'
import { useConfirmDialogStore } from '@/stores/confirmDialog'
import { useLucideIcons } from '@/composables/useLucideIcons'
import {
  AlertTriangle,
  CircleUser,
  Copy,
  CreditCard,
  ExternalLink,
  Key,
  KeyRound,
  User
} from 'lucide-vue-next'
import { formatDataSize } from '@/utils/formats'
import { isWailsContext } from '@/composables/useWailsEvents'

const commonStore = useCommonStore()
const confirmDialog = useConfirmDialogStore()
const isClearingApiKey = ref(false)
const { strokeWidth: iconStroke } = useLucideIcons()

const userData = computed(() => commonStore.userData)
const showConnectCta = computed(() => isWailsContext() && !commonStore.hasValidApiKey)
const isCurrentInstallDeactivated = computed(
  () => commonStore.userData?.currentInstallStatus === 'deactivated'
)

const subscriptionStatus = computed(() => commonStore.userData?.subscriptionStatus || 'inactive')
const isPaid = computed(() => subscriptionStatus.value === 'active')

const planLabel = computed(() => {
  if (isPaid.value && commonStore.userData?.subscription?.name) {
    return commonStore.userData.subscription.name
  }
  if (isPaid.value) {
    return 'Streams'
  }
  return 'Evaluation'
})

const billingLabel = computed(() => {
  const interval = commonStore.userData?.subscription?.interval
  if (!interval) return '—'
  return interval === 'year' ? 'Yearly' : 'Monthly'
})

const evaluationStatus = computed(() => commonStore.userData?.evaluation?.status || 'inactive')
const evaluationEnded = computed(() => evaluationStatus.value === 'ended')
const showEvaluationBadge = computed(() => !isPaid.value && !!commonStore.userData?.evaluation)

const evaluationBadgeText = computed(() => {
  if (evaluationStatus.value === 'ended') return 'Evaluation completed'
  if (evaluationStatus.value === 'active') return 'Evaluation active'
  return 'Evaluation not started'
})

const evaluationBadgeClass = computed(() => {
  if (!commonStore.userData?.evaluation)
    return 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300'
  if (evaluationStatus.value === 'ended')
    return 'bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200'
  if (evaluationStatus.value === 'active')
    return 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-200'
  return 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300'
})

const evalConvertBytes = computed(() => commonStore.userData?.evaluation?.convert_bytes || 0)
const evalConvertLimit = computed(() => commonStore.userData?.evaluation?.convert_limit_bytes || 0)
const evalConvertPercent = computed(() => {
  if (!evalConvertLimit.value) return 0
  return Math.min(Math.round((evalConvertBytes.value / evalConvertLimit.value) * 100), 100)
})

const evalCdcSeconds = computed(() => commonStore.userData?.evaluation?.cdc_seconds || 0)
const evalCdcLimit = computed(() => commonStore.userData?.evaluation?.cdc_limit_seconds || 0)
const evalCdcPercent = computed(() => {
  if (!evalCdcLimit.value) return 0
  return Math.min(Math.round((evalCdcSeconds.value / evalCdcLimit.value) * 100), 100)
})

const maskedApiKey = computed(() => {
  const apiKey = commonStore.userData?.apiKey || commonStore.apiKey || ''
  if (!apiKey) return ''
  const prefix = apiKey.slice(0, 4)
  const suffix = apiKey.slice(-4)
  return `${prefix}${'•'.repeat(20)}${suffix}`
})

const hasApiKey = computed(() => !!(commonStore.userData?.apiKey || commonStore.apiKey))

onMounted(() => {
  void commonStore.refreshUserDataSilently()
})

async function copyApiKey() {
  const apiKey = commonStore.userData?.apiKey
  if (apiKey) {
    await navigator.clipboard.writeText(apiKey)
    commonStore.showNotification('API key copied to clipboard', 'success')
  }
}

async function confirmClearApiKey() {
  if (!hasApiKey.value || isClearingApiKey.value) {
    return
  }

  const confirmed = await confirmDialog.confirm({
    title: 'Clear API key?',
    description:
      'This removes the API key from this device. You will need to enter it again to run streams and view usage.',
    confirmLabel: 'Clear API key',
    cancelLabel: 'Cancel',
    danger: true
  })

  if (!confirmed) return

  isClearingApiKey.value = true
  try {
    await commonStore.clearApiKeyAndReset()
    commonStore.showNotification('API key cleared', 'success')
  } finally {
    isClearingApiKey.value = false
  }
}

function promptApiKey() {
  commonStore.requireApiKey()
}

function openAccountPage() {
  const url = 'https://streams.dbconvert.com/account'
  if (window.runtime?.BrowserOpenURL) {
    window.runtime.BrowserOpenURL(url)
    return
  }
  window.open(url, '_blank', 'noopener,noreferrer')
}

function openPricingPage() {
  const url = 'https://streams.dbconvert.com/pricing'
  if (window.runtime?.BrowserOpenURL) {
    window.runtime.BrowserOpenURL(url)
    return
  }
  window.open(url, '_blank', 'noopener,noreferrer')
}

function formatDuration(seconds: number) {
  if (!seconds) return '0 h'
  if (seconds < 3600) {
    const minutes = Math.max(1, Math.round(seconds / 60))
    return `${minutes} min`
  }
  const hours = seconds / 3600
  return `${hours.toFixed(1)} h`
}
</script>
