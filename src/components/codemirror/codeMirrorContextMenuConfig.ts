export type CodeMirrorMenuAction =
  | 'undo'
  | 'redo'
  | 'cut'
  | 'copy'
  | 'paste'
  | 'delete'
  | 'select-all'
  | 'format'

export type CodeMirrorMenuCapability =
  | 'canUndo'
  | 'canRedo'
  | 'canCut'
  | 'canCopy'
  | 'canPaste'
  | 'canDelete'
  | 'canSelectAll'
  | 'canFormat'

export interface CodeMirrorMenuItemDefinition {
  label: string
  capability: CodeMirrorMenuCapability
  hideWhenDisabled?: boolean
}

export const CODEMIRROR_MENU_LAYOUT: CodeMirrorMenuAction[][] = [
  ['undo', 'redo'],
  ['cut', 'copy', 'paste', 'delete'],
  ['select-all'],
  ['format']
]

export const CODEMIRROR_MENU_DEFINITIONS: Record<
  CodeMirrorMenuAction,
  CodeMirrorMenuItemDefinition
> = {
  undo: {
    label: 'Undo',
    capability: 'canUndo'
  },
  redo: {
    label: 'Redo',
    capability: 'canRedo'
  },
  cut: {
    label: 'Cut',
    capability: 'canCut'
  },
  copy: {
    label: 'Copy',
    capability: 'canCopy'
  },
  paste: {
    label: 'Paste',
    capability: 'canPaste'
  },
  delete: {
    label: 'Delete',
    capability: 'canDelete',
    hideWhenDisabled: true
  },
  'select-all': {
    label: 'Select All',
    capability: 'canSelectAll'
  },
  format: {
    label: 'Format',
    capability: 'canFormat'
  }
}
