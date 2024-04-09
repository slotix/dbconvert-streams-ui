<template>
  <div v-show="show" :class="getNotificationClass(notification().type)"
    class="flex items-center gap-x-6 bg-gray-900 px-6 py-2.5 sm:px-3.5 sm:before:flex-1">
    <!-- Conditionally render the ExclamationCircleIcon for error type -->

    <div v-if="notification().type === 'error'">
      <ExclamationCircleIcon class="h-6 w-6 text-white" aria-hidden="true" />
    </div>
    <p class="text-sm leading-6 text-white">
      {{ notification().msg }}
    </p>
    <div class="flex flex-1 justify-end">
      <button type="button" class="-m-3 p-3 focus-visible:outline-offset-[-4px]" @click="closeNotification">
        <span class="sr-only">Dismiss</span>
        <XMarkIcon class="h-5 w-5 text-white" aria-hidden="true" />
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { XMarkIcon, ExclamationCircleIcon } from '@heroicons/vue/20/solid'
import { useCommonStore } from '@/stores/common.js'
const show = computed(() => useCommonStore().showNotificationBar)
function notification() {
  return useCommonStore().notificationBar
}
const closeNotification = () => useCommonStore().closeNotification()

const getNotificationClass = (type) => {
  const classes = {
    error: 'bg-red-500',
    success: 'bg-green-500',
    warning: 'bg-yellow-500',
  }
  return classes[type] || 'bg-gray-900'
}
</script>
