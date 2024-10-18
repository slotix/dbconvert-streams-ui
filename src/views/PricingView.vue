<template>
  <div class="antialiased bg-gray-200 min-h-screen">
    <header class="bg-white shadow">
      <div class="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <h1 class="text-3xl font-bold text-gray-900">Choose Your Plan</h1>
      </div>
    </header>
    <main class="py-12 sm:py-16">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="bg-white rounded-lg shadow-lg p-8 sm:p-12">
          <stripe-pricing-table
            :pricing-table-id="pricingTableId"
            :publishable-key="stripePublishableKey"
            class="w-full"
            @subscriptionCompleted="handleSubscriptionCompleted"
          />
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { useCommonStore } from '@/stores/common'

const commonStore = useCommonStore()
const stripePublishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY
const pricingTableId = import.meta.env.VITE_STRIPE_PRICING_TABLE_ID

function handleSubscriptionCompleted(event: any) {
  console.log('Subscription completed:', event)
  commonStore.setSelectedPlan(event.subscription.id)
}
</script>
