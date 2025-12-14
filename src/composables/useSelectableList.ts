import { computed, type Ref, type ComputedRef } from 'vue'

export interface SelectableItem {
  selected?: boolean
}

export interface SelectableListOptions<T extends SelectableItem> {
  /**
   * Optional function to filter items before calculating selection state.
   * Useful when you want to only consider visible/filtered items.
   */
  filterFn?: (items: T[]) => T[]
}

export interface SelectableListReturn<T extends SelectableItem> {
  /**
   * Items that are currently selected
   */
  selectedItems: ComputedRef<T[]>

  /**
   * Count of selected items
   */
  selectedCount: ComputedRef<number>

  /**
   * Whether all items are selected
   */
  allSelected: ComputedRef<boolean>

  /**
   * Whether no items are selected
   */
  noneSelected: ComputedRef<boolean>

  /**
   * Whether some but not all items are selected (for indeterminate checkbox state)
   */
  indeterminate: ComputedRef<boolean>

  /**
   * Checkbox state value (true if all selected, false otherwise)
   * Use this for the :checked binding on select-all checkbox
   */
  selectAllState: ComputedRef<boolean>

  /**
   * Select or deselect all items
   */
  toggleAll: (selected: boolean) => void

  /**
   * Toggle a single item's selection
   */
  toggle: (item: T) => void

  /**
   * Set selection state for a single item
   */
  setSelected: (item: T, selected: boolean) => void

  /**
   * Select all items
   */
  selectAll: () => void

  /**
   * Deselect all items
   */
  deselectAll: () => void
}

/**
 * Composable for managing selection state in a list of items.
 * Works with any array of objects that have a `selected` property.
 *
 * @example
 * ```ts
 * interface Table { name: string; selected?: boolean }
 * const tables = ref<Table[]>([...])
 *
 * const {
 *   selectedItems,
 *   selectedCount,
 *   indeterminate,
 *   selectAllState,
 *   toggleAll,
 *   toggle
 * } = useSelectableList(tables)
 *
 * // In template:
 * // <input type="checkbox" :checked="selectAllState" :indeterminate="indeterminate" @change="toggleAll($event.target.checked)" />
 * ```
 */
export function useSelectableList<T extends SelectableItem>(
  items: Ref<T[]> | ComputedRef<T[]>,
  options: SelectableListOptions<T> = {}
): SelectableListReturn<T> {
  const { filterFn } = options

  // Get the items to operate on (optionally filtered)
  const effectiveItems = computed(() => {
    return filterFn ? filterFn(items.value) : items.value
  })

  const selectedItems = computed(() => {
    return effectiveItems.value.filter((item) => item.selected)
  })

  const selectedCount = computed(() => {
    return selectedItems.value.length
  })

  const allSelected = computed(() => {
    return effectiveItems.value.length > 0 && selectedCount.value === effectiveItems.value.length
  })

  const noneSelected = computed(() => {
    return selectedCount.value === 0
  })

  const indeterminate = computed(() => {
    return selectedCount.value > 0 && selectedCount.value < effectiveItems.value.length
  })

  const selectAllState = computed(() => {
    // Return true only if all are selected, false otherwise
    // This is the value for :checked binding
    return allSelected.value
  })

  const toggleAll = (selected: boolean): void => {
    effectiveItems.value.forEach((item) => {
      item.selected = selected
    })
  }

  const toggle = (item: T): void => {
    item.selected = !item.selected
  }

  const setSelected = (item: T, selected: boolean): void => {
    item.selected = selected
  }

  const selectAll = (): void => {
    toggleAll(true)
  }

  const deselectAll = (): void => {
    toggleAll(false)
  }

  return {
    selectedItems,
    selectedCount,
    allSelected,
    noneSelected,
    indeterminate,
    selectAllState,
    toggleAll,
    toggle,
    setSelected,
    selectAll,
    deselectAll
  }
}
