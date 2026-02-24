import type { CompletionContext } from '@codemirror/autocomplete'
import type { ViewUpdate } from '@codemirror/view'

function isSimpleTypingEvent(update: ViewUpdate): boolean {
  return update.transactions.some((transaction) => transaction.isUserEvent('input.type'))
}

export function getSingleTypedCharacter(update: ViewUpdate): string | null {
  if (!update.docChanged || !isSimpleTypingEvent(update)) {
    return null
  }

  let insertedText = ''
  let hasNonSimpleInsert = false
  update.changes.iterChanges((fromA, toA, _fromB, _toB, inserted) => {
    if (fromA !== toA) {
      hasNonSimpleInsert = true
      return
    }

    const text = inserted.toString()
    if (text.length !== 1) {
      hasNonSimpleInsert = true
      return
    }

    insertedText += text
  })

  if (hasNonSimpleInsert || insertedText.length !== 1) {
    return null
  }

  return insertedText
}

export function shouldAllowClauseCompletion(
  state: CompletionContext['state'],
  pos: number
): boolean {
  if (pos <= 0) {
    return false
  }

  const beforeCursor = state.sliceDoc(0, pos)
  const tail = beforeCursor.slice(Math.max(0, beforeCursor.length - 200))
  return /\b(from|join|into|update|table)\s+$/i.test(tail)
}

export function getDuckDBReadPathCompletionRange(
  state: CompletionContext['state'],
  pos: number
): { from: number; to: number } | null {
  if (pos <= 0) {
    return null
  }

  const beforeCursor = state.sliceDoc(0, pos)
  const tail = beforeCursor.slice(Math.max(0, beforeCursor.length - 500))
  const match = tail.match(/read_(csv_auto|csv|parquet|json_auto|json)\s*\(\s*['"]([^'"]*)$/i)
  if (!match) {
    return null
  }

  const typedPathPrefix = match[2] || ''
  return {
    from: pos - typedPathPrefix.length,
    to: pos
  }
}

export function getDuckDBReadOptionCompletionRange(
  state: CompletionContext['state'],
  pos: number
): { from: number; to: number } | null {
  if (pos <= 0) {
    return null
  }

  const beforeCursor = state.sliceDoc(0, pos)
  const tail = beforeCursor.slice(Math.max(0, beforeCursor.length - 700))
  const match = tail.match(
    /read_(csv_auto|csv|parquet|json_auto|json)\s*\(\s*['"][^'"]*['"]\s*,\s*([a-zA-Z_]*)$/i
  )
  if (!match) {
    return null
  }

  const typedOptionPrefix = match[2] || ''
  return {
    from: pos - typedOptionPrefix.length,
    to: pos
  }
}

export function getSignatureHelpTriggerCharacter(update: ViewUpdate): string | null {
  const insertedText = getSingleTypedCharacter(update)
  if (insertedText !== '(' && insertedText !== ',') {
    return null
  }
  return insertedText
}

export function shouldTriggerClauseCompletion(
  update: ViewUpdate,
  options: {
    shouldEnableLsp: boolean
    lspReady: boolean
    readOnly: boolean
  }
): boolean {
  if (!update.docChanged || !options.shouldEnableLsp || !options.lspReady || options.readOnly) {
    return false
  }

  if (getSingleTypedCharacter(update) !== ' ') {
    return false
  }

  const cursorPos = update.state.selection.main.to
  return shouldAllowClauseCompletion(update.state, cursorPos)
}

export function shouldTriggerDuckDBReadArgumentCompletion(
  update: ViewUpdate,
  options: {
    shouldEnableLsp: boolean
    lspReady: boolean
    readOnly: boolean
  }
): boolean {
  if (!update.docChanged || !options.shouldEnableLsp || !options.lspReady || options.readOnly) {
    return false
  }

  const insertedText = getSingleTypedCharacter(update)
  if (!insertedText) {
    return false
  }

  if (insertedText !== ',' && insertedText !== ' ' && insertedText !== '=') {
    return false
  }

  const cursorPos = update.state.selection.main.to
  return (
    Boolean(getDuckDBReadPathCompletionRange(update.state, cursorPos)) ||
    Boolean(getDuckDBReadOptionCompletionRange(update.state, cursorPos))
  )
}
