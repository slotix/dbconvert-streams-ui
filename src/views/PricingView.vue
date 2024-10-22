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
            <h2 class="text-2xl font-bold text-gray-800 mb-4">Your Current Plan</h2>
            <div class="bg-gray-50 border border-gray-200 rounded-md p-4">
              <p class="text-gray-700 font-medium mb-2">
                You are currently on the <span class="font-semibold">{{ currentPlan.name }}</span> plan.
              </p>
              <p class="text-gray-600">Monthly data limit: {{ formatDataSize(currentPlan.monthly_limit) }}</p>
              <p class="text-gray-600">Price: {{ formatPrice(currentPlan.price) }}</p>
            </div>
          </div>

          <h2 class="text-2xl font-semibold text-gray-800 mb-6">Choose Your Plan</h2>
          <div v-if="isStripePricingTableLoaded">
            <stripe-pricing-table
              :pricing-table-id="pricingTableId"
              :publishable-key="stripePublishableKey"
              class="w-full"
            ></stripe-pricing-table>
          </div>
          <div v-else class="text-center py-8">
            <p class="text-gray-600">Loading pricing options...</p>
          </div>

          <div class="mt-8 bg-gray-50 border border-gray-200 rounded-md p-4">
            <h3 class="text-lg font-semibold text-gray-800 mb-2">Need Help?</h3>
            <p class="text-gray-600">
              If you have any questions about our pricing or need assistance choosing a plan,
              please don't hesitate to <a href="/contact" class="text-blue-600 hover:underline">contact our support team</a>.
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

const commonStore = useCommonStore()
const stripePublishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY
const pricingTableId = import.meta.env.VITE_STRIPE_PRICING_TABLE_ID

const currentPlan = computed<Subscription | null>(() => commonStore.userData?.subscription || null)

const isStripePricingTableLoaded = ref(false)

onMounted(() => {
  const checkStripeLoaded = setInterval(() => {
    if (window.customElements.get('stripe-pricing-table')) {
      isStripePricingTableLoaded.value = true
      clearInterval(checkStripeLoaded)
      // window.addEventListener('stripe-pricing-table:subscription-created', handleSubscriptionCreated)
    }
  }, 100)
})

// function handleSubscriptionCreated(event: CustomEvent) {
//   console.log('Subscription created:', event.detail)
//   commonStore.setSelectedPlan(event.detail.subscription.id)
// }

function formatDataSize(bytes: number): string {
  const gigabytes = bytes / (1024 * 1024 * 1024)
  return `${gigabytes.toFixed(2)} GB`
}

function formatPrice(price: number): string {
  if (price === 0) return 'Free'
  return `$${price.toFixed(2)} / month`
}
</script>
