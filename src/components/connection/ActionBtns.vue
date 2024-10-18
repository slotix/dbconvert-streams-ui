<template>
  <button
    type="submit"
    name="submit"
    class="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-gray-600 text-base font-medium text-white hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 sm:ml-3 sm:w-auto sm:text-sm"
    @click="confirm"
  >
    {{ buttonTitle }}
  </button>
  <button
    v-show="showTestConnectionBtn"
    :disabled="!currentConnection?.id"
    type="button"
    name="test"
    class="inline-flex w-full justify-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50 sm:ml-3 sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed"
    @click="test"
  >
    Test Connection
  </button>
  <button
    ref="cancelButtonRef"
    type="button"
    name="cancel"
    class="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto"
    @click="close"
  >
    Cancel
  </button>
</template>
<script setup lang="ts">
import { computed } from 'vue'
import { useConnectionsStore } from '@/stores/connections'
import { DIALOG_TYPES } from '@/stores/common' // Import the DIALOG_TYPES
const emit = defineEmits(['confirm', 'test', 'cancel'])
const confirm = () => {
  emit('confirm')
  if (buttonTitle.value === DIALOG_TYPES.UPDATE) {
    close()
  }
}
const test = () => {
  emit('test')
}
const close = () => {
  emit('cancel')
}
const props = defineProps({
  dlgType: String
})
const currentConnection = computed(() => useConnectionsStore().currentConnection)
const showTestConnectionBtn = computed(() => {
  return true
})
const buttonTitle = computed(() => {
  return currentConnection.value?.id ? DIALOG_TYPES.UPDATE : props.dlgType
})
</script>
