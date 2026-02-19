import { describe, expect, it } from 'vitest'
import { EditorState } from '@codemirror/state'
import type { EditorStateLike, LspDiagnostic } from '@/components/codemirror/sqlCodeMirrorTypes'
import {
  buildLspCompletionContext,
  fromLspPosition,
  normalizeCompletionItems,
  toCodeMirrorDiagnostic,
  toLspPosition
} from '@/components/codemirror/sqlCodeMirrorLspUtils'

function createState(doc: string): EditorStateLike {
  return EditorState.create({ doc }) as unknown as EditorStateLike
}

describe('sqlCodeMirrorLspUtils', () => {
  it('normalizes completion payload variants', () => {
    expect(normalizeCompletionItems(null)).toEqual([])
    expect(normalizeCompletionItems([{ label: 'SELECT' }])).toEqual([{ label: 'SELECT' }])
    expect(normalizeCompletionItems({ items: [{ label: 'FROM' }] })).toEqual([{ label: 'FROM' }])
  })

  it('builds LSP completion context correctly', () => {
    expect(buildLspCompletionContext('.', false, 1, 2)).toEqual({
      triggerKind: 2,
      triggerCharacter: '.'
    })
    expect(buildLspCompletionContext('x', true, 1, 2)).toEqual({ triggerKind: 1 })
    expect(buildLspCompletionContext('x', false, 1, 2)).toBeUndefined()
  })

  it('converts between editor and LSP positions', () => {
    const state = createState('SELECT\nactor')
    expect(toLspPosition(state, 0)).toEqual({ line: 0, character: 0 })
    expect(toLspPosition(state, 9)).toEqual({ line: 1, character: 2 })
    expect(fromLspPosition(state, { line: 1, character: 2 })).toBe(9)
    // Out-of-range line/character are clamped.
    expect(fromLspPosition(state, { line: 99, character: 99 })).toBe(state.doc.length)
  })

  it('maps LSP diagnostics to CodeMirror diagnostics', () => {
    const state = createState('SELECT 1;')
    const diagnostic: LspDiagnostic = {
      range: {
        start: { line: 0, character: 0 },
        end: { line: 0, character: 6 }
      },
      severity: 1,
      message: 'Syntax issue',
      source: 'sqls'
    }

    expect(toCodeMirrorDiagnostic(state, diagnostic)).toEqual({
      from: 0,
      to: 6,
      severity: 'error',
      message: 'Syntax issue',
      source: 'sqls'
    })
  })
})
