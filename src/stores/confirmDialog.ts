import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

export type ConfirmDialogOptions = {
  title?: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
}

type PendingConfirm = {
  resolve: (value: boolean) => void
}

export const useConfirmDialogStore = defineStore('confirmDialog', () => {
  const isOpen = ref(false)
  const title = ref<string>('Confirm action')
  const description = ref<string>('')
  const confirmLabel = ref<string>('Confirm')
  const cancelLabel = ref<string>('Cancel')
  const danger = ref<boolean>(false)

  const pending = ref<PendingConfirm | null>(null)

  const hasPending = computed(() => pending.value !== null)

  function reset() {
    isOpen.value = false
    title.value = 'Confirm action'
    description.value = ''
    confirmLabel.value = 'Confirm'
    cancelLabel.value = 'Cancel'
    danger.value = false
    pending.value = null
  }

  async function confirm(options?: ConfirmDialogOptions): Promise<boolean> {
    // If a confirm is already open, resolve it as cancelled.
    if (pending.value) {
      pending.value.resolve(false)
      pending.value = null
    }

    title.value = options?.title ?? 'Confirm action'
    description.value = options?.description ?? ''
    confirmLabel.value = options?.confirmLabel ?? 'Confirm'
    cancelLabel.value = options?.cancelLabel ?? 'Cancel'
    danger.value = options?.danger ?? false

    isOpen.value = true

    return await new Promise<boolean>((resolve) => {
      pending.value = { resolve }
    })
  }

  function resolveConfirm() {
    pending.value?.resolve(true)
    reset()
  }

  function resolveCancel() {
    pending.value?.resolve(false)
    reset()
  }

  return {
    isOpen,
    title,
    description,
    confirmLabel,
    cancelLabel,
    danger,
    hasPending,
    confirm,
    resolveConfirm,
    resolveCancel,
    reset
  }
})
