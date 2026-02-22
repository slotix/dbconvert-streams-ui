import type { EditorStateLike, LspHoverContents } from './sqlCodeMirrorTypes'

const MAX_SCHEMA_ROWS = 6
const TYPE_TEXT_MAX_CHARS = 30
const META_TEXT_MAX_CHARS = 46

interface HoverMarkdownTable {
  headers: string[]
  rows: string[][]
}

type HoverMarkdownBlock =
  | { type: 'heading'; text: string }
  | { type: 'table'; table: HoverMarkdownTable }
  | { type: 'text'; text: string }

interface HoverSchemaColumn {
  name: string
  type: string
  badges: string[]
  isPinned: boolean
}

interface HoverSchemaCard {
  title: string
  meta: string
  rows: HoverSchemaColumn[]
  hiddenCount: number
}

interface HoverRenderOptions {
  hoveredToken?: string | null
}

function decodeHoverHtmlEntities(value: string): string {
  if (!value.includes('&')) {
    return value
  }

  if (typeof document !== 'undefined') {
    const textarea = document.createElement('textarea')
    textarea.innerHTML = value
    return textarea.value
  }

  return value
    .replaceAll('&nbsp;', ' ')
    .replaceAll('&amp;', '&')
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'")
}

function normalizeHoverText(value: string, maxChars: number): string {
  if (!value) {
    return ''
  }
  const decoded = decodeHoverHtmlEntities(value)
  const normalized = decoded.split('\r\n').join('\n').replaceAll('\u00a0', ' ').trim()
  if (normalized.length <= maxChars) {
    return normalized
  }
  return `${normalized.slice(0, maxChars)}...`
}

export function toHoverText(contents: LspHoverContents | undefined, maxChars: number): string {
  if (!contents) {
    return ''
  }
  if (typeof contents === 'string') {
    return normalizeHoverText(contents, maxChars)
  }
  if (Array.isArray(contents)) {
    return normalizeHoverText(
      contents
        .map((entry) => {
          if (typeof entry === 'string') {
            return entry
          }
          return entry.value || ''
        })
        .filter(Boolean)
        .join('\n\n'),
      maxChars
    )
  }
  if (typeof contents.value === 'string') {
    return normalizeHoverText(contents.value, maxChars)
  }
  return ''
}

function normalizeMarkdownInline(value: string): string {
  let normalized = value.trim()
  if (normalized.startsWith('`') && normalized.endsWith('`') && normalized.length >= 2) {
    normalized = normalized.slice(1, -1)
  }
  return normalized.replaceAll('\\|', '|').replace(/`([^`]+)`/g, '$1')
}

function parseMarkdownTableRow(line: string): string[] {
  let normalized = line.trim()
  if (normalized.startsWith('|')) {
    normalized = normalized.slice(1)
  }
  if (normalized.endsWith('|')) {
    normalized = normalized.slice(0, -1)
  }
  return normalized.split('|').map((cell) => normalizeMarkdownInline(cell.trim()))
}

function isMarkdownTableRow(line: string): boolean {
  return line.includes('|')
}

function isMarkdownTableDivider(line: string): boolean {
  const cells = parseMarkdownTableRow(line)
  if (!cells.length) {
    return false
  }
  return cells.every((cell) => /^:?-{3,}:?$/.test(cell.replaceAll(' ', '')))
}

function parseMarkdownBlocks(text: string): HoverMarkdownBlock[] {
  const lines = text.split('\n')
  const blocks: HoverMarkdownBlock[] = []
  let i = 0

  while (i < lines.length) {
    const trimmed = lines[i].trim()
    if (!trimmed) {
      i += 1
      continue
    }

    const headingMatch = trimmed.match(/^#{1,6}\s+(.+)$/)
    if (headingMatch) {
      blocks.push({
        type: 'heading',
        text: normalizeMarkdownInline(headingMatch[1])
      })
      i += 1
      continue
    }

    if (
      i + 1 < lines.length &&
      isMarkdownTableRow(trimmed) &&
      isMarkdownTableDivider(lines[i + 1])
    ) {
      const headers = parseMarkdownTableRow(trimmed)
      const rows: string[][] = []
      i += 2

      while (i < lines.length) {
        const rowLine = lines[i].trim()
        if (!rowLine || !isMarkdownTableRow(rowLine)) {
          break
        }
        rows.push(parseMarkdownTableRow(rowLine))
        i += 1
      }

      blocks.push({
        type: 'table',
        table: { headers, rows }
      })
      continue
    }

    const paragraph: string[] = []
    while (i < lines.length) {
      const line = lines[i]
      const lineTrimmed = line.trim()
      if (!lineTrimmed) {
        i += 1
        if (paragraph.length) {
          break
        }
        continue
      }

      const nextIsHeading = /^#{1,6}\s+/.test(lineTrimmed)
      const nextIsTable =
        i + 1 < lines.length &&
        isMarkdownTableRow(lineTrimmed) &&
        isMarkdownTableDivider(lines[i + 1])
      if (nextIsHeading || nextIsTable) {
        if (!paragraph.length) {
          break
        }
        break
      }

      paragraph.push(line)
      i += 1
    }

    if (paragraph.length) {
      blocks.push({
        type: 'text',
        text: paragraph.join('\n').trim()
      })
      continue
    }

    i += 1
  }

  return blocks
}

function createHoverTextBlock(text: string): HTMLElement {
  const pre = document.createElement('pre')
  pre.className = 'sql-hover-tooltip-text'
  pre.textContent = text
  return pre
}

function createHoverTableFallbackBlock(tableData: HoverMarkdownTable): HTMLElement {
  const wrapper = document.createElement('div')
  wrapper.className = 'sql-hover-tooltip-table-wrap'

  const pre = document.createElement('pre')
  pre.className = 'sql-hover-tooltip-text'

  const lines: string[] = []
  if (tableData.headers.length) {
    lines.push(tableData.headers.join(' | '))
  }
  for (const row of tableData.rows) {
    lines.push(row.join(' | '))
  }

  pre.textContent = lines.join('\n')
  wrapper.appendChild(pre)
  return wrapper
}

function normalizeHeaderKey(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '')
}

function normalizeTextCell(value: string): string {
  return normalizeMarkdownInline(value).replace(/\s+/g, ' ').trim()
}

function hasMeaningfulValue(value: string): boolean {
  if (!value) {
    return false
  }
  const normalized = value.trim().toLowerCase()
  return (
    normalized !== '-' && normalized !== 'null' && normalized !== 'nil' && normalized !== 'none'
  )
}

function isTruthyValue(value: string): boolean {
  const normalized = value.trim().toLowerCase()
  return normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'y'
}

function isPrimaryKeyValue(value: string): boolean {
  if (!value) {
    return false
  }
  const normalized = value.trim().toLowerCase()
  if (!normalized || normalized === '-' || normalized === '0' || normalized === 'false') {
    return false
  }
  return (
    normalized === 'pri' ||
    normalized === 'pk' ||
    normalized === 'primary' ||
    normalized === 'primary key' ||
    normalized.includes('primary')
  )
}

function isIndexedValue(value: string): boolean {
  if (!value) {
    return false
  }
  const normalized = value.trim().toLowerCase()
  if (!normalized || normalized === '-' || normalized === '0' || normalized === 'false') {
    return false
  }
  return (
    normalized === 'mul' ||
    normalized === 'idx' ||
    normalized === 'uni' ||
    normalized === 'index' ||
    normalized === 'indexed' ||
    normalized.includes('index') ||
    normalized.includes('key')
  )
}

function isNotNullableValue(value: string, headerKey: string): boolean {
  if (!value) {
    return false
  }
  const normalized = value.trim().toLowerCase()
  if (!normalized) {
    return false
  }

  if (headerKey === 'notnull') {
    return isTruthyValue(normalized) || normalized === 'nn'
  }

  return (
    normalized === 'no' ||
    normalized === 'false' ||
    normalized === 'not null' ||
    normalized === 'nn'
  )
}

function compactTypeLabel(value: string): string {
  if (!value) {
    return ''
  }
  const normalized = value.replace(/\s+/g, ' ').trim().toUpperCase()
  if (normalized.length <= TYPE_TEXT_MAX_CHARS) {
    return normalized
  }

  const genericType = normalized.match(/^([A-Z0-9_]+)\(([^)]+)\)(.*)$/)
  if (genericType) {
    const compactPrecision = `${genericType[1]}(${genericType[2]})`
    if (compactPrecision.length <= TYPE_TEXT_MAX_CHARS - 1) {
      return `${compactPrecision}…`
    }
    return `${genericType[1]}…`
  }

  const spacedType = normalized.match(/^([A-Z0-9_]+)\s+/)
  if (spacedType) {
    return `${spacedType[1]}…`
  }

  return `${normalized.slice(0, TYPE_TEXT_MAX_CHARS - 1)}…`
}

function truncateWithEllipsis(value: string, maxChars: number): string {
  if (value.length <= maxChars) {
    return value
  }
  if (maxChars <= 3) {
    return value.slice(0, maxChars)
  }
  return `${value.slice(0, maxChars - 3)}...`
}

function findHeaderIndex(headers: string[], matcher: (key: string) => boolean): number {
  for (let index = 0; index < headers.length; index += 1) {
    if (matcher(normalizeHeaderKey(headers[index]))) {
      return index
    }
  }
  return -1
}

function findFirstHeading(blocks: HoverMarkdownBlock[]): string {
  const headingBlock = blocks.find(
    (block): block is Extract<HoverMarkdownBlock, { type: 'heading' }> => {
      return block.type === 'heading'
    }
  )

  if (headingBlock?.text) {
    return headingBlock.text
  }

  const textBlock = blocks.find((block): block is Extract<HoverMarkdownBlock, { type: 'text' }> => {
    return block.type === 'text'
  })
  if (!textBlock?.text) {
    return 'table'
  }

  const firstLine = textBlock.text.split('\n').find((line) => line.trim())
  return firstLine?.trim() || 'table'
}

function normalizeSchemaTitle(value: string): string {
  const normalized = normalizeTextCell(value)
  const withoutSuffix = normalized.replace(/\s+table$/i, '').trim()
  return withoutSuffix || 'table'
}

function normalizeIdentifierToken(value: string): string {
  if (!value) {
    return ''
  }

  const trimmed = value
    .trim()
    .replace(/^["'`[]+|["'`\]]+$/g, '')
    .replace(/^.*\./, '')
  return trimmed.toLowerCase()
}

function toSchemaBadgeList(
  keyValue: string,
  defaultValue: string,
  extraValue: string,
  nullValue: string,
  nullHeaderKey: string
): string[] {
  const badges: string[] = []

  const normalizedExtra = extraValue.toLowerCase()

  if (isPrimaryKeyValue(keyValue)) {
    badges.push('PK')
  }
  if (normalizedExtra.includes('auto_increment') || normalizedExtra.includes('identity')) {
    badges.push('AI')
  }
  if (!badges.includes('PK') && isIndexedValue(keyValue)) {
    badges.push('IDX')
  }
  if (isNotNullableValue(nullValue, nullHeaderKey)) {
    badges.push('NN')
  }
  if (hasMeaningfulValue(defaultValue)) {
    badges.push('DEF')
  }
  if (normalizedExtra.includes('on update')) {
    badges.push('ONUPD')
  }

  if (badges.includes('DEF') && badges.includes('ONUPD')) {
    return badges.filter((badge) => badge !== 'DEF' && badge !== 'ONUPD').concat('DEF+UPD')
  }

  return badges
}

function maybeBuildSchemaCard(
  blocks: HoverMarkdownBlock[],
  hoveredToken?: string | null
): HoverSchemaCard | null {
  const tableBlock = blocks.find(
    (block): block is Extract<HoverMarkdownBlock, { type: 'table' }> => {
      return block.type === 'table'
    }
  )
  if (!tableBlock) {
    return null
  }

  const headers = tableBlock.table.headers
  if (!headers.length || !tableBlock.table.rows.length) {
    return null
  }

  const nameIndex = findHeaderIndex(
    headers,
    (key) => key === 'name' || key === 'column' || key === 'columnname' || key === 'field'
  )
  const typeIndex = findHeaderIndex(
    headers,
    (key) => key === 'type' || key === 'datatype' || key === 'columntype'
  )
  if (nameIndex < 0 || typeIndex < 0) {
    return null
  }

  const keyIndex = findHeaderIndex(
    headers,
    (key) => key === 'primarykey' || key === 'pk' || key === 'key' || key === 'index'
  )
  const defaultIndex = findHeaderIndex(
    headers,
    (key) => key === 'default' || key === 'defaultvalue'
  )
  const extraIndex = findHeaderIndex(headers, (key) => key === 'extra')
  const nullIndex = findHeaderIndex(
    headers,
    (key) => key === 'null' || key === 'nullable' || key === 'isnullable' || key === 'notnull'
  )

  const schemaSignals = [keyIndex, defaultIndex, extraIndex, nullIndex].filter(
    (index) => index >= 0
  )
  if (!schemaSignals.length && headers.length < 3) {
    return null
  }

  const columns: HoverSchemaColumn[] = []
  const primaryKeyColumns: string[] = []
  const nullHeaderKey = nullIndex >= 0 ? normalizeHeaderKey(headers[nullIndex]) : ''

  for (const rawRow of tableBlock.table.rows) {
    const name = normalizeTextCell(rawRow[nameIndex] || '')
    if (!name) {
      continue
    }

    const type = compactTypeLabel(normalizeTextCell(rawRow[typeIndex] || ''))
    const keyValue = normalizeTextCell(rawRow[keyIndex] || '')
    const defaultValue = normalizeTextCell(rawRow[defaultIndex] || '')
    const extraValue = normalizeTextCell(rawRow[extraIndex] || '')
    const nullValue = normalizeTextCell(rawRow[nullIndex] || '')
    const badges = toSchemaBadgeList(keyValue, defaultValue, extraValue, nullValue, nullHeaderKey)

    if (badges.includes('PK')) {
      primaryKeyColumns.push(name)
    }

    columns.push({
      name,
      type,
      badges,
      isPinned: false
    })
  }

  if (!columns.length) {
    return null
  }

  const title = normalizeSchemaTitle(findFirstHeading(blocks))
  const normalizedHover = normalizeIdentifierToken(hoveredToken || '')
  const normalizedTitle = normalizeIdentifierToken(title)

  if (normalizedHover) {
    const pinnedIndex = columns.findIndex(
      (column) => normalizeIdentifierToken(column.name) === normalizedHover
    )
    if (pinnedIndex >= 0) {
      const [pinned] = columns.splice(pinnedIndex, 1)
      pinned.isPinned = true
      columns.unshift(pinned)
    } else if (normalizedHover === normalizedTitle) {
      const primaryIndex = columns.findIndex((column) => column.badges.includes('PK'))
      if (primaryIndex >= 0) {
        const [primary] = columns.splice(primaryIndex, 1)
        primary.isPinned = true
        columns.unshift(primary)
      }
    }
  }

  const visibleRows = columns.slice(0, MAX_SCHEMA_ROWS)
  const hiddenCount = Math.max(columns.length - visibleRows.length, 0)

  const metaParts = [`${columns.length} ${columns.length === 1 ? 'col' : 'cols'}`]
  if (primaryKeyColumns.length) {
    metaParts.push(`PK: ${truncateWithEllipsis(primaryKeyColumns.join(', '), META_TEXT_MAX_CHARS)}`)
  }

  return {
    title,
    meta: metaParts.join(' · '),
    rows: visibleRows,
    hiddenCount
  }
}

function createTypeNode(typeText: string): HTMLElement {
  const span = document.createElement('span')
  span.className = 'sql-hover-schema-type'
  span.title = typeText

  const hasEllipsis = typeText.endsWith('…')
  const text = hasEllipsis ? typeText.slice(0, -1) : typeText
  const match = text.match(/^([A-Z][A-Z0-9_]*)(\([^)]*\))?(\s+.+)?$/)
  if (!match) {
    span.textContent = typeText
    return span
  }

  const baseEl = document.createElement('span')
  baseEl.className = 'sql-type-keyword'
  baseEl.textContent = match[1]
  span.appendChild(baseEl)

  if (match[2]) {
    const precEl = document.createElement('span')
    precEl.className = 'sql-type-precision'
    precEl.textContent = match[2]
    span.appendChild(precEl)
  }

  if (match[3] || hasEllipsis) {
    const modEl = document.createElement('span')
    modEl.className = 'sql-type-modifier'
    modEl.textContent = (match[3] ?? '') + (hasEllipsis ? '…' : '')
    span.appendChild(modEl)
  }

  return span
}

function createSchemaCardNode(card: HoverSchemaCard): HTMLElement {
  const root = document.createElement('div')
  root.className = 'sql-hover-schema-card'

  const header = document.createElement('div')
  header.className = 'sql-hover-schema-header'
  const headerLine = document.createElement('div')
  headerLine.className = 'sql-hover-schema-header-line'

  const title = document.createElement('div')
  title.className = 'sql-hover-schema-title'
  title.textContent = card.title
  title.title = card.title
  headerLine.appendChild(title)

  if (card.meta) {
    const meta = document.createElement('div')
    meta.className = 'sql-hover-schema-meta'
    meta.textContent = `· ${card.meta}`
    meta.title = card.meta
    headerLine.appendChild(meta)
  }

  header.appendChild(headerLine)
  root.appendChild(header)

  const body = document.createElement('div')
  body.className = 'sql-hover-schema-body'

  for (const row of card.rows) {
    const rowEl = document.createElement('div')
    rowEl.className = row.isPinned
      ? 'sql-hover-schema-row sql-hover-schema-row-active'
      : 'sql-hover-schema-row'

    const top = document.createElement('div')
    top.className = 'sql-hover-schema-top'

    const name = document.createElement('span')
    name.className = 'sql-hover-schema-name'
    name.textContent = row.name
    name.title = row.name
    top.appendChild(name)

    const right = document.createElement('span')
    right.className = 'sql-hover-schema-right'

    if (row.type) {
      right.appendChild(createTypeNode(row.type))
    }

    if (row.badges.length > 0) {
      const badges = document.createElement('span')
      badges.className = 'sql-hover-schema-badges'
      for (const badge of row.badges) {
        const badgeEl = document.createElement('span')
        badgeEl.className = 'sql-hover-schema-badge'
        badgeEl.textContent = badge
        badges.appendChild(badgeEl)
      }
      right.appendChild(badges)
    }

    if (right.childNodes.length > 0) {
      top.appendChild(right)
    }
    rowEl.appendChild(top)

    body.appendChild(rowEl)
  }

  root.appendChild(body)

  if (card.hiddenCount > 0) {
    const more = document.createElement('button')
    more.type = 'button'
    more.className = 'sql-hover-schema-more'
    more.textContent = `+${card.hiddenCount} more columns`
    root.appendChild(more)
  }

  return root
}

export function renderHoverTooltipContent(
  container: HTMLDivElement,
  text: string,
  options: HoverRenderOptions = {}
) {
  container.textContent = ''

  const root = document.createElement('div')
  root.className = 'sql-hover-tooltip-content'

  const blocks = parseMarkdownBlocks(text)
  const schemaCard = maybeBuildSchemaCard(blocks, options.hoveredToken)
  if (schemaCard) {
    root.appendChild(createSchemaCardNode(schemaCard))
    container.appendChild(root)
    return
  }

  if (!blocks.length) {
    root.appendChild(createHoverTextBlock(text))
    container.appendChild(root)
    return
  }

  for (const block of blocks) {
    if (block.type === 'heading') {
      const heading = document.createElement('div')
      heading.className = 'sql-hover-tooltip-heading'
      heading.textContent = block.text
      root.appendChild(heading)
      continue
    }
    if (block.type === 'table') {
      root.appendChild(createHoverTableFallbackBlock(block.table))
      continue
    }
    root.appendChild(createHoverTextBlock(block.text))
  }

  container.appendChild(root)
}

function isWordCharacter(char: string): boolean {
  return /[\w$]/.test(char)
}

function isQuotedIdentifierDelimiter(char: string): boolean {
  return char === '`' || char === '"'
}

function getQuotedIdentifierRangeAtPosition(state: EditorStateLike, pos: number) {
  const docLength = state.doc.length
  if (docLength === 0) {
    return null
  }

  const clampedPos = Math.min(Math.max(pos, 0), docLength)
  const delimiterCandidatePositions = [clampedPos, clampedPos - 1]

  for (const delimiterIndex of delimiterCandidatePositions) {
    if (delimiterIndex < 0 || delimiterIndex >= docLength) {
      continue
    }

    const delimiter = state.doc.sliceString(delimiterIndex, delimiterIndex + 1)
    if (!isQuotedIdentifierDelimiter(delimiter)) {
      continue
    }

    let closingIndex = delimiterIndex + 1
    while (closingIndex < docLength) {
      const nextChar = state.doc.sliceString(closingIndex, closingIndex + 1)
      if (nextChar === '\n') {
        break
      }
      if (nextChar === delimiter) {
        break
      }
      closingIndex += 1
    }

    if (closingIndex >= docLength) {
      continue
    }

    const closingChar = state.doc.sliceString(closingIndex, closingIndex + 1)
    if (closingChar !== delimiter) {
      continue
    }

    const from = delimiterIndex + 1
    const to = closingIndex
    if (from >= to) {
      continue
    }

    const text = state.doc.sliceString(from, to)
    if (!text.trim()) {
      continue
    }

    return { from, to, text }
  }

  return null
}

export function getWordRangeAtPosition(state: EditorStateLike, pos: number) {
  const docLength = state.doc.length
  if (docLength === 0) {
    return null
  }

  const clampedPos = Math.min(Math.max(pos, 0), docLength)
  let from = clampedPos
  let to = clampedPos

  while (from > 0 && isWordCharacter(state.doc.sliceString(from - 1, from))) {
    from -= 1
  }
  while (to < docLength && isWordCharacter(state.doc.sliceString(to, to + 1))) {
    to += 1
  }

  if (from === to) {
    return getQuotedIdentifierRangeAtPosition(state, clampedPos)
  }

  return {
    from,
    to,
    text: state.doc.sliceString(from, to)
  }
}
