import { HighlightStyle, syntaxHighlighting } from '@codemirror/language'
import { EditorView } from '@codemirror/view'
import { tags as t } from '@lezer/highlight'

// oneDark palette — keywords/operators cyan, strings coral, identifiers ivory
const cyan = '#4F8FC2'
const coral = '#e06c75'
const chalky = '#86efac'
const whiskey = '#d19a66'
const malibu = '#61afef'
const ivory = '#abb2bf'
const stone = '#7d8799'

const sqlDarkHighlight = HighlightStyle.define([
  { tag: [t.keyword, t.operatorKeyword], color: cyan },
  { tag: [t.name, t.deleted, t.character, t.propertyName, t.macroName], color: ivory },
  { tag: [t.function(t.variableName), t.labelName], color: malibu },
  { tag: [t.color, t.constant(t.name), t.standard(t.name)], color: whiskey },
  { tag: [t.definition(t.name), t.separator], color: ivory },
  {
    tag: [
      t.typeName,
      t.className,
      t.number,
      t.changed,
      t.annotation,
      t.modifier,
      t.self,
      t.namespace
    ],
    color: chalky
  },
  { tag: [t.operator, t.url, t.escape, t.regexp, t.link, t.special(t.string)], color: cyan },
  { tag: [t.meta, t.comment], color: stone },
  { tag: [t.atom, t.bool, t.special(t.variableName)], color: whiskey },
  { tag: [t.processingInstruction, t.string, t.inserted], color: coral }
])

// Light theme: same token structure, light-adapted colors
const sqlLightHighlight = HighlightStyle.define([
  { tag: [t.keyword, t.operatorKeyword], color: '#3a7d44' },
  { tag: [t.name, t.deleted, t.character, t.propertyName, t.macroName], color: '#334155' },
  { tag: [t.function(t.variableName), t.labelName], color: '#0550ae' },
  { tag: [t.color, t.constant(t.name), t.standard(t.name)], color: '#953800' },
  { tag: [t.definition(t.name), t.separator], color: '#1f2328' },
  {
    tag: [
      t.typeName,
      t.className,
      t.number,
      t.changed,
      t.annotation,
      t.modifier,
      t.self,
      t.namespace
    ],
    color: '#6e4e00'
  },
  { tag: [t.operator, t.url, t.escape, t.regexp, t.link, t.special(t.string)], color: '#0F7C94' },
  { tag: [t.meta, t.comment], color: '#6e7781' },
  { tag: [t.atom, t.bool, t.special(t.variableName)], color: '#953800' },
  { tag: [t.processingInstruction, t.string, t.inserted], color: '#0a3069' }
])

// ---------- Search-panel UI theme (injected via CM's style system) ----------

const searchPanelBase = {
  '.cm-panel.cm-search input[type="text"]': {
    borderRadius: '7px',
    outline: 'none',
    fontFamily: "'JetBrains Mono','Fira Code','SFMono-Regular',ui-monospace,Menlo,monospace",
    fontSize: '12px',
    transition: 'border-color .15s, box-shadow .15s'
  },
  '.cm-panel.cm-search input[type="text"]:focus': {
    borderColor: 'rgba(139,92,246,.7)',
    boxShadow: '0 0 0 2px rgba(139,92,246,.18)'
  }
}

const sqlDarkSearchTheme = EditorView.theme(
  {
    ...searchPanelBase,
    '.cm-panels': {
      backgroundColor: 'var(--color-gray-850, #1a1f2e)',
      color: '#e5e7eb'
    },
    '.cm-panel.cm-search input[type="text"]': {
      ...searchPanelBase['.cm-panel.cm-search input[type="text"]'],
      backgroundColor: '#1e293b',
      color: '#e5e7eb',
      border: '1px solid rgba(148,163,184,.25)',
      colorScheme: 'dark'
    },
    '.cm-panel.cm-search .cm-button': {
      backgroundColor: 'rgba(255,255,255,.08)',
      color: '#e5e7eb',
      border: '1px solid rgba(148,163,184,.28)',
      borderRadius: '7px',
      cursor: 'pointer'
    },
    '.cm-panel.cm-search .cm-button:hover': {
      backgroundColor: 'rgba(20,184,166,.18)',
      borderColor: 'rgba(20,184,166,.4)'
    },
    '.cm-panel.cm-search label': {
      color: '#9ca3af'
    }
  },
  { dark: true }
)

const sqlLightSearchTheme = EditorView.theme(
  {
    ...searchPanelBase,
    '.cm-panels': {
      backgroundColor: '#ffffff',
      color: '#0f172a'
    },
    '.cm-panel.cm-search input[type="text"]': {
      ...searchPanelBase['.cm-panel.cm-search input[type="text"]'],
      backgroundColor: '#ffffff',
      color: '#0f172a',
      border: '1px solid rgba(148,163,184,.35)'
    },
    '.cm-panel.cm-search .cm-button': {
      backgroundColor: 'rgba(0,0,0,.05)',
      color: '#0f172a',
      border: '1px solid rgba(148,163,184,.35)',
      borderRadius: '7px',
      cursor: 'pointer'
    },
    '.cm-panel.cm-search .cm-button:hover': {
      backgroundColor: 'rgba(20,184,166,.12)',
      borderColor: 'rgba(20,184,166,.4)'
    },
    '.cm-panel.cm-search label': {
      color: '#94a3b8'
    }
  },
  { dark: false }
)

export const sqlDarkThemeExtension = [syntaxHighlighting(sqlDarkHighlight), sqlDarkSearchTheme]
export const sqlLightThemeExtension = [syntaxHighlighting(sqlLightHighlight), sqlLightSearchTheme]
