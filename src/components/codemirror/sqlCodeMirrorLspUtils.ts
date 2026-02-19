import type { Diagnostic } from '@codemirror/lint'
import type {
  EditorStateLike,
  LspCompletionContext,
  LspCompletionItem,
  LspCompletionList,
  LspDiagnostic,
  LspPosition
} from './sqlCodeMirrorTypes'

export function normalizeCompletionItems(
  response: LspCompletionItem[] | LspCompletionList | null | undefined
) {
  if (!response) {
    return []
  }
  if (Array.isArray(response)) {
    return response
  }
  return Array.isArray(response.items) ? response.items : []
}

export function mapCompletionType(kind: number | undefined): string {
  switch (kind) {
    case 2:
    case 3:
      return 'function'
    case 5:
    case 6:
    case 10:
      return 'variable'
    case 17:
      return 'keyword'
    case 22:
      return 'snippet'
    default:
      return 'text'
  }
}

export function buildLspCompletionContext(
  prevChar: string,
  explicit: boolean,
  triggerKindInvoked: number,
  triggerKindTriggerCharacter: number
): LspCompletionContext | undefined {
  if (prevChar === '.' || prevChar === '"' || prevChar === '`') {
    return {
      triggerKind: triggerKindTriggerCharacter,
      triggerCharacter: prevChar
    }
  }

  if (explicit) {
    return { triggerKind: triggerKindInvoked }
  }

  return undefined
}

export function getCompletionBoost(label: string, prefix: string): number {
  if (!prefix) {
    return 0
  }

  const normalizedLabel = label.toLowerCase()
  const normalizedPrefix = prefix.toLowerCase()
  if (normalizedLabel.startsWith(normalizedPrefix)) {
    return 100
  }
  if (normalizedLabel.includes(normalizedPrefix)) {
    return 25
  }
  return 0
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

export function toLspPosition(state: EditorStateLike, position: number): LspPosition {
  const line = state.doc.lineAt(position)
  return {
    line: Math.max(line.number - 1, 0),
    character: Math.max(position - line.from, 0)
  }
}

export function fromLspPosition(state: EditorStateLike, pos: LspPosition): number {
  const safeLine = clamp(pos.line + 1, 1, Math.max(state.doc.lines, 1))
  const line = state.doc.line(safeLine)
  const safeCharacter = clamp(pos.character, 0, line.length)
  return line.from + safeCharacter
}

function mapLspSeverity(severity: number | undefined): Diagnostic['severity'] {
  switch (severity) {
    case 1:
      return 'error'
    case 2:
      return 'warning'
    default:
      return 'info'
  }
}

export function toCodeMirrorDiagnostic(
  state: EditorStateLike,
  diagnostic: LspDiagnostic
): Diagnostic | null {
  if (!diagnostic.range?.start || !diagnostic.range?.end || !diagnostic.message) {
    return null
  }

  const from = fromLspPosition(state, diagnostic.range.start)
  const to = Math.max(from, fromLspPosition(state, diagnostic.range.end))

  return {
    from,
    to,
    severity: mapLspSeverity(diagnostic.severity),
    message: diagnostic.message,
    source: diagnostic.source
  }
}
