<template>
  <div v-if="show && notification" :class="getNotificationClass(notification.type)"
    class="flex items-center gap-x-6 bg-gray-900 px-6 py-2.5 sm:px-3.5 sm:before:flex-1">
    <div v-if="notification.type === 'error'">
      <ExclamationCircleIcon class="h-6 w-6 text-white" aria-hidden="true" />
    </div>
    <p class="text-sm leading-6 text-white">
      {{ notification.msg }}
    </p>
    <div class="flex flex-1 justify-end">
      <button type="button" class="-m-3 p-3 focus-visible:outline-offset-[-4px]" @click="hideNotification">
        <span class="sr-only">Dismiss</span>
        <XMarkIcon class="h-5 w-5 text-white" aria-hidden="true" />
      </button>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed } from 'vue'
import { XMarkIcon, ExclamationCircleIcon } from '@heroicons/vue/20/solid'
import { useCommonStore, Notification} from '@/stores/common'


const commonStore = useCommonStore();
const show = computed(() => commonStore.showNotificationBar)
const notification = computed<Notification | null>(() => commonStore.notificationBar)

const hideNotification = (): void => commonStore.hideNotification()

const getNotificationClass = (type: Notification['type']): string => {
  const classes: { [key in Notification['type']]: string } = {
    error: 'bg-red-500',
    success: 'bg-green-500',
    warning: 'bg-yellow-500',
    info: 'bg-blue-500',
  }
  return classes[type] || 'bg-gray-900'
}
</script>
