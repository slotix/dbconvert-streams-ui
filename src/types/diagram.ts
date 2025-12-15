import type { SimulationLinkDatum, SimulationNodeDatum } from 'd3-force'

/**
 * Represents a table or view node in the diagram
 */
export interface TableNode extends SimulationNodeDatum {
  id: string
  name: string
  schema: string
  isView: boolean
  x?: number
  y?: number
}

/**
 * Represents a relationship link between tables
 */
export interface TableLink extends SimulationLinkDatum<TableNode> {
  source: string | TableNode
  target: string | TableNode
  relationship: 'one-to-one' | 'one-to-many' | 'many-to-one' | 'many-to-many'
  cardinality?: string
  isViewDependency?: boolean
  isJunctionRelation?: boolean
  sourceMarker?: string
  targetMarker?: string
  sourceColumn?: string
  targetColumn?: string
  parallelIndex?: number
  parallelCount?: number
}

/**
 * Represents a field relationship for highlighting
 */
export interface RelatedField {
  tableName: string
  fieldName: string
  relatedTableName: string
  relatedFieldName: string
}
