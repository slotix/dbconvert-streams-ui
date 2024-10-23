<template>
  <div class="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
    <div class="px-4 py-6 sm:px-0">
      <h1 class="text-3xl font-bold text-gray-900 mb-4">Subscription Confirmation</h1>
      <div v-if="isLoading" class="text-center">
        <p class="text-lg text-gray-600">Verifying your subscription...</p>
        <div class="mt-4">
          <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
        </div>
      </div>
      <div v-else-if="subscriptionActive" class="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 mb-4">
        <p class="font-bold">Thank you for your subscription!</p>
        <p>Your subscription is now active. You can start using our premium features.</p>
      </div>
      <div v-else class="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-4">
        <p class="font-bold">Subscription status unclear</p>
        <p>We couldn't confirm your subscription status. Please contact support if you believe this is an error.</p>
      </div>
      <div class="mt-6">
        <router-link to="/"
          class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
          Go to the App Dashboard
        </router-link>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useCommonStore } from '@/stores/common'

const router = useRouter()
const commonStore = useCommonStore()

const isLoading = ref(true)
const subscriptionActive = ref(false)

onMounted(async () => {
  try {
     await commonStore.fetchUsageData()

    // Check if the user has an active subscription
    subscriptionActive.value = !!commonStore.userData?.subscription
    console.log('subscriptionActive', subscriptionActive.value)
    console.log('userData', commonStore.userData)
    if (!subscriptionActive.value) {
      console.warn('Subscription not found or not active')
    }
  } catch (error) {
    console.error('Error checking subscription status:', error)
  } finally {
    isLoading.value = false
  }
})
</script>
