import type { Relationship, Table } from '@/types/schema'
import type { TableLink } from '@/types/diagram'

export function formatColumnType(column: { type?: string }): string {
  let type = column.type || ''
  const typeShortcuts: { [key: string]: string } = {
    'timestamp without time zone': 'timestamp',
    'timestamp with time zone': 'timestamptz',
    'character varying': 'varchar',
    character: 'char',
    'double precision': 'double',
    bigint: 'bigint',
    smallint: 'smallint',
    boolean: 'bool',
    text: 'text',
    integer: 'int'
  }
  for (const [longForm, shortForm] of Object.entries(typeShortcuts)) {
    if (type.toLowerCase().startsWith(longForm)) {
      const sizeMatch = type.match(/\\(.*\\)$/)
      type = shortForm + (sizeMatch ? sizeMatch[0] : '')
      break
    }
  }
  return type
}

function isJunctionTable(table: Table | undefined): boolean {
  if (!table?.foreignKeys?.length) return false
  return (
    table.foreignKeys.length === 2 &&
    table.primaryKeys?.length === 2 &&
    table.foreignKeys.every((fk) => table.primaryKeys?.includes(fk.sourceColumn))
  )
}

export function getColumnAnchorY(params: {
  table: Table | undefined
  columnName: string | undefined
  nodeCenterY: number
  nodeHeight: number
  headerHeight?: number
  rowHeight?: number
}): number {
  const { table, columnName, nodeCenterY, nodeHeight } = params
  if (!table || !columnName) return nodeCenterY

  const columnIndex = table.columns.findIndex((c) => c.name === columnName)
  if (columnIndex < 0) return nodeCenterY

  const headerHeight = params.headerHeight ?? 30
  const rowHeight = params.rowHeight ?? 20
  const topY = nodeCenterY - nodeHeight / 2
  return topY + headerHeight + columnIndex * rowHeight + rowHeight / 2
}

type Point = { x: number; y: number }

function dedupeOrthogonalPoints(points: Point[]): Point[] {
  const deduped: Point[] = []
  for (const point of points) {
    const last = deduped[deduped.length - 1]
    if (last && last.x === point.x && last.y === point.y) continue
    deduped.push(point)
  }

  return deduped.filter((point, i) => {
    const prev = deduped[i - 1]
    const next = deduped[i + 1]
    if (!prev || !next) return true
    const collinearX = prev.x === point.x && point.x === next.x
    const collinearY = prev.y === point.y && point.y === next.y
    return !(collinearX || collinearY)
  })
}

export function buildRoundedOrthogonalPath(points: Point[], radius: number = 8): string {
  const cleaned = dedupeOrthogonalPoints(points)
  if (cleaned.length === 0) return ''
  if (cleaned.length === 1) return `M ${cleaned[0].x} ${cleaned[0].y}`

  const r = Math.max(0, radius)
  let d = `M ${cleaned[0].x} ${cleaned[0].y}`

  for (let i = 1; i < cleaned.length; i++) {
    const prev = cleaned[i - 1]
    const curr = cleaned[i]
    const next = cleaned[i + 1]

    if (!next || r === 0) {
      d += ` L ${curr.x} ${curr.y}`
      continue
    }

    const dx1 = curr.x - prev.x
    const dy1 = curr.y - prev.y
    const dx2 = next.x - curr.x
    const dy2 = next.y - curr.y

    const len1 = Math.abs(dx1) + Math.abs(dy1)
    const len2 = Math.abs(dx2) + Math.abs(dy2)
    if (len1 === 0 || len2 === 0) {
      d += ` L ${curr.x} ${curr.y}`
      continue
    }

    const corner = Math.min(r, len1 / 2, len2 / 2)

    const p1: Point =
      dx1 !== 0
        ? { x: curr.x - Math.sign(dx1) * corner, y: curr.y }
        : { x: curr.x, y: curr.y - Math.sign(dy1) * corner }

    const p2: Point =
      dx2 !== 0
        ? { x: curr.x + Math.sign(dx2) * corner, y: curr.y }
        : { x: curr.x, y: curr.y + Math.sign(dy2) * corner }

    d += ` L ${p1.x} ${p1.y} Q ${curr.x} ${curr.y} ${p2.x} ${p2.y}`
  }

  return d
}

export function buildDiagramLinks(params: {
  tables: Table[]
  views: Table[]
  relations: Relationship[]
}): TableLink[] {
  const { tables, views, relations } = params
  const tableByName = new Map(tables.map((t) => [t.name, t]))

  const junctionTables = tables.filter((table) => isJunctionTable(table))
  const junctionNames = new Set(junctionTables.map((t) => t.name))
  const processedLinks: TableLink[] = []

  function hasJunctionBetween(table1Name: string, table2Name: string): boolean {
    return junctionTables.some((junctionTable) => {
      if (!junctionTable.foreignKeys || junctionTable.foreignKeys.length !== 2) return false
      const referencedTables = junctionTable.foreignKeys.map((fk) => fk.referencedTable)
      return referencedTables.includes(table1Name) && referencedTables.includes(table2Name)
    })
  }

  relations?.forEach((relation) => {
    const sourceTable = tableByName.get(relation.sourceTable)
    const inferredManyToMany = Boolean(
      relation.id?.includes('<->') || relation.label?.toLowerCase().includes('m:n')
    )

    if (inferredManyToMany && hasJunctionBetween(relation.sourceTable, relation.targetTable)) {
      return
    }

    const isJunctionRelation =
      junctionNames.has(relation.sourceTable) || junctionNames.has(relation.targetTable)
    const markerPrefix = isJunctionRelation ? 'junction-' : ''

    const derivedTargetColumn =
      relation.targetColumn ||
      sourceTable?.foreignKeys?.find(
        (fk) =>
          fk.sourceColumn === relation.sourceColumn && fk.referencedTable === relation.targetTable
      )?.referencedColumn

    const relationship: TableLink['relationship'] = inferredManyToMany
      ? 'many-to-many'
      : 'many-to-one'

    const sourceMarker = `${markerPrefix}mandatory-many`
    const targetMarker = inferredManyToMany
      ? `${markerPrefix}mandatory-many`
      : `${markerPrefix}mandatory-one-to-one`

    processedLinks.push({
      source: relation.sourceTable,
      target: relation.targetTable,
      relationship,
      sourceMarker,
      targetMarker,
      isJunctionRelation,
      sourceColumn: relation.sourceColumn,
      targetColumn: derivedTargetColumn
    })
  })

  // Add view dependencies
  if (views?.length) {
    views.forEach((view) => {
      tables
        .filter((table) => view.name.toLowerCase().includes(table.name.toLowerCase()))
        .forEach((table) => {
          processedLinks.push({
            source: view.name,
            target: table.name,
            relationship: 'one-to-one',
            sourceMarker: undefined,
            targetMarker: undefined,
            isViewDependency: true
          })
        })
    })
  }

  const groups = new Map<string, TableLink[]>()
  for (const link of processedLinks) {
    const source = typeof link.source === 'string' ? link.source : link.source.id
    const target = typeof link.target === 'string' ? link.target : link.target.id
    const [a, b] = [source, target].sort()
    const key = [
      a,
      b,
      link.isViewDependency ? 'view' : 'rel',
      link.isJunctionRelation ? 'junction' : 'normal'
    ].join('::')
    const group = groups.get(key)
    if (group) group.push(link)
    else groups.set(key, [link])
  }

  for (const group of groups.values()) {
    group.sort((l1, l2) => {
      const a1 = `${l1.sourceColumn ?? ''}→${l1.targetColumn ?? ''}`
      const a2 = `${l2.sourceColumn ?? ''}→${l2.targetColumn ?? ''}`
      return a1.localeCompare(a2)
    })
    const count = group.length
    group.forEach((link, i) => {
      link.parallelIndex = i
      link.parallelCount = count
    })
  }

  return processedLinks
}
