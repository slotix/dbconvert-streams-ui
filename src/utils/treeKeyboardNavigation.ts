export interface TreeKeyboardNodeState {
  depth: number
  expandable: boolean
  expanded: boolean
}

export type TreeKeyboardIntent =
  | { type: 'focus'; index: number }
  | { type: 'expand'; index: number }
  | { type: 'expand-many'; indexes: number[] }
  | { type: 'collapse'; index: number }
  | { type: 'activate'; index: number }
  | { type: 'none' }

export function getTreeNodeParentIndex(nodes: TreeKeyboardNodeState[], childIndex: number): number {
  if (childIndex <= 0 || childIndex >= nodes.length) return -1

  const childDepth = nodes[childIndex]?.depth ?? 0
  for (let i = childIndex - 1; i >= 0; i -= 1) {
    if ((nodes[i]?.depth ?? 0) < childDepth) {
      return i
    }
  }
  return -1
}

export function findClosestCollapsibleNodeIndex(
  nodes: TreeKeyboardNodeState[],
  startIndex: number
): number {
  let index = startIndex

  while (index >= 0 && index < nodes.length) {
    const node = nodes[index]
    if (node?.expandable && node.expanded) {
      return index
    }
    index = getTreeNodeParentIndex(nodes, index)
  }

  return -1
}

function getSiblingExpandableIndexes(
  nodes: TreeKeyboardNodeState[],
  currentIndex: number
): number[] {
  const current = nodes[currentIndex]
  if (!current) return []

  const parentIndex = getTreeNodeParentIndex(nodes, currentIndex)
  const targetDepth = current.depth

  const indexes: number[] = []
  for (let i = 0; i < nodes.length; i += 1) {
    const candidate = nodes[i]
    if (!candidate || candidate.depth !== targetDepth) continue
    if (getTreeNodeParentIndex(nodes, i) !== parentIndex) continue
    if (candidate.expandable && !candidate.expanded) {
      indexes.push(i)
    }
  }

  return indexes
}

export function getTreeKeyboardIntent(
  key: string,
  currentIndex: number,
  nodes: TreeKeyboardNodeState[]
): TreeKeyboardIntent {
  if (!nodes.length || currentIndex < 0 || currentIndex >= nodes.length) {
    return { type: 'none' }
  }

  const current = nodes[currentIndex]

  switch (key) {
    case 'Home':
      return { type: 'focus', index: 0 }
    case 'End':
      return { type: 'focus', index: nodes.length - 1 }
    case 'ArrowDown':
      return { type: 'focus', index: Math.min(currentIndex + 1, nodes.length - 1) }
    case 'ArrowUp':
      return { type: 'focus', index: Math.max(currentIndex - 1, 0) }
    case 'ArrowRight':
      if (current.expandable && !current.expanded) {
        return { type: 'expand', index: currentIndex }
      }
      return { type: 'focus', index: Math.min(currentIndex + 1, nodes.length - 1) }
    case 'ArrowLeft':
      if (current.expandable && current.expanded) {
        return { type: 'collapse', index: currentIndex }
      }
      return {
        type: 'focus',
        index: Math.max(getTreeNodeParentIndex(nodes, currentIndex), currentIndex - 1, 0)
      }
    case 'Enter':
      return { type: 'activate', index: currentIndex }
    case 'Escape':
    case 'Esc': {
      const index = findClosestCollapsibleNodeIndex(nodes, currentIndex)
      return index >= 0 ? { type: 'collapse', index } : { type: 'none' }
    }
    case '*':
    case 'Multiply': {
      const indexes = getSiblingExpandableIndexes(nodes, currentIndex)
      return indexes.length > 0 ? { type: 'expand-many', indexes } : { type: 'none' }
    }
    default:
      return { type: 'none' }
  }
}
