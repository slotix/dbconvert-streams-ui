import { watch, type ComputedRef, type Ref } from 'vue'
import type { GridApi } from 'ag-grid-community'

interface UseAgGridChangesGutterOptions {
  gridApi: Ref<GridApi | null> | ComputedRef<GridApi | null>
  visible: Ref<boolean> | ComputedRef<boolean>
  columnId?: string
}

export function useAgGridChangesGutter({
  gridApi,
  visible,
  columnId = '__changes__'
}: UseAgGridChangesGutterOptions) {
  watch(
    () => ({ api: gridApi.value, isVisible: visible.value }),
    ({ api, isVisible }) => {
      if (!api) return
      api.setColumnsVisible([columnId], isVisible)
    },
    { immediate: true }
  )
}
