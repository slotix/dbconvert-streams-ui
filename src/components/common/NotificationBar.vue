<template>
  <div class="fixed top-0 right-0 p-4 space-y-4 max-w-md w-full z-50">
    <TransitionGroup
      tag="div"
      enter-active-class="transform ease-out duration-300 transition"
      enter-from-class="translate-y-2 opacity-0"
      enter-to-class="translate-y-0 opacity-100"
      leave-active-class="transition ease-in duration-100"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-for="notification in notifications"
        :key="notification.id"
        :class="[
          notificationTypeClasses[notification.type],
          'max-w-sm w-full bg-white shadow-lg rounded-lg pointer-events-auto ring-1 ring-black ring-opacity-5 overflow-hidden'
        ]"
      >
        <div class="p-4">
          <div class="flex items-start">
            <div class="flex-shrink-0">
              <component :is="notificationTypeIcons[notification.type]" 
                         :class="iconColorClasses[notification.type]"
                         class="h-6 w-6" 
                         aria-hidden="true" />
            </div>
            <div class="ml-3 w-0 flex-1 pt-0.5">
              <p :class="textColorClasses[notification.type]" class="text-sm font-medium">
                {{ notification.msg }}
              </p>
            </div>
            <div class="ml-4 flex-shrink-0 flex">
              <button
                @click="dismissNotification(notification.id)"
                class="bg-white rounded-md inline-flex text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <span class="sr-only">Close</span>
                <XMarkIcon class="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </TransitionGroup>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { XMarkIcon, CheckCircleIcon, ExclamationCircleIcon, InformationCircleIcon, ExclamationTriangleIcon } from '@heroicons/vue/24/solid'
import { useCommonStore, Notification } from '@/stores/common'

const commonStore = useCommonStore()

const notifications = computed(() => commonStore.notificationQueue)

const notificationTypeClasses = {
  error: 'bg-red-50',
  success: 'bg-green-50',
  warning: 'bg-yellow-50',
  info: 'bg-blue-50'
}

const iconColorClasses = {
  error: 'text-red-400',
  success: 'text-green-400',
  warning: 'text-yellow-400',
  info: 'text-blue-400'
}

const textColorClasses = {
  error: 'text-red-800',
  success: 'text-green-800',
  warning: 'text-yellow-800',
  info: 'text-blue-800'
}

const notificationTypeIcons = {
  error: ExclamationTriangleIcon,
  success: CheckCircleIcon,
  warning: ExclamationCircleIcon,
  info: InformationCircleIcon
}

const dismissNotification = (id: string) => {
  commonStore.dismissNotification(id)
}
</script>
