import { describe, expect, it } from 'vitest'
import {
  findClosestCollapsibleNodeIndex,
  getTreeKeyboardIntent,
  getTreeNodeParentIndex,
  type TreeKeyboardNodeState
} from '../utils/treeKeyboardNavigation'

const tree: TreeKeyboardNodeState[] = [
  { depth: 0, expandable: true, expanded: true }, // connection
  { depth: 1, expandable: true, expanded: true }, // database
  { depth: 2, expandable: false, expanded: false }, // object leaf
  { depth: 1, expandable: true, expanded: false } // database collapsed
]

describe('tree keyboard navigation utils', () => {
  it('handles Home and End', () => {
    expect(getTreeKeyboardIntent('Home', 2, tree)).toEqual({ type: 'focus', index: 0 })
    expect(getTreeKeyboardIntent('End', 1, tree)).toEqual({ type: 'focus', index: tree.length - 1 })
  })

  it('resolves parent indexes from depth', () => {
    expect(getTreeNodeParentIndex(tree, 2)).toBe(1)
    expect(getTreeNodeParentIndex(tree, 3)).toBe(0)
    expect(getTreeNodeParentIndex(tree, 0)).toBe(-1)
  })

  it('finds nearest collapsible ancestor', () => {
    expect(findClosestCollapsibleNodeIndex(tree, 2)).toBe(1)
    expect(findClosestCollapsibleNodeIndex(tree, 3)).toBe(0)
    expect(
      findClosestCollapsibleNodeIndex(
        tree.map((node) => ({ ...node, expanded: false })),
        2
      )
    ).toBe(-1)
  })

  it('handles ArrowDown and ArrowUp', () => {
    expect(getTreeKeyboardIntent('ArrowDown', 1, tree)).toEqual({ type: 'focus', index: 2 })
    expect(getTreeKeyboardIntent('ArrowUp', 1, tree)).toEqual({ type: 'focus', index: 0 })
  })

  it('handles ArrowRight and ArrowLeft', () => {
    expect(getTreeKeyboardIntent('ArrowRight', 3, tree)).toEqual({ type: 'expand', index: 3 })
    expect(getTreeKeyboardIntent('ArrowRight', 1, tree)).toEqual({ type: 'focus', index: 2 })
    expect(getTreeKeyboardIntent('ArrowLeft', 1, tree)).toEqual({ type: 'collapse', index: 1 })
    expect(getTreeKeyboardIntent('ArrowLeft', 2, tree)).toEqual({ type: 'focus', index: 1 })
  })

  it('handles Enter and Escape', () => {
    expect(getTreeKeyboardIntent('Enter', 2, tree)).toEqual({ type: 'activate', index: 2 })
    expect(getTreeKeyboardIntent('Escape', 2, tree)).toEqual({ type: 'collapse', index: 1 })
    expect(getTreeKeyboardIntent('Esc', 2, tree)).toEqual({ type: 'collapse', index: 1 })
  })

  it('handles * to expand collapsed siblings', () => {
    expect(getTreeKeyboardIntent('*', 1, tree)).toEqual({ type: 'expand-many', indexes: [3] })
    expect(getTreeKeyboardIntent('Multiply', 1, tree)).toEqual({
      type: 'expand-many',
      indexes: [3]
    })
    expect(getTreeKeyboardIntent('*', 2, tree)).toEqual({ type: 'none' })
  })
})
