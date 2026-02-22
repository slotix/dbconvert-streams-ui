import { HighlightStyle, syntaxHighlighting } from '@codemirror/language'
import { tags as t } from '@lezer/highlight'

// oneDark palette — keywords/operators cyan, strings coral, identifiers ivory
const cyan = '#4F8FC2'
const coral = '#e06c75'
const chalky = '#e5c07b'
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

export const sqlDarkThemeExtension = syntaxHighlighting(sqlDarkHighlight)
export const sqlLightThemeExtension = syntaxHighlighting(sqlLightHighlight)
