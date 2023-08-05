<template>
  <button
    type="submit"
    name="submit"
    @click="confirm"
    class="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-gray-600 text-base font-medium text-white hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 sm:ml-3 sm:w-auto sm:text-sm"
  >
    {{ dlgType }}
    <!-- <slot name="confirmButton"> Ok</slot> -->
  </button>
  <button
    type="button"
    name="test"
    class="inline-flex w-full justify-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50 sm:ml-3 sm:w-auto"
    v-show="showTestConnectionBtn"
    @click="test"
  >
    Test Connection
  </button>
  <button
    type="button"
    name="cancel"
    class="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto"
    @click="close"
    ref="cancelButtonRef"
  >
    Cancel
  </button>
</template>
<script setup>
import { ref, computed } from 'vue'
import { useConnectionsStore } from '@/stores/connections.js'
import { mapState } from 'pinia'
const emit = defineEmits(['confirm', 'test', 'cancel'])
const confirm = () => {
  emit('confirm')
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
const currentConnection = ref(mapState(useConnectionsStore, ['currentConnection']))
const showTestConnectionBtn = computed(() => {
  if (!currentConnection) return false
  if (['Access', 'FoxPro', 'SQLite'].includes(currentConnection.type)) {
    return false
  }
  return true
})
</script>
