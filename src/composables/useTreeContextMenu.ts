import { ref, computed } from 'vue'

// Context menu target types
export type ContextTarget =
  | { kind: 'connection'; connectionId: string }
  | { kind: 'database'; connectionId: string; database: string }
  | { kind: 'schema'; connectionId: string; database: string; schema: string }
  | {
      kind: 'table' | 'view' | 'function' | 'procedure' | 'sequence'
      connectionId: string
      database: string
      schema?: string
      name: string
    }
  | {
      kind: 'file'
      connectionId: string
      path: string
      name: string
      isDir?: boolean
      isTable?: boolean
      format?: string
    }

export type DatabaseObjectTarget = Extract<
  ContextTarget,
  { kind: 'table' | 'view' | 'function' | 'procedure' | 'sequence' }
>

/**
 * Composable for managing context menu state in tree views
 */
export function useTreeContextMenu() {
  const contextMenuVisible = ref(false)
  const contextMenuX = ref(0)
  const contextMenuY = ref(0)
  const contextTarget = ref<ContextTarget | null>(null)

  const hasContextMenu = computed(() => contextMenuVisible.value && !!contextTarget.value)
  const menuTarget = computed<ContextTarget>(() => contextTarget.value as ContextTarget)

  const menuObj = computed<DatabaseObjectTarget | null>(() =>
    menuTarget.value &&
    (menuTarget.value.kind === 'table' ||
      menuTarget.value.kind === 'view' ||
      menuTarget.value.kind === 'function' ||
      menuTarget.value.kind === 'procedure' ||
      menuTarget.value.kind === 'sequence')
      ? (menuTarget.value as DatabaseObjectTarget)
      : null
  )

  function onContextKeydown(ev: KeyboardEvent) {
    if (ev.key === 'Escape') close()
  }

  function open(e: MouseEvent, target: ContextTarget) {
    e.preventDefault()
    contextTarget.value = target
    contextMenuX.value = e.clientX + 2
    contextMenuY.value = e.clientY + 2
    contextMenuVisible.value = true
    window.addEventListener('click', close, { once: true })
    window.addEventListener('keydown', onContextKeydown)
  }

  function close() {
    contextMenuVisible.value = false
    contextTarget.value = null
    window.removeEventListener('keydown', onContextKeydown)
  }

  return {
    // State
    contextMenuVisible,
    contextMenuX,
    contextMenuY,
    contextTarget,
    hasContextMenu,
    menuTarget,
    menuObj,

    // Methods
    open,
    close
  }
}
