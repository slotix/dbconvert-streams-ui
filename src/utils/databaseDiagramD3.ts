import type { Table } from '@/types/schema'
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

export function calculateConnectionPoint(
  sourceX: number,
  sourceY: number,
  targetX: number,
  targetY: number,
  tableWidth: number,
  tableHeight: number
): [number, number] {
  const angle = Math.atan2(targetY - sourceY, targetX - sourceX)
  const width = tableWidth || 200
  const height = tableHeight || 30
  const halfWidth = width / 2
  const halfHeight = height / 2

  let x: number
  let y: number
  if (Math.abs(Math.cos(angle)) > Math.abs(Math.sin(angle))) {
    x = Math.cos(angle) > 0 ? halfWidth : -halfWidth
    y = Math.tan(angle) * x
    if (Math.abs(y) > halfHeight) {
      y = Math.sign(y) * halfHeight
      x = y / Math.tan(angle)
    }
  } else {
    y = Math.sin(angle) > 0 ? halfHeight : -halfHeight
    x = y / Math.tan(angle)
    if (Math.abs(x) > halfWidth) {
      x = Math.sign(x) * halfWidth
      y = Math.tan(angle) * x
    }
  }
  return [x, y]
}

function isJunctionTable(table: Table | undefined): boolean {
  if (!table?.foreignKeys?.length) return false
  return (
    table.foreignKeys.length === 2 &&
    table.primaryKeys?.length === 2 &&
    table.foreignKeys.every((fk) => table.primaryKeys?.includes(fk.sourceColumn))
  )
}

export function buildDiagramLinks(params: {
  tables: Table[]
  views: Table[]
  relations: { sourceTable: string; targetTable: string; sourceColumn: string }[]
}): TableLink[] {
  const { tables, views, relations } = params
  const tableByName = new Map(tables.map((t) => [t.name, t]))

  const processedLinks: TableLink[] = []

  function hasManyToManyRelationship(table1Name: string, table2Name: string): boolean {
    const junctionTables = tables.filter((table) => isJunctionTable(table))
    return junctionTables.some((junctionTable) => {
      if (!junctionTable.foreignKeys || junctionTable.foreignKeys.length !== 2) return false
      const referencedTables = junctionTable.foreignKeys.map((fk) => fk.referencedTable)
      return referencedTables.includes(table1Name) && referencedTables.includes(table2Name)
    })
  }

  // Process regular relationships
  relations?.forEach((relation) => {
    if (isJunctionTable(tableByName.get(relation.sourceTable))) {
      const junctionTable = tableByName.get(relation.sourceTable)
      const otherForeignKey = junctionTable?.foreignKeys?.find(
        (fk) =>
          fk.sourceColumn !== relation.sourceColumn && fk.referencedTable !== relation.targetTable
      )
      if (otherForeignKey) {
        processedLinks.push({
          source: otherForeignKey.referencedTable,
          target: relation.sourceTable,
          relationship: 'one-to-many',
          targetMarker: 'junction-mandatory-many',
          isJunctionRelation: true
        })
        processedLinks.push({
          source: relation.sourceTable,
          target: relation.targetTable,
          relationship: 'many-to-one',
          targetMarker: 'junction-mandatory-one-to-one',
          isJunctionRelation: true
        })
      }
    } else if (!isJunctionTable(tableByName.get(relation.targetTable))) {
      processedLinks.push({
        source: relation.sourceTable,
        target: relation.targetTable,
        relationship: 'many-to-one',
        targetMarker: 'mandatory-one-to-one',
        isJunctionRelation: false
      })
      processedLinks.push({
        source: relation.targetTable,
        target: relation.sourceTable,
        relationship: 'one-to-many',
        targetMarker: 'mandatory-many',
        isJunctionRelation: false
      })
    }
  })

  // Process many-to-many relationships
  const processedJunctionRelations = new Set<string>()
  tables.forEach((table) => {
    if (isJunctionTable(table) && table.foreignKeys && table.foreignKeys.length === 2) {
      const [fk1, fk2] = table.foreignKeys
      const relationKey = [fk1.referencedTable, fk2.referencedTable].sort().join('-')
      if (!processedJunctionRelations.has(relationKey)) {
        processedJunctionRelations.add(relationKey)
        processedLinks.push({
          source: fk1.referencedTable,
          target: table.name,
          relationship: 'one-to-many',
          targetMarker: 'junction-mandatory-many',
          isJunctionRelation: true
        })
        processedLinks.push({
          source: table.name,
          target: fk2.referencedTable,
          relationship: 'many-to-one',
          targetMarker: 'junction-mandatory-one',
          isJunctionRelation: true
        })
      }
    }
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
            sourceMarker: 'mandatory-one',
            targetMarker: 'mandatory-one',
            isViewDependency: true
          })
        })
    })
  }

  // Filter out incorrect direct relationships
  return processedLinks.filter((link) => {
    const source = typeof link.source === 'string' ? link.source : link.source.id
    const target = typeof link.target === 'string' ? link.target : link.target.id
    if (isJunctionTable(tableByName.get(source)) || isJunctionTable(tableByName.get(target))) {
      return true
    }
    return !hasManyToManyRelationship(source, target)
  })
}
