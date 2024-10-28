<template>
  <div class="antialiased bg-gray-100 min-h-screen">
    <header class="bg-white shadow">
      <div class="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <h1 class="text-3xl font-bold text-gray-900">Pricing</h1>
      </div>
    </header>
    <main class="py-12 sm:py-16">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="bg-white rounded-lg shadow-lg p-8 sm:p-12">
          <div v-if="currentPlan" class="mb-8">
            <h2 class="text-2xl font-bold text-gray-900 mb-6">Current Subscription</h2>
            <div class="bg-white rounded-lg border border-gray-200 p-6">
              <!-- Trial badge -->
              <div v-if="showFreePlanBlock"
                class="inline-flex items-center mb-4 px-3 py-1 bg-amber-50 text-amber-800 rounded-full text-sm">
                <ClockIcon class="w-4 h-4 mr-1.5" />
                Trial ends {{ trialEnd ? formatDate(trialEnd) : 'N/A' }}
              </div>

              <!-- Canceled badge -->
              <div v-if="isCanceled"
                class="inline-flex items-center mb-4 px-3 py-1 bg-red-50 text-red-800 rounded-full text-sm">
                <ExclamationCircleIcon class="w-4 h-4 mr-1.5" />
                Subscription Canceled
              </div>

              <!-- Plan name and price -->
              <h3 class="text-2xl font-semibold text-gray-800 mb-2">
                DBConvert {{ currentPlan.name }}
                <span v-if="isCanceled" class="text-gray-500 text-base">(Canceled)</span>
              </h3>

              <div v-if="showFreePlanBlock">
                <div class="flex items-baseline mb-2">
                  <span class="text-4xl font-bold text-gray-900">${{ currentPlan.price }}</span>
                  <span class="text-gray-500 ml-1 text-lg">per month</span>
                </div>
                <p class="text-gray-600 mb-4">5 GB included</p>
                <p v-if="trialEnd" class="text-gray-600 mb-4">
                  After your free trial ends, this subscription will no longer continue until a payment method is added.
                </p>
              </div>
              <div v-else>
                <div class="flex items-baseline mb-2">
                  <span v-if="currentPeriodEnd" class="text-gray-600">
                    {{ isCanceled ? 'Access expires' : 'Your subscription renews' }} on {{ formatDate(currentPeriodEnd) }}
                  </span>
                </div>
                
                <!-- Add warning for canceled subscriptions -->
                <p v-if="isCanceled" class="text-red-600 mb-4">
                  Your subscription has been canceled and will not renew. You'll continue to have access until the end of your current billing period.
                </p>
              </div>
              <!-- Update manage subscription button -->
              <a :href="customerPortalUrl" 
                 target="_blank" 
                 rel="noopener noreferrer"
                 :class="[
                   'inline-block px-4 py-2 rounded-md transition-colors',
                   isCanceled 
                     ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                     : 'bg-gray-600 hover:bg-gray-700 text-white'
                 ]">
                {{ isCanceled ? 'Reactivate Subscription' : 'Manage Subscription' }}
              </a>
            </div>
          </div>

          <h2 class="text-2xl font-semibold text-gray-800 mb-6">Choose Your Plan</h2>
          <div v-if="isStripePricingTableLoaded">
            <stripe-pricing-table :pricing-table-id="pricingTableId" :publishable-key="stripePublishableKey"
              :client-reference-id="stripeCustomerId" class="w-full"></stripe-pricing-table>
          </div>
          <div v-else class="text-center py-8">
            <p class="text-gray-600">Loading pricing options...</p>
          </div>

          <div class="mt-8 bg-gray-50 border border-gray-200 rounded-md p-4">
            <h3 class="text-lg font-semibold text-gray-800 mb-2">Need Help?</h3>
            <p class="text-gray-600">
              If you have any questions about our pricing or need assistance choosing a plan,
              please don't hesitate to <a href="/contact" class="text-blue-600 hover:underline">contact our support
                team</a>.
            </p>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useCommonStore } from '@/stores/common'
import type { Subscription } from '@/types/user'
import { ClockIcon, ExclamationCircleIcon } from '@heroicons/vue/24/solid'

const commonStore = useCommonStore()
const stripePublishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY
const pricingTableId = import.meta.env.VITE_STRIPE_PRICING_TABLE_ID

const currentPlan = computed<Subscription | null>(() => commonStore.userData?.subscription ? { ...commonStore.userData.subscription, name: commonStore.userData.subscription.name.charAt(0).toUpperCase() + commonStore.userData.subscription.name.slice(1) } : null)
const stripeCustomerId = computed<string>(() => commonStore.stripeCustomerId || '')
const trialEnd = computed<number | null>(() => commonStore.trialEnd || null)
const currentPeriodStart = computed<number | null>(() => commonStore.currentPeriodStart || null)
const currentPeriodEnd = computed<number | null>(() => commonStore.currentPeriodEnd || null)
const isStripePricingTableLoaded = ref(false)
const showFreePlanBlock = computed(() => currentPlan.value?.price === 0)

// Add new computed property after other computed properties
const subscriptionStatus = computed(() => commonStore.userData?.subscriptionStatus || null)
const isCanceled = computed(() => subscriptionStatus.value === 'canceled')

onMounted(() => {
  const checkStripeLoaded = setInterval(() => {
    if (window.customElements.get('stripe-pricing-table')) {
      isStripePricingTableLoaded.value = true
      clearInterval(checkStripeLoaded)
    }
  }, 100)
})

function formatDate(date: number): string {
  return new Date(date * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
function formatDataSize(bytes: number): string {
  const gigabytes = bytes / (1024 * 1024 * 1024)
  return `${gigabytes.toFixed(2)} GB`
}

function formatPrice(price: number): string {
  if (price === 0) return 'Free'
  return `$${price.toFixed(2)} / month`
}

const customerPortalUrl = 'https://billing.stripe.com/p/login/test_00g6q63wr6DBcfK4gg'
</script>
