import type { PathSegment } from '@/utils/pathUtils'

type ConsoleTabType = 'sql-console' | 'file-console'

export interface ConsoleBreadcrumbData {
  connectionLabel: null
  database: null
  schema: null
  name: null
  objects: Array<never>
  pathSegments: PathSegment[]
  fileName: null
  siblingFiles: Array<{ name: string; path: string; format?: string }>
  isSqlConsole: true
  isFileBreadcrumb: false
  consoleName: string | null
}

export function isSqlConsoleTabType(tabType?: string): tabType is ConsoleTabType {
  return tabType === 'sql-console' || tabType === 'file-console'
}

export function buildSqlConsoleBreadcrumbData(consoleName?: string | null): ConsoleBreadcrumbData {
  return {
    connectionLabel: null,
    database: null,
    schema: null,
    name: null,
    objects: [],
    pathSegments: [],
    fileName: null,
    siblingFiles: [],
    isSqlConsole: true,
    isFileBreadcrumb: false,
    consoleName: consoleName?.trim() || null
  }
}
