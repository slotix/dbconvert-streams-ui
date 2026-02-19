export interface LspPosition {
  line: number
  character: number
}

export interface LspCompletionItem {
  label?: string
  kind?: number
  detail?: string
  insertText?: string
  textEdit?: {
    newText?: string
  }
}

export interface LspCompletionList {
  items?: LspCompletionItem[]
}

export interface LspCompletionContext {
  triggerKind: number
  triggerCharacter?: string
}

export interface LspRange {
  start?: LspPosition
  end?: LspPosition
}

export interface LspDiagnostic {
  range?: LspRange
  severity?: number
  message?: string
  source?: string
}

export interface LspPublishDiagnosticsParams {
  uri?: string
  diagnostics?: LspDiagnostic[]
}

export interface LspMarkedStringObject {
  language?: string
  value?: string
}

export interface LspMarkupContent {
  kind?: string
  value?: string
}

export type LspHoverContents =
  | string
  | LspMarkedStringObject
  | LspMarkupContent
  | Array<string | LspMarkedStringObject>

export interface LspHoverResult {
  contents?: LspHoverContents
  range?: LspRange
}

export interface EditorDocLineLike {
  number: number
  from: number
  to: number
  length: number
}

export interface EditorDocLike {
  length: number
  lines: number
  lineAt: (pos: number) => EditorDocLineLike
  line: (n: number) => EditorDocLineLike
  sliceString: (from: number, to: number) => string
}

export interface EditorSelectionMainLike {
  empty: boolean
  from: number
  to: number
}

export interface EditorStateLike {
  doc: EditorDocLike
  selection: {
    main: EditorSelectionMainLike
  }
}

export interface JsonRpcResponse {
  id?: number | string
  result?: unknown
  error?: {
    code: number
    message: string
  }
}

export interface JsonRpcNotification {
  method?: string
  params?: unknown
}

export interface PendingRequest {
  resolve: (value: unknown) => void
  reject: (error: Error) => void
  timeoutId: ReturnType<typeof setTimeout>
}
