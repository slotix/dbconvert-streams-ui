import { ref } from 'vue'
import type { EditorView } from '@codemirror/view'
import { redo, redoDepth, undo, undoDepth } from '@codemirror/commands'
import type { CodeMirrorMenuAction } from './codeMirrorContextMenuConfig'

interface UseCodeMirrorContextMenuOptions {
  getEditorView: () => EditorView | null
  isReadOnly: () => boolean
  canFormat: () => boolean
  onFormat: () => void | boolean | Promise<void | boolean>
}

export function useCodeMirrorContextMenu(options: UseCodeMirrorContextMenuOptions) {
  const contextMenuVisible = ref(false)
  const contextMenuX = ref(0)
  const contextMenuY = ref(0)
  const contextMenuCanUndo = ref(false)
  const contextMenuCanRedo = ref(false)
  const contextMenuCanCut = ref(false)
  const contextMenuCanCopy = ref(false)
  const contextMenuCanPaste = ref(!options.isReadOnly())
  const contextMenuCanDelete = ref(false)
  const contextMenuCanFormat = ref(options.canFormat())
  const contextMenuCanSelectAll = ref(false)

  let editorContextMenuListener: ((event: MouseEvent) => void) | null = null

  function closeContextMenu() {
    contextMenuVisible.value = false
  }

  function syncContextMenuCapabilities(view?: EditorView | null) {
    const currentView = view ?? options.getEditorView()
    if (!currentView) {
      return
    }

    const hasSelection = !currentView.state.selection.main.empty
    const isReadOnly = options.isReadOnly()
    contextMenuCanUndo.value = undoDepth(currentView.state) > 0
    contextMenuCanRedo.value = redoDepth(currentView.state) > 0
    contextMenuCanCut.value = hasSelection && !isReadOnly
    contextMenuCanCopy.value = hasSelection
    contextMenuCanPaste.value = !isReadOnly
    contextMenuCanDelete.value = hasSelection && !isReadOnly
    contextMenuCanFormat.value = options.canFormat()
    contextMenuCanSelectAll.value = currentView.state.doc.length > 0
  }

  function getSelectedText(view: EditorView): string {
    const selection = view.state.selection.main
    if (selection.empty) {
      return ''
    }
    return view.state.doc.sliceString(selection.from, selection.to)
  }

  function fallbackWriteClipboardText(text: string): boolean {
    if (typeof document === 'undefined') {
      return false
    }

    const textarea = document.createElement('textarea')
    textarea.value = text
    textarea.setAttribute('readonly', 'true')
    textarea.style.position = 'fixed'
    textarea.style.left = '-9999px'
    document.body.appendChild(textarea)
    textarea.select()

    let copied = false
    try {
      copied = document.execCommand('copy')
    } catch {
      copied = false
    }
    document.body.removeChild(textarea)
    return copied
  }

  async function copySelectionToClipboard(view: EditorView): Promise<boolean> {
    const text = getSelectedText(view)
    if (!text) {
      return false
    }

    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(text)
        return true
      }
    } catch {
      // Fall back to legacy copy path.
    }

    return fallbackWriteClipboardText(text)
  }

  async function cutSelection(view: EditorView): Promise<void> {
    if (options.isReadOnly() || view.state.selection.main.empty) {
      return
    }

    const selection = view.state.selection.main
    const copied = await copySelectionToClipboard(view)
    if (!copied) {
      return
    }

    view.dispatch({
      changes: {
        from: selection.from,
        to: selection.to,
        insert: ''
      },
      selection: { anchor: selection.from }
    })
    view.focus()
  }

  function deleteSelection(view: EditorView) {
    if (options.isReadOnly() || view.state.selection.main.empty) {
      return
    }

    const selection = view.state.selection.main
    view.dispatch({
      changes: {
        from: selection.from,
        to: selection.to,
        insert: ''
      },
      selection: { anchor: selection.from }
    })
    view.focus()
  }

  async function pasteFromClipboard(view: EditorView): Promise<void> {
    if (options.isReadOnly()) {
      return
    }

    let pastedText = ''
    try {
      if (navigator?.clipboard?.readText) {
        pastedText = await navigator.clipboard.readText()
      }
    } catch {
      pastedText = ''
    }

    if (!pastedText) {
      return
    }

    const selection = view.state.selection.main
    const anchor = selection.from + pastedText.length
    view.dispatch({
      changes: {
        from: selection.from,
        to: selection.to,
        insert: pastedText
      },
      selection: { anchor }
    })
    view.focus()
  }

  function selectAll(view: EditorView) {
    view.dispatch({
      selection: {
        anchor: 0,
        head: view.state.doc.length
      }
    })
    view.focus()
  }

  function handleUndoShortcut(view: EditorView) {
    return undo(view)
  }

  function handleRedoShortcut(view: EditorView) {
    return redo(view)
  }

  async function handleContextMenuAction(action: CodeMirrorMenuAction) {
    const view = options.getEditorView()
    if (!view) {
      return
    }

    switch (action) {
      case 'undo':
        handleUndoShortcut(view)
        break
      case 'redo':
        handleRedoShortcut(view)
        break
      case 'cut':
        await cutSelection(view)
        break
      case 'copy':
        await copySelectionToClipboard(view)
        view.focus()
        break
      case 'paste':
        await pasteFromClipboard(view)
        break
      case 'delete':
        deleteSelection(view)
        break
      case 'select-all':
        selectAll(view)
        break
      case 'format':
        if (options.canFormat()) {
          await options.onFormat()
        }
        break
      default:
        break
    }
  }

  function detachEditorContextMenuListener(view: EditorView | null) {
    if (!view || !editorContextMenuListener) {
      return
    }
    view.dom.removeEventListener('contextmenu', editorContextMenuListener)
    editorContextMenuListener = null
  }

  function attachEditorContextMenuListener(view: EditorView) {
    detachEditorContextMenuListener(view)

    editorContextMenuListener = (event: MouseEvent) => {
      event.preventDefault()
      event.stopPropagation()

      const pos = view.posAtCoords({ x: event.clientX, y: event.clientY })
      if (pos !== null && view.state.selection.main.empty) {
        view.dispatch({ selection: { anchor: pos } })
      }

      syncContextMenuCapabilities(view)
      contextMenuX.value = event.clientX + 2
      contextMenuY.value = event.clientY + 2
      contextMenuVisible.value = true
      view.focus()
    }

    view.dom.addEventListener('contextmenu', editorContextMenuListener)
  }

  return {
    contextMenuVisible,
    contextMenuX,
    contextMenuY,
    contextMenuCanUndo,
    contextMenuCanRedo,
    contextMenuCanCut,
    contextMenuCanCopy,
    contextMenuCanPaste,
    contextMenuCanDelete,
    contextMenuCanFormat,
    contextMenuCanSelectAll,
    closeContextMenu,
    syncContextMenuCapabilities,
    handleContextMenuAction,
    attachEditorContextMenuListener,
    detachEditorContextMenuListener,
    handleUndoShortcut,
    handleRedoShortcut
  }
}
