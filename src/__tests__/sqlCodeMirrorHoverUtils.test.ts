import { describe, expect, it } from 'vitest'
import { EditorState } from '@codemirror/state'
import type { EditorStateLike } from '@/components/codemirror/sqlCodeMirrorTypes'
import {
  getWordRangeAtPosition,
  renderHoverTooltipContent,
  toHoverText
} from '@/components/codemirror/sqlCodeMirrorHoverUtils'

function createState(doc: string): EditorStateLike {
  return EditorState.create({ doc }) as unknown as EditorStateLike
}

describe('sqlCodeMirrorHoverUtils', () => {
  it('converts hover content to normalized plain text', () => {
    expect(toHoverText('A&nbsp;&amp;&nbsp;B', 200)).toBe('A & B')
    expect(toHoverText([{ value: 'foo' }, 'bar'], 200)).toBe('foo\n\nbar')
    expect(toHoverText({ value: 'x'.repeat(10) }, 5)).toBe('xxxxx...')
  })

  it('extracts word range at cursor position', () => {
    const state = createState('SELECT actor_id FROM actor')
    const insideWordPos = 'SELECT ac'.length
    const range = getWordRangeAtPosition(state, insideWordPos)
    expect(range).toEqual({
      from: 7,
      to: 15,
      text: 'actor_id'
    })

    const noWordState = createState('SELECT () FROM actor')
    const betweenParensPos = 'SELECT ('.length
    expect(getWordRangeAtPosition(noWordState, betweenParensPos)).toBeNull()
  })

  it('renders markdown table hover content as structured DOM', () => {
    const container = document.createElement('div')
    renderHoverTooltipContent(
      container,
      [
        '# `actor` table',
        '',
        '| Name | Type |',
        '| --- | --- |',
        '| `actor_id` | `smallint` |'
      ].join('\n')
    )

    const heading = container.querySelector('.sql-hover-tooltip-heading')
    const table = container.querySelector('.sql-hover-tooltip-table')
    expect(heading?.textContent).toBe('actor table')
    expect(table).toBeTruthy()
    expect(table?.textContent).toContain('actor_id')
    expect(table?.textContent).toContain('smallint')
  })
})
