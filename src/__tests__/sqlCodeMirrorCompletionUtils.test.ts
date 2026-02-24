import { describe, expect, it } from 'vitest'
import { EditorState } from '@codemirror/state'
import type { ViewUpdate } from '@codemirror/view'
import {
  getDuckDBReadOptionCompletionRange,
  getDuckDBReadPathCompletionRange,
  getSignatureHelpTriggerCharacter,
  getSingleTypedCharacter,
  shouldAllowClauseCompletion,
  shouldTriggerClauseCompletion,
  shouldTriggerDuckDBReadArgumentCompletion
} from '@/components/codemirror/sqlCodeMirrorCompletionUtils'

interface MockUpdateOptions {
  doc: string
  cursorPos?: number
  insertedText?: string
  fromA?: number
  toA?: number
  docChanged?: boolean
  isTyping?: boolean
}

function createMockUpdate(options: MockUpdateOptions): ViewUpdate {
  const cursorPos = options.cursorPos ?? options.doc.length
  const state = EditorState.create({
    doc: options.doc,
    selection: { anchor: cursorPos }
  })

  const insertedText = options.insertedText ?? ''
  const fromA = options.fromA ?? cursorPos
  const toA = options.toA ?? cursorPos

  return {
    docChanged: options.docChanged ?? true,
    transactions: [
      {
        isUserEvent: (event: string) => (options.isTyping ?? true) && event === 'input.type'
      }
    ],
    changes: {
      iterChanges: (
        callback: (
          fromA: number,
          toA: number,
          fromB: number,
          toB: number,
          inserted: { toString: () => string }
        ) => void
      ) => {
        callback(fromA, toA, fromA, toA, { toString: () => insertedText })
      }
    },
    state
  } as unknown as ViewUpdate
}

describe('sqlCodeMirrorCompletionUtils', () => {
  it('detects clause completion context', () => {
    const state = EditorState.create({ doc: 'SELECT * FROM ' })
    expect(shouldAllowClauseCompletion(state, state.doc.length)).toBe(true)

    const noClause = EditorState.create({ doc: 'SELECT col WHERE ' })
    expect(shouldAllowClauseCompletion(noClause, noClause.doc.length)).toBe(false)
  })

  it('extracts DuckDB argument completion ranges', () => {
    const pathState = EditorState.create({ doc: "SELECT * FROM read_csv('data/" })
    expect(getDuckDBReadPathCompletionRange(pathState, pathState.doc.length)).toEqual({
      from: "SELECT * FROM read_csv('".length,
      to: pathState.doc.length
    })

    const optionState = EditorState.create({ doc: "SELECT * FROM read_csv('data.csv', hea" })
    expect(getDuckDBReadOptionCompletionRange(optionState, optionState.doc.length)).toEqual({
      from: "SELECT * FROM read_csv('data.csv', ".length,
      to: optionState.doc.length
    })
  })

  it('extracts a single typed character from update', () => {
    const simpleInsert = createMockUpdate({ doc: 'SELECT ', insertedText: 'x' })
    expect(getSingleTypedCharacter(simpleInsert)).toBe('x')

    const replacementInsert = createMockUpdate({
      doc: 'SELECT',
      insertedText: 'x',
      fromA: 0,
      toA: 1
    })
    expect(getSingleTypedCharacter(replacementInsert)).toBeNull()
  })

  it('detects signature help trigger characters', () => {
    const openParen = createMockUpdate({ doc: 'sum(', insertedText: '(' })
    const comma = createMockUpdate({ doc: 'sum(a,', insertedText: ',' })
    const letter = createMockUpdate({ doc: 'sum(a', insertedText: 'a' })

    expect(getSignatureHelpTriggerCharacter(openParen)).toBe('(')
    expect(getSignatureHelpTriggerCharacter(comma)).toBe(',')
    expect(getSignatureHelpTriggerCharacter(letter)).toBeNull()
  })

  it('triggers clause completion only for typed space in valid context', () => {
    const update = createMockUpdate({
      doc: 'SELECT * FROM ',
      insertedText: ' '
    })

    expect(
      shouldTriggerClauseCompletion(update, {
        shouldEnableLsp: true,
        lspReady: true,
        readOnly: false
      })
    ).toBe(true)

    expect(
      shouldTriggerClauseCompletion(update, {
        shouldEnableLsp: false,
        lspReady: true,
        readOnly: false
      })
    ).toBe(false)
  })

  it('triggers DuckDB argument completion for comma and space in read_* arguments', () => {
    const commaUpdate = createMockUpdate({
      doc: "SELECT * FROM read_csv('file.csv',",
      insertedText: ','
    })

    const spaceUpdate = createMockUpdate({
      doc: "SELECT * FROM read_csv('file.csv', ",
      insertedText: ' '
    })

    expect(
      shouldTriggerDuckDBReadArgumentCompletion(commaUpdate, {
        shouldEnableLsp: true,
        lspReady: true,
        readOnly: false
      })
    ).toBe(true)

    expect(
      shouldTriggerDuckDBReadArgumentCompletion(spaceUpdate, {
        shouldEnableLsp: true,
        lspReady: true,
        readOnly: false
      })
    ).toBe(true)
  })
})
