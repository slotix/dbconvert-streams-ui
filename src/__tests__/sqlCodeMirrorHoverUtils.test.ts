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
        '| NAME | TYPE | PRIMARY KEY | DEFAULT | EXTRA |',
        '| --- | --- | --- | --- | --- |',
        '| `actor_id` | `smallint unsigned` | PRI | - | auto_increment |',
        '| `first_name` | `varchar(45)` | - | - | - |',
        '| `last_name` | `varchar(45)` | MUL | - | - |',
        '| `last_update` | `timestamp` | - | CURRENT_TIMESTAMP | DEFAULT_GENERATED on update CURRENT_TIMESTAMP |',
        '| `notes` | `varchar(500)` | - | - | - |',
        '| `created_at` | `timestamp` | - | CURRENT_TIMESTAMP | - |',
        '| `updated_by` | `varchar(255)` | - | - | - |'
      ].join('\n')
    )

    const title = container.querySelector('.sql-hover-schema-title')
    const meta = container.querySelector('.sql-hover-schema-meta')
    const rows = container.querySelectorAll('.sql-hover-schema-row')
    const more = container.querySelector('.sql-hover-schema-more')

    expect(title?.textContent).toBe('actor')
    expect(meta?.textContent).toContain('7 cols')
    expect(meta?.textContent).toContain('PK: actor_id')
    expect(rows).toHaveLength(6)
    expect(rows[0]?.textContent).toContain('actor_id')
    expect(rows[0]?.textContent).toContain('SMALLINT')
    expect(rows[0]?.textContent).toContain('PK')
    expect(rows[0]?.textContent).toContain('AI')
    expect(rows[2]?.textContent).toContain('IDX')
    expect(rows[3]?.textContent).toContain('DEF+UPD')
    expect(more?.textContent).toBe('+1 more columns')
  })

  it('pins the hovered column row to the top for schema cards', () => {
    const container = document.createElement('div')
    renderHoverTooltipContent(
      container,
      [
        '# `actor` table',
        '',
        '| NAME | TYPE | PRIMARY KEY | DEFAULT | EXTRA |',
        '| --- | --- | --- | --- | --- |',
        '| `actor_id` | `smallint` | PRI | - | auto_increment |',
        '| `first_name` | `varchar(45)` | - | - | - |',
        '| `last_update` | `timestamp` | - | CURRENT_TIMESTAMP | DEFAULT_GENERATED on update CURRENT_TIMESTAMP |'
      ].join('\n'),
      { hoveredToken: 'last_update' }
    )

    const rows = container.querySelectorAll('.sql-hover-schema-row')
    expect(rows).toHaveLength(3)
    expect(rows[0]?.textContent).toContain('last_update')
    expect(rows[0]?.className).toContain('sql-hover-schema-row-active')
  })

  it('highlights primary key row when table token is hovered', () => {
    const container = document.createElement('div')
    renderHoverTooltipContent(
      container,
      [
        '# `actor` table',
        '',
        '| NAME | TYPE | PRIMARY KEY | DEFAULT | EXTRA |',
        '| --- | --- | --- | --- | --- |',
        '| `first_name` | `varchar(45)` | - | - | - |',
        '| `actor_id` | `smallint` | PRI | - | auto_increment |',
        '| `last_name` | `varchar(45)` | - | - | - |'
      ].join('\n'),
      { hoveredToken: 'actor' }
    )

    const rows = container.querySelectorAll('.sql-hover-schema-row')
    expect(rows).toHaveLength(3)
    expect(rows[0]?.textContent).toContain('actor_id')
    expect(rows[0]?.className).toContain('sql-hover-schema-row-active')
  })
})
