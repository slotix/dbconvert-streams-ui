<template>
  <TransitionRoot as="template" :show="!!isOpen">
    <Dialog as="div" class="relative z-50" @close="handleCancel">
      <TransitionChild
        as="template"
        enter="ease-out duration-200"
        enter-from="opacity-0"
        enter-to="opacity-100"
        leave="ease-in duration-150"
        leave-from="opacity-100"
        leave-to="opacity-0"
      >
        <div class="fixed inset-0 bg-black/40" />
      </TransitionChild>

      <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <TransitionChild
          as="template"
          enter="ease-out duration-200"
          enter-from="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
          enter-to="opacity-100 translate-y-0 sm:scale-100"
          leave="ease-in duration-150"
          leave-from="opacity-100 translate-y-0 sm:scale-100"
          leave-to="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
        >
          <DialogPanel
            class="w-full max-w-md transform overflow-hidden rounded-2xl bg-white dark:bg-gray-850 p-6 text-left align-middle shadow-2xl dark:shadow-gray-900/50 transition-all border border-gray-100 dark:border-gray-800"
          >
            <DialogTitle as="h3" class="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {{ title }}
            </DialogTitle>
            <DialogDescription
              v-if="description"
              class="mt-2 text-sm text-gray-600 dark:text-gray-400"
            >
              {{ description }}
            </DialogDescription>

            <div class="mt-6 flex justify-end space-x-3">
              <BaseButton variant="secondary" @click="handleCancel">
                {{ cancelLabel }}
              </BaseButton>
              <BaseButton :variant="danger ? 'danger' : 'primary'" @click="handleConfirm">
                {{ confirmLabel }}
              </BaseButton>
            </div>
          </DialogPanel>
        </TransitionChild>
      </div>
    </Dialog>
  </TransitionRoot>
</template>

<script setup lang="ts">
import {
  Dialog,
  DialogDescription,
  DialogPanel,
  DialogTitle,
  TransitionChild,
  TransitionRoot
} from '@headlessui/vue'
import BaseButton from '@/components/base/BaseButton.vue'

interface Props {
  isOpen: boolean
  title?: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
}

withDefaults(defineProps<Props>(), {
  title: 'Confirm action',
  description: '',
  confirmLabel: 'Confirm',
  cancelLabel: 'Cancel',
  danger: false
})

const emit = defineEmits<{
  (e: 'update:isOpen', value: boolean): void
  (e: 'confirm'): void
  (e: 'cancel'): void
}>()

function closeModal() {
  emit('update:isOpen', false)
}

function handleCancel() {
  emit('cancel')
  closeModal()
}

function handleConfirm() {
  emit('confirm')
  closeModal()
}
</script>
