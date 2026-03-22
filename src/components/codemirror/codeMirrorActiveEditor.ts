let activeEditorToken: symbol | null = null

export interface CodeMirrorActiveEditorHandle {
  markActive: () => void
  isActive: () => boolean
  clear: () => void
}

export function createCodeMirrorActiveEditorHandle(): CodeMirrorActiveEditorHandle {
  const token = Symbol('codemirror-active-editor')

  return {
    markActive() {
      activeEditorToken = token
    },
    isActive() {
      return activeEditorToken === token
    },
    clear() {
      if (activeEditorToken === token) {
        activeEditorToken = null
      }
    }
  }
}
