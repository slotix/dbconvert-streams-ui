import { computed, onBeforeUnmount, onMounted, watch, type ComputedRef, type Ref } from 'vue'
import { onBeforeRouteLeave } from 'vue-router'
import { isWailsContext } from '@/composables/useWailsEvents'
import { useUnsavedChangesGuard } from '@/composables/useUnsavedChangesGuard'

interface UseAgGridUnsavedChangesLifecycleOptions {
  hasUnsavedChanges: Ref<boolean> | ComputedRef<boolean>
  objectKey: string | Ref<string> | ComputedRef<string>
  setHasUnsavedChanges: (objectKey: string, dirty: boolean) => void
  discardDescription?: string
}

export function useAgGridUnsavedChangesLifecycle({
  hasUnsavedChanges,
  objectKey,
  setHasUnsavedChanges,
  discardDescription = 'You have unsaved changes. Discard them and leave?'
}: UseAgGridUnsavedChangesLifecycleOptions) {
  const { confirmDiscardUnsavedChanges } = useUnsavedChangesGuard()

  const objectKeyRef = computed(() => (typeof objectKey === 'string' ? objectKey : objectKey.value))

  function onBeforeUnload(event: BeforeUnloadEvent) {
    if (!hasUnsavedChanges.value) return
    event.preventDefault()
    event.returnValue = ''
  }

  onMounted(() => {
    // In browsers, custom dialogs can't reliably replace the native beforeunload prompt.
    // In Wails desktop mode, the backend close hook handles styled confirmation.
    if (!isWailsContext()) {
      window.addEventListener('beforeunload', onBeforeUnload)
    }
  })

  onBeforeUnmount(() => {
    window.removeEventListener('beforeunload', onBeforeUnload)
    setHasUnsavedChanges(objectKeyRef.value, false)
  })

  watch(
    hasUnsavedChanges,
    (dirty) => {
      setHasUnsavedChanges(objectKeyRef.value, dirty)
    },
    { immediate: true }
  )

  onBeforeRouteLeave(() => {
    if (!hasUnsavedChanges.value) return true
    return confirmDiscardUnsavedChanges({ description: discardDescription })
  })
}
