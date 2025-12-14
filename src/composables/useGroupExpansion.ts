import { ref, computed, type Ref, type ComputedRef } from 'vue'

export interface GroupExpansionOptions<T, K extends string = string> {
  /**
   * Function to extract the group key from an item
   */
  getGroupKey: (item: T) => K

  /**
   * Optional function to sort groups. Receives array of group keys.
   * Default: alphabetical sort
   */
  sortGroups?: (groups: K[]) => K[]

  /**
   * Optional function to sort items within a group
   */
  sortItems?: (items: T[]) => T[]

  /**
   * Initial expanded groups (keys). If not provided, first group is expanded.
   */
  initialExpanded?: K[]

  /**
   * If true, auto-expand first group when items change and no groups are expanded
   */
  autoExpandFirst?: boolean
}

export interface GroupedItem<T, K extends string = string> {
  key: K
  items: T[]
}

export interface GroupExpansionReturn<T, K extends string = string> {
  /**
   * Set of currently expanded group keys
   */
  expandedGroups: Ref<Set<K>>

  /**
   * Check if a group is expanded
   */
  isExpanded: (key: K) => boolean

  /**
   * Toggle a group's expansion state
   */
  toggle: (key: K) => void

  /**
   * Expand a specific group
   */
  expand: (key: K) => void

  /**
   * Collapse a specific group
   */
  collapse: (key: K) => void

  /**
   * Expand all groups
   */
  expandAll: () => void

  /**
   * Collapse all groups
   */
  collapseAll: () => void

  /**
   * Computed grouped items
   */
  groupedItems: ComputedRef<GroupedItem<T, K>[]>

  /**
   * Reset expansion state (optionally expand specific keys)
   */
  reset: (initialKeys?: K[]) => void
}

/**
 * Composable for managing expandable groups with items.
 *
 * @example
 * ```ts
 * const { groupedItems, isExpanded, toggle } = useGroupExpansion(
 *   tables,
 *   {
 *     getGroupKey: (table) => table.schema || 'default',
 *     sortGroups: (groups) => {
 *       // Put 'public' first, then alphabetical
 *       return groups.sort((a, b) => {
 *         if (a === 'public') return -1
 *         if (b === 'public') return 1
 *         return a.localeCompare(b)
 *       })
 *     },
 *     autoExpandFirst: true
 *   }
 * )
 * ```
 */
export function useGroupExpansion<T, K extends string = string>(
  items: Ref<T[]> | ComputedRef<T[]>,
  options: GroupExpansionOptions<T, K>
): GroupExpansionReturn<T, K> {
  const {
    getGroupKey,
    sortGroups = (groups: K[]) => groups.sort((a, b) => a.localeCompare(b)),
    sortItems,
    initialExpanded = [],
    autoExpandFirst = false
  } = options

  const expandedGroups = ref<Set<K>>(new Set(initialExpanded)) as Ref<Set<K>>
  let initialized = false

  const isExpanded = (key: K): boolean => {
    return expandedGroups.value.has(key)
  }

  const toggle = (key: K): void => {
    if (expandedGroups.value.has(key)) {
      expandedGroups.value.delete(key)
    } else {
      expandedGroups.value.add(key)
    }
  }

  const expand = (key: K): void => {
    expandedGroups.value.add(key)
  }

  const collapse = (key: K): void => {
    expandedGroups.value.delete(key)
  }

  const expandAll = (): void => {
    const allKeys = groupedItems.value.map((g) => g.key)
    expandedGroups.value = new Set(allKeys)
  }

  const collapseAll = (): void => {
    expandedGroups.value.clear()
  }

  const reset = (initialKeys?: K[]): void => {
    expandedGroups.value = new Set(initialKeys || [])
    initialized = false
  }

  const groupedItems = computed<GroupedItem<T, K>[]>(() => {
    const map = new Map<K, T[]>()

    items.value.forEach((item) => {
      const key = getGroupKey(item)
      if (!map.has(key)) {
        map.set(key, [])
      }
      map.get(key)!.push(item)
    })

    // Get sorted group keys
    const sortedKeys = sortGroups(Array.from(map.keys()))

    // Build result with optional item sorting
    const result = sortedKeys.map((key) => ({
      key,
      items: sortItems ? sortItems(map.get(key)!) : map.get(key)!
    }))

    // Auto-expand first group if needed
    if (autoExpandFirst && !initialized && result.length > 0 && expandedGroups.value.size === 0) {
      expandedGroups.value.add(result[0].key)
      initialized = true
    }

    return result
  })

  return {
    expandedGroups,
    isExpanded,
    toggle,
    expand,
    collapse,
    expandAll,
    collapseAll,
    groupedItems,
    reset
  }
}
