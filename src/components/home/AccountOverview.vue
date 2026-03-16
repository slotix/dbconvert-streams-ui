<template>
  <div class="p-6">
    <h2 class="ui-text-strong mb-6 text-xl font-semibold">Account Overview</h2>
    <div class="space-y-6">
      <div
        v-if="showConnectCta"
        class="ui-border-muted flex flex-col gap-4 rounded-xl border bg-gradient-to-br from-[var(--ui-surface-panel)] to-[var(--ui-surface-raised)] p-5 shadow-sm"
      >
        <div class="flex items-start gap-4">
          <div class="shrink-0">
            <div class="ui-accent-selection-checked rounded-lg p-3">
              <KeyRound class="ui-accent-icon h-6 w-6" :stroke-width="iconStroke" />
            </div>
          </div>
          <div class="flex-1">
            <p class="ui-text-strong text-lg font-semibold">Connect your account</p>
            <p class="ui-text-default mt-1 text-sm">
              Add an API key to unlock stream runs, usage stats, and history. Your local data stays
              on this machine.
            </p>
          </div>
        </div>
        <div class="flex flex-wrap items-center gap-3">
          <button
            type="button"
            class="ui-focus-ring ui-accent-primary inline-flex items-center rounded-md border px-4 py-2 text-sm font-medium shadow-sm"
            @click="promptApiKey"
          >
            Enter API key
          </button>
          <button
            type="button"
            class="ui-focus-ring ui-surface-raised ui-border-default ui-text-default inline-flex items-center rounded-md border px-4 py-2 text-sm font-medium hover:bg-(--ui-surface-muted)"
            @click="openAccountPage"
          >
            Create account
          </button>
        </div>
      </div>

      <!-- User Info -->
      <div v-else class="ui-surface-muted flex items-start rounded-lg p-3">
        <div class="shrink-0">
          <div class="ui-status-info-surface rounded-lg border p-3">
            <User class="ui-status-info-text h-6 w-6" :stroke-width="iconStroke" />
          </div>
        </div>
        <div class="ml-4 flex-1">
          <p class="ui-text-muted text-sm font-medium">Account</p>
          <p class="ui-text-strong mt-1 text-xl font-semibold">
            {{ userData?.name || 'N/A' }}
          </p>
          <p class="ui-text-muted mt-0.5 text-sm">
            {{ userData?.email || 'N/A' }}
          </p>
        </div>
      </div>

      <div
        v-if="!showConnectCta && isCurrentInstallDeactivated"
        class="ui-status-warning-surface flex items-start rounded-lg border p-3"
      >
        <div class="shrink-0 mt-0.5">
          <AlertTriangle class="ui-status-warning-text h-5 w-5" :stroke-width="iconStroke" />
        </div>
        <div class="ml-3 flex-1">
          <p class="ui-status-warning-text text-sm font-medium">This device is deactivated</p>
          <p class="ui-text-default mt-1 text-sm">
            This device was deactivated. Reactivate it from https://streams.dbconvert.com/account
          </p>
          <button
            type="button"
            class="ui-focus-ring ui-link mt-2 inline-flex items-center text-sm font-medium"
            @click="openAccountPage"
          >
            Open account page
            <ExternalLink class="ml-1 h-4 w-4" />
          </button>
        </div>
      </div>

      <!-- Current Plan -->
      <div v-if="!showConnectCta" class="ui-surface-muted flex items-start rounded-lg p-3">
        <div class="shrink-0">
          <div class="ui-accent-selection-checked rounded-lg p-3">
            <CreditCard
              class="h-6 w-6"
              :stroke-width="iconStroke"
              :class="{
                'ui-accent-icon': isPaid,
                'ui-icon-muted': !isPaid
              }"
            />
          </div>
        </div>
        <div class="ml-4 flex-1">
          <div class="flex items-center justify-between">
            <p class="ui-text-muted text-sm font-medium">Subscription</p>
            <span
              v-if="subscriptionStatus === 'paused'"
              class="ui-chip-muted inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium"
            >
              <svg class="w-1 h-1 fill-current" viewBox="0 0 4 4">
                <circle cx="2" cy="2" r="2" />
              </svg>
              Paused
            </span>
            <span
              v-if="subscriptionStatus === 'canceled'"
              class="ui-status-danger-badge inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium"
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
            <p class="ui-text-strong text-xl font-semibold">
              {{ planLabel }}
            </p>
            <p v-if="isPaid" class="ui-text-muted mt-1 text-sm">Billing: {{ billingLabel }}</p>
            <p v-else class="ui-text-muted mt-1 text-sm">Evaluation limits apply</p>
            <button
              type="button"
              class="ui-focus-ring ui-link mt-2 inline-flex items-center text-sm font-medium"
              @click="openPricingPage"
            >
              Manage Subscription
              <ExternalLink class="ml-1 h-4 w-4" />
            </button>
          </div>
          <div v-if="subscriptionStatus === 'paused'" class="mt-2 flex items-start space-x-2">
            <div class="shrink-0 mt-0.5">
              <svg
                class="ui-status-warning-text h-4 w-4"
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
              <p class="ui-status-warning-text text-sm font-medium">Subscription paused</p>
              <button
                type="button"
                class="ui-focus-ring ui-link mt-1 inline-flex items-center text-sm font-medium"
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
                class="ui-status-danger-text h-4 w-4"
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
              <p class="ui-status-danger-text text-sm font-medium">
                Your subscription has been canceled
              </p>
              <button
                type="button"
                class="ui-focus-ring ui-link mt-1 inline-flex items-center text-sm font-medium"
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
        class="ui-surface-muted flex items-start rounded-lg p-3"
      >
        <div class="shrink-0">
          <div class="ui-accent-selection-checked rounded-lg p-3">
            <CircleUser class="ui-accent-icon h-6 w-6" :stroke-width="iconStroke" />
          </div>
        </div>
        <div class="ml-4 flex-1">
          <div class="flex items-center justify-between">
            <p class="ui-text-muted text-sm font-medium">Evaluation Usage</p>
            <span v-if="evaluationEnded" class="ui-status-warning-text text-sm">Completed</span>
          </div>
          <div class="mt-3 space-y-4">
            <div>
              <div class="flex items-baseline justify-between">
                <span class="ui-text-default text-sm">Convert data</span>
                <span class="ui-text-subtle text-xs"
                  >{{ formatDataSize(evalConvertBytes) }} /
                  {{ formatDataSize(evalConvertLimit) }}</span
                >
              </div>
              <div class="ui-surface-inset w-full rounded-full h-2.5 mt-2">
                <div
                  class="h-2.5 rounded-full transition-all duration-300 bg-(--ui-accent-strong-bg)"
                  :style="{ width: `${evalConvertPercent}%` }"
                ></div>
              </div>
            </div>
            <div>
              <div class="flex items-baseline justify-between">
                <span class="ui-text-default text-sm">CDC runtime</span>
                <span class="ui-text-subtle text-xs"
                  >{{ formatDuration(evalCdcSeconds) }} / {{ formatDuration(evalCdcLimit) }}</span
                >
              </div>
              <div class="ui-surface-inset w-full rounded-full h-2.5 mt-2">
                <div
                  class="h-2.5 rounded-full transition-all duration-300 bg-(--ui-accent-strong-bg)"
                  :style="{ width: `${evalCdcPercent}%` }"
                ></div>
              </div>
            </div>
            <p v-if="evaluationEnded" class="ui-status-warning-text text-xs">
              Evaluation completed. Upgrade to continue running streams.
            </p>
          </div>
        </div>
      </div>

      <!-- API Key Management -->
      <div v-if="!showConnectCta" class="ui-surface-muted flex items-start rounded-lg p-3">
        <div class="shrink-0">
          <div class="ui-status-info-surface rounded-lg border p-3">
            <Key class="ui-status-info-text h-6 w-6" :stroke-width="iconStroke" />
          </div>
        </div>
        <div class="ml-4 flex-1">
          <div class="flex items-center justify-between">
            <div>
              <p class="ui-text-muted text-sm font-medium">API Credentials</p>
              <p class="ui-text-muted mt-0.5 text-xs">
                Use API Key and Install ID to authenticate your API requests
              </p>
            </div>
          </div>
          <div class="mt-3 space-y-3">
            <div>
              <p class="ui-text-muted mb-1.5 text-sm font-medium">API Key</p>
              <div class="relative">
                <input
                  type="text"
                  readonly
                  :value="maskedApiKey"
                  class="ui-surface-inset ui-border-default ui-text-strong ui-focus-ring w-full rounded-lg border px-3 py-2 pr-10 text-sm font-mono transition-colors focus:outline-none"
                />
                <button
                  class="ui-focus-ring absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 transition-colors group hover:bg-(--ui-surface-muted)"
                  title="Copy API Key"
                  @click="copyApiKey"
                >
                  <Copy
                    class="ui-icon-default h-4 w-4 group-hover:text-(--ui-text-default)"
                    :stroke-width="iconStroke"
                  />
                </button>
              </div>
            </div>
            <div>
              <p class="ui-text-muted mb-1.5 text-sm font-medium">Install ID</p>
              <div class="relative">
                <input
                  type="text"
                  readonly
                  :value="maskedInstallId"
                  class="ui-surface-inset ui-border-default ui-text-strong ui-focus-ring w-full rounded-lg border px-3 py-2 pr-10 text-sm font-mono transition-colors focus:outline-none"
                />
                <button
                  class="ui-focus-ring absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 transition-colors group hover:bg-(--ui-surface-muted)"
                  title="Copy Install ID"
                  @click="copyInstallId"
                >
                  <Copy
                    class="ui-icon-default h-4 w-4 group-hover:text-(--ui-text-default)"
                    :stroke-width="iconStroke"
                  />
                </button>
              </div>
            </div>
            <div class="flex items-center justify-end gap-3">
              <button
                type="button"
                class="ui-focus-ring ui-link-danger inline-flex items-center text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50"
                :disabled="!hasApiKey || isClearingApiKey"
                @click="confirmClearApiKey"
              >
                Clear API Key
              </button>
              <button
                type="button"
                class="ui-focus-ring ui-link inline-flex items-center text-sm font-medium"
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
import { useSystemDefaults } from '@/composables/useSystemDefaults'
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
const { systemDefaults, loadSystemDefaults } = useSystemDefaults()

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
  if (!commonStore.userData?.evaluation) return 'ui-chip-muted'
  if (evaluationStatus.value === 'ended') return 'ui-chip-muted border'
  if (evaluationStatus.value === 'active') return 'ui-status-success-badge border'
  return 'ui-chip-muted'
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

const installId = computed(() => systemDefaults.value?.installId?.trim() || '')

const maskedInstallId = computed(() => {
  const id = installId.value
  if (!id) return ''
  if (id.length <= 12) return id
  return `${id.slice(0, 8)}${'•'.repeat(Math.max(4, id.length - 12))}${id.slice(-4)}`
})

onMounted(() => {
  void loadSystemDefaults()
  void commonStore.refreshUserDataSilently()
})

async function copyApiKey() {
  const apiKey = commonStore.userData?.apiKey
  if (apiKey) {
    await navigator.clipboard.writeText(apiKey)
    commonStore.showNotification('API key copied to clipboard', 'success')
  }
}

async function copyInstallId() {
  const id = installId.value
  if (id) {
    await navigator.clipboard.writeText(id)
    commonStore.showNotification('Install ID copied to clipboard', 'success')
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
