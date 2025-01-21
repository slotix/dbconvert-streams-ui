<template>
  <form
    class="flex items-end justify-center pt-4 px-4 pb-20 text-center sm:block sm:p-0"
    @submit.prevent="submit"
  >
    <TransitionRoot as="template" :show="showModal">
      <Dialog as="div" class="relative z-40" @close="close">
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
                class="relative transform overflow-hidden rounded-lg bg-white pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg"
              >
                <div class="absolute right-0 top-0 hidden pr-4 pt-4 sm:block">
                  <button
                    type="button"
                    class="rounded-md bg-gray-100 p-1 text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                    @click="close"
                  >
                    <span class="sr-only">Close</span>
                    <XMarkIcon class="h-6 w-6" aria-hidden="true" />
                  </button>
                </div>
                <div class="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left">
                  <DialogTitle as="h3" class="text-base font-semibold leading-6 text-gray-900">
                    {{ dlgTp }} database connection.
                  </DialogTitle>
                  <div v-if="isShowDBTypesCombo">
                    <slot name="dbtypes-combo" class="mt-12"></slot>
                  </div>
                  <div class="ml-auto">
                    <slot name="connection-params"></slot>
                  </div>
                </div>
                <div
                  v-if="showActionBtns"
                  class="bg-gray-100 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6"
                >
                  <ActionBtns :dlgType="dlgTp" @confirm="confirm" @test="test" @cancel="close" />
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
import { computed } from 'vue'
import { Dialog, DialogPanel, DialogTitle, TransitionChild, TransitionRoot } from '@headlessui/vue'
import { XMarkIcon } from '@heroicons/vue/24/outline'
import { useCommonStore, DIALOG_TYPES } from '@/stores/common'
import { useConnectionsStore } from '@/stores/connections'
import ActionBtns from './ActionBtns.vue'

const emit = defineEmits(['ok', 'close'])
const currentConnection = computed(() => useConnectionsStore().currentConnection)
const showModal = computed(() => {
  return useCommonStore().showModal
})

const dlgTp = computed(() => {
  return useCommonStore().dlgType
})
const isShowDBTypesCombo = computed(() => {
  return dlgTp.value === DIALOG_TYPES.SAVE
})

const showActionBtns = computed(() => {
  if (dlgTp.value === DIALOG_TYPES.SAVE) {
    return true
  }
  if (dlgTp.value === DIALOG_TYPES.UPDATE && currentConnection.value != null) {
    return true
  }
})

async function test() {
  useConnectionsStore().testConnection()
}

function close() {
  useCommonStore().closeModal()
}

function confirm() {
  emit('ok')
}
</script>
