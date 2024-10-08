<template>
  <div class="flex items-center justify-center min-h-screen bg-gray-100 p-4">
    <div class="w-full max-w-4xl bg-white rounded-lg shadow-md p-6">
      <h1 class="text-2xl font-semibold mb-6 text-center">Choose Your Plan</h1>
      <stripe-pricing-table
        :pricing-table-id="pricingTableId"
        :publishable-key="stripePublishableKey"
        @subscriptionCompleted="handleSubscriptionCompleted"
        class="mx-auto w-full"
      >
      </stripe-pricing-table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useCommonStore } from '@/stores/common'

const commonStore = useCommonStore()
const stripePublishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY
const pricingTableId = import.meta.env.VITE_STRIPE_PRICING_TABLE_ID

const handleSubscriptionCompleted = (event: any) => {
  console.log('Subscription completed:', event)
  commonStore.setSelectedPlan(event.subscription.id)
}
</script>