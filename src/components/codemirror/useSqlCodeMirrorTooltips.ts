import type { Ref } from 'vue'
import { EditorView } from '@codemirror/view'
import {
  clamp,
  fromLspPosition,
  toLspPosition
} from '@/components/codemirror/sqlCodeMirrorLspUtils'
import {
  getWordRangeAtPosition,
  renderHoverTooltipContent,
  toHoverText
} from '@/components/codemirror/sqlCodeMirrorHoverUtils'
import type {
  LspHoverResult,
  LspLocation,
  LspLocationLink,
  LspSignatureHelpResult
} from '@/components/codemirror/sqlCodeMirrorTypes'

const LSP_TRIGGER_KIND_INVOKED = 1
const LSP_TRIGGER_KIND_TRIGGER_CHARACTER = 2
const HOVER_REQUEST_DELAY_MS = 150
const HOVER_HIDE_DELAY_MS = 200
const MAX_HOVER_TEXT_CHARS = 4_000
const SIGNATURE_HIDE_DELAY_MS = 6_000

interface UseSqlCodeMirrorTooltipsOptions {
  editorHost: Ref<HTMLElement | null>
  shouldEnableLsp: Ref<boolean>
  lspReady: Ref<boolean>
  readOnly: Ref<boolean>
  textDocumentUri: string
  sendLspRequest: (method: string, params?: unknown) => Promise<unknown>
  flushPendingDidChangeNotification: () => void
  onGoToDefinitionAtPosition: (pos: number) => void
}

export function useSqlCodeMirrorTooltips(options: UseSqlCodeMirrorTooltipsOptions) {
  let hoverTimer: ReturnType<typeof setTimeout> | null = null
  let hoverHideTimer: ReturnType<typeof setTimeout> | null = null
  let hoverRequestToken = 0
  let hoverTooltipEl: HTMLDivElement | null = null
  let hoverActiveKey = ''
  let hoverTooltipHovered = false
  let hoverMouseOverListener: ((event: MouseEvent) => void) | null = null
  let hoverMouseLeaveListener: (() => void) | null = null
  let hoverMouseDownListener: (() => void) | null = null
  let definitionMouseDownListener: ((event: MouseEvent) => void) | null = null
  let signatureTooltipEl: HTMLDivElement | null = null
  let signatureHideTimer: ReturnType<typeof setTimeout> | null = null

  function clearHoverTimer() {
    if (!hoverTimer) {
      return
    }
    clearTimeout(hoverTimer)
    hoverTimer = null
  }

  function clearHoverHideTimer() {
    if (!hoverHideTimer) {
      return
    }
    clearTimeout(hoverHideTimer)
    hoverHideTimer = null
  }

  function scheduleHideHoverTooltip() {
    clearHoverTimer()
    clearHoverHideTimer()
    hoverHideTimer = setTimeout(() => {
      hoverHideTimer = null
      if (hoverTooltipHovered) {
        return
      }
      hideHoverTooltip()
    }, HOVER_HIDE_DELAY_MS)
  }

  function clearSignatureHideTimer() {
    if (!signatureHideTimer) {
      return
    }
    clearTimeout(signatureHideTimer)
    signatureHideTimer = null
  }

  function hideHoverTooltip(resetKey = true) {
    clearHoverTimer()
    clearHoverHideTimer()
    hoverRequestToken += 1
    if (resetKey) {
      hoverActiveKey = ''
    }
    hoverTooltipHovered = false
    if (!hoverTooltipEl) {
      return
    }
    hoverTooltipEl.remove()
    hoverTooltipEl = null
  }

  function hideSignatureTooltip() {
    clearSignatureHideTimer()
    if (!signatureTooltipEl) {
      return
    }
    signatureTooltipEl.remove()
    signatureTooltipEl = null
  }

  function ensureHoverTooltipElement(): HTMLDivElement | null {
    const container = options.editorHost.value?.parentElement
    if (!container) {
      return null
    }

    if (!hoverTooltipEl) {
      const el = document.createElement('div')
      el.className = 'sql-hover-tooltip-floating'
      el.addEventListener('mouseenter', () => {
        hoverTooltipHovered = true
        clearHoverHideTimer()
      })
      el.addEventListener('mouseleave', () => {
        hoverTooltipHovered = false
        scheduleHideHoverTooltip()
      })
      container.appendChild(el)
      hoverTooltipEl = el
    } else if (hoverTooltipEl.parentElement !== container) {
      hoverTooltipEl.remove()
      container.appendChild(hoverTooltipEl)
    }

    return hoverTooltipEl
  }

  function positionHoverTooltip(el: HTMLDivElement, view: EditorView, from: number, to: number) {
    const container = options.editorHost.value?.parentElement
    if (!container) {
      return
    }

    const anchor = view.coordsAtPos(from) || view.coordsAtPos(to)
    if (!anchor) {
      return
    }

    const containerRect = container.getBoundingClientRect()
    el.style.left = '0px'
    el.style.top = '0px'
    el.style.visibility = 'hidden'
    el.style.display = 'block'

    const margin = 8
    const preferredLeft = anchor.left - containerRect.left
    const preferredTop = anchor.bottom - containerRect.top + margin

    const maxLeft = Math.max(margin, container.clientWidth - el.offsetWidth - margin)
    let left = clamp(preferredLeft, margin, maxLeft)

    let top = preferredTop
    if (top + el.offsetHeight + margin > container.clientHeight) {
      top = Math.max(margin, anchor.top - containerRect.top - el.offsetHeight - margin)
    }

    if (left + el.offsetWidth + margin > container.clientWidth) {
      left = Math.max(margin, container.clientWidth - el.offsetWidth - margin)
    }

    el.style.left = `${left}px`
    el.style.top = `${top}px`
    el.style.visibility = 'visible'
  }

  function showHoverTooltip(
    text: string,
    view: EditorView,
    from: number,
    to: number,
    hoveredToken?: string
  ) {
    const el = ensureHoverTooltipElement()
    if (!el) {
      return
    }
    hoverTooltipHovered = false
    clearHoverHideTimer()
    renderHoverTooltipContent(el, text, { hoveredToken })
    positionHoverTooltip(el, view, from, to)
  }

  function ensureSignatureTooltipElement(): HTMLDivElement | null {
    const container = options.editorHost.value?.parentElement
    if (!container) {
      return null
    }

    if (!signatureTooltipEl) {
      const el = document.createElement('div')
      el.className = 'sql-signature-tooltip-floating'
      container.appendChild(el)
      signatureTooltipEl = el
    } else if (signatureTooltipEl.parentElement !== container) {
      signatureTooltipEl.remove()
      container.appendChild(signatureTooltipEl)
    }

    return signatureTooltipEl
  }

  function positionSignatureTooltip(el: HTMLDivElement, view: EditorView, pos: number) {
    const container = options.editorHost.value?.parentElement
    if (!container) {
      return
    }

    const anchor = view.coordsAtPos(pos)
    if (!anchor) {
      return
    }

    const containerRect = container.getBoundingClientRect()
    const margin = 8
    const preferredLeft = anchor.left - containerRect.left
    const preferredTop = anchor.bottom - containerRect.top + margin

    el.style.left = '0px'
    el.style.top = '0px'
    el.style.visibility = 'hidden'
    el.style.display = 'block'

    const maxLeft = Math.max(margin, container.clientWidth - el.offsetWidth - margin)
    let left = clamp(preferredLeft, margin, maxLeft)

    let top = preferredTop
    if (top + el.offsetHeight + margin > container.clientHeight) {
      top = Math.max(margin, anchor.top - containerRect.top - el.offsetHeight - margin)
    }
    if (left + el.offsetWidth + margin > container.clientWidth) {
      left = Math.max(margin, container.clientWidth - el.offsetWidth - margin)
    }

    el.style.left = `${left}px`
    el.style.top = `${top}px`
    el.style.visibility = 'visible'
  }

  function toPlainLspText(value: unknown, maxChars = 240): string {
    if (!value) {
      return ''
    }
    if (typeof value === 'string') {
      return value.slice(0, maxChars)
    }
    if (typeof value === 'object') {
      const markupValue = (value as { value?: unknown }).value
      if (typeof markupValue === 'string') {
        return markupValue.slice(0, maxChars)
      }
    }
    return ''
  }

  function createSignatureLabelNode(
    signatureLabel: string,
    activeParameterLabel?: string | [number, number]
  ): HTMLDivElement {
    const labelEl = document.createElement('div')
    labelEl.className = 'sql-signature-tooltip-label'

    const appendText = (text: string) => {
      if (!text) {
        return
      }
      labelEl.appendChild(document.createTextNode(text))
    }

    if (Array.isArray(activeParameterLabel) && activeParameterLabel.length === 2) {
      const from = clamp(activeParameterLabel[0], 0, signatureLabel.length)
      const to = clamp(activeParameterLabel[1], from, signatureLabel.length)
      appendText(signatureLabel.slice(0, from))
      const activeParamEl = document.createElement('span')
      activeParamEl.className = 'sql-signature-tooltip-param'
      activeParamEl.textContent = signatureLabel.slice(from, to)
      labelEl.appendChild(activeParamEl)
      appendText(signatureLabel.slice(to))
      return labelEl
    }

    if (typeof activeParameterLabel === 'string' && activeParameterLabel) {
      const index = signatureLabel.indexOf(activeParameterLabel)
      if (index >= 0) {
        appendText(signatureLabel.slice(0, index))
        const activeParamEl = document.createElement('span')
        activeParamEl.className = 'sql-signature-tooltip-param'
        activeParamEl.textContent = activeParameterLabel
        labelEl.appendChild(activeParamEl)
        appendText(signatureLabel.slice(index + activeParameterLabel.length))
        return labelEl
      }
    }

    labelEl.textContent = signatureLabel
    return labelEl
  }

  function renderSignatureTooltipContent(el: HTMLDivElement, result: LspSignatureHelpResult) {
    el.textContent = ''

    const signatures = Array.isArray(result.signatures) ? result.signatures : []
    if (!signatures.length) {
      return
    }

    const activeSignatureIndex = clamp(result.activeSignature ?? 0, 0, signatures.length - 1)
    const activeSignature = signatures[activeSignatureIndex]
    const signatureLabel = activeSignature?.label?.trim() || ''
    if (!signatureLabel) {
      return
    }

    const wrapper = document.createElement('div')
    wrapper.className = 'sql-signature-tooltip-content'

    const activeParameterIndex = clamp(
      result.activeParameter ?? 0,
      0,
      Math.max((activeSignature.parameters?.length ?? 1) - 1, 0)
    )
    const activeParameter = activeSignature.parameters?.[activeParameterIndex]
    wrapper.appendChild(createSignatureLabelNode(signatureLabel, activeParameter?.label))

    const signatureDoc = toPlainLspText(activeSignature.documentation, 360).trim()
    const parameterDoc = toPlainLspText(activeParameter?.documentation, 240).trim()
    const docText = parameterDoc || signatureDoc
    if (docText) {
      const docEl = document.createElement('div')
      docEl.className = 'sql-signature-tooltip-doc'
      docEl.textContent = docText
      wrapper.appendChild(docEl)
    }

    el.appendChild(wrapper)
  }

  function showSignatureTooltip(result: LspSignatureHelpResult, view: EditorView, pos: number) {
    const el = ensureSignatureTooltipElement()
    if (!el) {
      return
    }

    renderSignatureTooltipContent(el, result)
    if (!el.textContent) {
      hideSignatureTooltip()
      return
    }
    positionSignatureTooltip(el, view, pos)
  }

  async function requestHoverAtPosition(view: EditorView, pos: number, hoverKey: string) {
    const token = ++hoverRequestToken
    options.flushPendingDidChangeNotification()
    const fallbackRange = getWordRangeAtPosition(view.state, pos)

    const response = await options
      .sendLspRequest('textDocument/hover', {
        textDocument: { uri: options.textDocumentUri },
        position: toLspPosition(view.state, pos)
      })
      .catch(() => null)

    if (token !== hoverRequestToken || hoverKey !== hoverActiveKey) {
      return
    }

    const hover = response as LspHoverResult | null
    const text = toHoverText(hover?.contents, MAX_HOVER_TEXT_CHARS)
    if (!text) {
      hideHoverTooltip(false)
      return
    }

    const start = hover?.range?.start
      ? fromLspPosition(view.state, hover.range.start)
      : (fallbackRange?.from ?? pos)
    const end = hover?.range?.end
      ? fromLspPosition(view.state, hover.range.end)
      : (fallbackRange?.to ?? pos)
    showHoverTooltip(text, view, Math.min(start, end), Math.max(start, end), fallbackRange?.text)
  }

  async function requestSignatureHelpAtPosition(
    view: EditorView,
    pos: number,
    triggerCharacter?: string,
    explicit = false
  ) {
    if (!options.shouldEnableLsp.value || !options.lspReady.value || options.readOnly.value) {
      hideSignatureTooltip()
      return false
    }

    options.flushPendingDidChangeNotification()
    const triggerKind = explicit ? LSP_TRIGGER_KIND_INVOKED : LSP_TRIGGER_KIND_TRIGGER_CHARACTER
    const response = await options
      .sendLspRequest('textDocument/signatureHelp', {
        textDocument: { uri: options.textDocumentUri },
        position: toLspPosition(view.state, pos),
        context: triggerCharacter
          ? {
              triggerKind,
              triggerCharacter
            }
          : {
              triggerKind: LSP_TRIGGER_KIND_INVOKED
            }
      })
      .catch(() => null)

    const signatureHelp = response as LspSignatureHelpResult | null
    if (!signatureHelp?.signatures?.length) {
      hideSignatureTooltip()
      return false
    }

    hideHoverTooltip(false)
    showSignatureTooltip(signatureHelp, view, pos)
    clearSignatureHideTimer()
    signatureHideTimer = setTimeout(() => {
      hideSignatureTooltip()
    }, SIGNATURE_HIDE_DELAY_MS)
    return true
  }

  function normalizeDefinitionTarget(
    response: unknown
  ): { uri: string; range: NonNullable<LspLocation['range']> } | null {
    if (!response) {
      return null
    }

    const first = Array.isArray(response) ? response[0] : response
    if (!first || typeof first !== 'object') {
      return null
    }

    const link = first as LspLocationLink
    const location = first as LspLocation

    if (typeof link.targetUri === 'string' && (link.targetSelectionRange || link.targetRange)) {
      return {
        uri: link.targetUri,
        range: (link.targetSelectionRange || link.targetRange) as NonNullable<LspLocation['range']>
      }
    }

    if (typeof location.uri === 'string' && location.range) {
      return {
        uri: location.uri,
        range: location.range as NonNullable<LspLocation['range']>
      }
    }

    return null
  }

  function handleHoverMouseMove(event: MouseEvent, view: EditorView): boolean {
    if (!options.shouldEnableLsp.value || !options.lspReady.value || options.readOnly.value) {
      hideHoverTooltip()
      return false
    }
    clearHoverHideTimer()
    if (event.buttons !== 0) {
      clearHoverTimer()
      return false
    }

    let pos: number | null = null
    const target = event.target
    if (target instanceof Node && view.dom.contains(target)) {
      try {
        pos = view.posAtDOM(target, 0)
      } catch {
        pos = null
      }
    }
    if (pos === null) {
      pos = view.posAtCoords({ x: event.clientX, y: event.clientY })
    }
    if (pos === null) {
      hideHoverTooltip()
      return false
    }

    const wordRange = getWordRangeAtPosition(view.state, pos)
    if (!wordRange) {
      hideHoverTooltip()
      return false
    }

    const hoverKey = `${wordRange.from}:${wordRange.to}:${wordRange.text}`
    if (hoverKey === hoverActiveKey) {
      if (hoverTimer || hoverTooltipEl) {
        return false
      }
    }

    hoverActiveKey = hoverKey
    clearHoverTimer()
    hoverTimer = setTimeout(() => {
      hoverTimer = null
      void requestHoverAtPosition(view, pos, hoverKey)
    }, HOVER_REQUEST_DELAY_MS)

    return false
  }

  function detachHoverDomListeners(view: EditorView | null) {
    if (!view) {
      return
    }

    if (hoverMouseOverListener) {
      view.dom.removeEventListener('mouseover', hoverMouseOverListener)
      hoverMouseOverListener = null
    }
    if (hoverMouseLeaveListener) {
      view.dom.removeEventListener('mouseleave', hoverMouseLeaveListener)
      hoverMouseLeaveListener = null
    }
    if (hoverMouseDownListener) {
      view.dom.removeEventListener('mousedown', hoverMouseDownListener)
      hoverMouseDownListener = null
    }
    if (definitionMouseDownListener) {
      view.dom.removeEventListener('mousedown', definitionMouseDownListener)
      definitionMouseDownListener = null
    }
  }

  function attachHoverDomListeners(view: EditorView) {
    detachHoverDomListeners(view)

    hoverMouseOverListener = (event: MouseEvent) => {
      clearHoverHideTimer()
      void handleHoverMouseMove(event, view)
    }

    hoverMouseLeaveListener = () => {
      scheduleHideHoverTooltip()
      hideSignatureTooltip()
    }

    hoverMouseDownListener = () => {
      hideHoverTooltip()
      hideSignatureTooltip()
    }

    definitionMouseDownListener = (event: MouseEvent) => {
      if (event.button !== 0 || !(event.metaKey || event.ctrlKey)) {
        return
      }
      if (!options.shouldEnableLsp.value || !options.lspReady.value) {
        return
      }

      const pos = view.posAtCoords({ x: event.clientX, y: event.clientY })
      if (pos === null) {
        return
      }

      event.preventDefault()
      event.stopPropagation()
      options.onGoToDefinitionAtPosition(pos)
    }

    view.dom.addEventListener('mouseover', hoverMouseOverListener, { passive: true })
    view.dom.addEventListener('mouseleave', hoverMouseLeaveListener)
    view.dom.addEventListener('mousedown', hoverMouseDownListener)
    view.dom.addEventListener('mousedown', definitionMouseDownListener)
  }

  function dispose(view: EditorView | null) {
    hideHoverTooltip()
    hideSignatureTooltip()
    detachHoverDomListeners(view)
  }

  return {
    hideHoverTooltip,
    hideSignatureTooltip,
    requestSignatureHelpAtPosition,
    attachHoverDomListeners,
    detachHoverDomListeners,
    normalizeDefinitionTarget,
    dispose
  }
}
