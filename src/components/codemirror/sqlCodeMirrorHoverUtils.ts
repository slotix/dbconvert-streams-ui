import type { EditorStateLike, LspHoverContents } from './sqlCodeMirrorTypes'

interface HoverMarkdownTable {
  headers: string[]
  rows: string[][]
}

type HoverMarkdownBlock =
  | { type: 'heading'; text: string }
  | { type: 'table'; table: HoverMarkdownTable }
  | { type: 'text'; text: string }

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

function createHoverTableBlock(tableData: HoverMarkdownTable): HTMLElement {
  const wrapper = document.createElement('div')
  wrapper.className = 'sql-hover-tooltip-table-wrap'

  const table = document.createElement('table')
  table.className = 'sql-hover-tooltip-table'

  const columnCount = Math.max(
    tableData.headers.length,
    ...tableData.rows.map((row) => row.length),
    0
  )

  if (tableData.headers.length) {
    const thead = document.createElement('thead')
    const headerRow = document.createElement('tr')
    for (let columnIndex = 0; columnIndex < columnCount; columnIndex += 1) {
      const th = document.createElement('th')
      th.textContent = tableData.headers[columnIndex] || ''
      headerRow.appendChild(th)
    }
    thead.appendChild(headerRow)
    table.appendChild(thead)
  }

  const tbody = document.createElement('tbody')
  for (const row of tableData.rows) {
    const tr = document.createElement('tr')
    for (let columnIndex = 0; columnIndex < columnCount; columnIndex += 1) {
      const td = document.createElement('td')
      td.textContent = row[columnIndex] || ''
      tr.appendChild(td)
    }
    tbody.appendChild(tr)
  }
  table.appendChild(tbody)

  wrapper.appendChild(table)
  return wrapper
}

export function renderHoverTooltipContent(container: HTMLDivElement, text: string) {
  container.textContent = ''

  const root = document.createElement('div')
  root.className = 'sql-hover-tooltip-content'

  const blocks = parseMarkdownBlocks(text)
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
      root.appendChild(createHoverTableBlock(block.table))
      continue
    }
    root.appendChild(createHoverTextBlock(block.text))
  }

  container.appendChild(root)
}

function isWordCharacter(char: string): boolean {
  return /[\w$]/.test(char)
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
    return null
  }

  return {
    from,
    to,
    text: state.doc.sliceString(from, to)
  }
}
