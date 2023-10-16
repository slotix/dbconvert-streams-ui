<template>
  <div
    v-if="show"
    :class="getNotificationClass(notification.type)"
    class="flex items-center gap-x-6 bg-gray-900 px-6 py-2.5 sm:px-3.5 sm:before:flex-1"
  >
    <!-- Conditionally render the ExclamationCircleIcon for error type -->
    <div v-if="notification.type === 'error'">
      <ExclamationCircleIcon class="h-6 w-6 text-white" aria-hidden="true" />
    </div>
    <p class="text-sm leading-6 text-white">
      {{ notification.msg }}
    </p>
    <div class="flex flex-1 justify-end">
      <button
        type="button"
        class="-m-3 p-3 focus-visible:outline-offset-[-4px]"
        @click="closeNotification"
      >
        <span class="sr-only">Dismiss</span>
        <XMarkIcon class="h-5 w-5 text-white" aria-hidden="true" />
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { XMarkIcon, ExclamationCircleIcon } from '@heroicons/vue/20/solid'
import { useSettingsStore } from '@/stores/settings.js'
const show = computed(() => {
  return useSettingsStore().showNotificationBar
})
const notification = computed(() => {
  const notification = useSettingsStore().notificationBar
  // console.log(notification)
  return useSettingsStore().notificationBar
})
const closeNotification = () => {
  useSettingsStore().showNotificationBar = false
}

const getNotificationClass = (type) => {
  if (type === 'error') {
    return 'bg-red-500'
  } else if (type === 'success') {
    return 'bg-green-500'
  } else if (type === 'warning') {
    return 'bg-yellow-500'
  } else {
    // Default class if type is not recognized
    return 'bg-gray-900'
  }
}
</script>
