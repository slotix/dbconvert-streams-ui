<template>
  <div
    v-if="show"
    :class="getNotificationClass(type)"
    class="flex items-center gap-x-6 bg-gray-900 px-6 py-2.5 sm:px-3.5 sm:before:flex-1"
  >
    <p class="text-sm leading-6 text-white">
      {{ msg }} 
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
import { ref} from 'vue'
import { XMarkIcon } from '@heroicons/vue/20/solid'
const props = defineProps({
  msg: {
    type: String
  },
  type: {
    type: String
  },
  show: {
    type: Boolean
  }
})
const emit = defineEmits(['close'])
const closeNotification = () => {
  emit('close') 
  // props.show = false
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
