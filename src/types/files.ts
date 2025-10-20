import type { FileFormat } from '@/utils/fileFormat'

export interface FileSchemaField {
  name: string
  type: string
}

export interface FileDataResponse {
  data: Array<Record<string, unknown>>
  schema: FileSchemaField[]
  total: number
  warnings?: string[]
}

export interface CSVFormatDetails {
  delimiter: string
  quote: string
  escape: string
  hasHeader: boolean
  lineTerminator: string
  skipBlankLines: boolean
}

export interface JSONStructurePathStats {
  jsonPath: string
  occurrences: number
  type: string
  isRequired: boolean
}

export interface JSONStructureInfo {
  rootType: string
  isHomogeneous: boolean
  pathStats?: Record<string, JSONStructurePathStats>
  arrayInfo?: {
    elementCount: number
    elementType?: string
    isHomogeneous: boolean
    maxDepth: number
  }
}

export interface FileColumnMetadata {
  name: string
  type: string
  nullable: boolean
  confidence?: number
}

export interface FileMetadata {
  path: string
  format: FileFormat
  size: number
  rowCount: number
  columnCount: number
  columns: FileColumnMetadata[]
  formatInfo?: Record<string, unknown>
  csvDialect?: CSVFormatDetails
  jsonStructure?: JSONStructureInfo
  warnings?: string[]
}
