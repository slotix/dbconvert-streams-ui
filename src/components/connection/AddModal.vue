<template>
  <form
    @submit.prevent="submit"
    class="flex items-end justify-center pt-4 px-4 pb-20 text-center sm:block sm:p-0"
  >
    <TransitionRoot as="template" :show="showModal" class="min-h-screen">
      <Dialog as="div" class="relative z-10" @close="close">
        <TransitionChild
          as="template"
          enter="ease-out duration-300"
          enter-from="opacity-0"
          enter-to="opacity-100"
          leave="ease-in duration-200"
          leave-from="opacity-100"
          leave-to="opacity-0"
        >
          <div class="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
        </TransitionChild>

        <div class="fixed inset-0 z-10 overflow-y-auto">
          <div
            class="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0"
          >
            <TransitionChild
              as="template"
              enter="ease-out duration-300"
              enter-from="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              enter-to="opacity-100 translate-y-0 sm:scale-100"
              leave="ease-in duration-200"
              leave-from="opacity-100 translate-y-0 sm:scale-100"
              leave-to="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            >
              <DialogPanel
                class="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6"
              >
                <div class="absolute right-0 top-0 hidden pr-4 pt-4 sm:block">
                  <button
                    type="button"
                    class="rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                    @click="close"
                  >
                    <span class="sr-only">Close</span>
                    <XMarkIcon class="h-6 w-6" aria-hidden="true" />
                  </button>
                </div>
                <div class="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left">
                  <DialogTitle as="h3" class="text-base font-semibold leading-6 text-gray-900">
                    <slot name="title"></slot>
                  </DialogTitle>

                  <slot name="dbtypes-combo"></slot>
                  <div class="ml-auto">
                    <slot name="connection-params"></slot>
                  </div>
                </div>
                <div
                  v-if="isShowActionBtns"
                  class="bg-gray-500 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6"
                >
                  <button
                    type="submit"
                    name="submit"
                    @click="confirm"
                    class="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-gray-600 text-base font-medium text-white hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 sm:ml-3 sm:w-auto sm:text-sm"
                  >
                    <slot name="confirmButton"> Ok</slot>
                  </button>
                  <button
                    type="button"
                    name="test"
                    class="inline-flex w-full justify-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50 sm:ml-3 sm:w-auto"
                    v-show="showTestConnectionBtn"
                    @click="open = false"
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
                </div>
              </DialogPanel>
            </TransitionChild>
          </div>
        </div>
      </Dialog>
    </TransitionRoot>
  </form>
</template>

<script setup>
import { ref, watch, computed } from 'vue'
import { Dialog, DialogPanel, DialogTitle, TransitionChild, TransitionRoot } from '@headlessui/vue'
import { XMarkIcon } from '@heroicons/vue/24/outline'
import { mapGetters } from 'vuex'
import { useAddConnectionStore } from '@/stores/addConnection.js'

const emit = defineEmits(['ok', 'close'])
const props = defineProps({
  isShowActionBtns: Boolean,
  required: true,
  default: true
})
const currentConnection = ref(mapGetters(['currentConnection']))

const showTestConnectionBtn = computed(() => {
  if (!currentConnection) return false
  if (['Access', 'FoxPro', 'SQLite'].includes(currentConnection.type)) {
    return false
  }
  return true
})
const showModal = computed(() => {
  return useAddConnectionStore().showModal
})

function close() {
  useAddConnectionStore().closeModal()
}

function confirm() {
  emit('ok')
}
</script>
