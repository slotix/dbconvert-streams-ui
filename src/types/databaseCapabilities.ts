export interface DatabaseCapabilities {
  // Organizational structure
  hasSchemas: boolean
  hasMultipleSchemas: boolean
  hasSystemSchemas: boolean

  // Connection features
  defaultPort: number
  protocolName: string

  // Schema/Database structure
  hierarchyLevels: ('database' | 'schema' | 'table' | 'collection')[]

  // UI specific features
  supportsSchemaFiltering: boolean
  requiresSchemaSelection: boolean
  canCreateDatabases: boolean
  canCreateSchemas: boolean
  databaseOptional?: boolean // Whether database field is optional during connection

  // Display preferences
  displayName: string
  logo: string
  primaryColor: string
}

export interface DatabaseTypeRegistry {
  [key: string]: DatabaseCapabilities
}

export const DATABASE_CAPABILITIES: DatabaseTypeRegistry = {
  postgresql: {
    hasSchemas: true,
    hasMultipleSchemas: true,
    hasSystemSchemas: true,
    defaultPort: 5432,
    protocolName: 'postgresql',
    hierarchyLevels: ['database', 'schema', 'table'],
    // System objects now detected by API via isSystem flag
    supportsSchemaFiltering: true,
    requiresSchemaSelection: true,
    canCreateDatabases: true,
    canCreateSchemas: true,
    databaseOptional: true, // Allow bootstrap connections to server without specifying database
    displayName: 'PostgreSQL',
    logo: '/images/db-logos/postgresql.svg',
    primaryColor: '#336791'
  },

  mysql: {
    hasSchemas: false,
    hasMultipleSchemas: false,
    hasSystemSchemas: false,
    defaultPort: 3306,
    protocolName: 'mysql',
    hierarchyLevels: ['database', 'table'],
    // System objects now detected by API via isSystem flag
    supportsSchemaFiltering: false,
    requiresSchemaSelection: false,
    canCreateDatabases: true,
    canCreateSchemas: false,
    databaseOptional: true, // Allow bootstrap connections to server without specifying database
    displayName: 'MySQL',
    logo: '/images/db-logos/mysql.svg',
    primaryColor: '#4479A1'
  },

  oracle: {
    hasSchemas: true,
    hasMultipleSchemas: true,
    hasSystemSchemas: true,
    defaultPort: 1521,
    protocolName: 'oracle',
    hierarchyLevels: ['schema', 'table'],
    // System objects now detected by API via isSystem flag
    supportsSchemaFiltering: true,
    requiresSchemaSelection: true,
    canCreateDatabases: false,
    canCreateSchemas: true,
    displayName: 'Oracle',
    logo: '/images/db-logos/oracle.svg',
    primaryColor: '#F80000'
  },

  sqlserver: {
    hasSchemas: true,
    hasMultipleSchemas: true,
    hasSystemSchemas: true,
    defaultPort: 1433,
    protocolName: 'sqlserver',
    hierarchyLevels: ['database', 'schema', 'table'],
    // System objects now detected by API via isSystem flag
    supportsSchemaFiltering: true,
    requiresSchemaSelection: true,
    canCreateDatabases: true,
    canCreateSchemas: true,
    displayName: 'SQL Server',
    logo: '/images/db-logos/sqlserver.svg',
    primaryColor: '#CC2927'
  },

  mongodb: {
    hasSchemas: false,
    hasMultipleSchemas: false,
    hasSystemSchemas: false,
    defaultPort: 27017,
    protocolName: 'mongodb',
    hierarchyLevels: ['database', 'collection'],
    // System objects now detected by API via isSystem flag
    supportsSchemaFiltering: false,
    requiresSchemaSelection: false,
    canCreateDatabases: true,
    canCreateSchemas: false,
    displayName: 'MongoDB',
    logo: '/images/db-logos/mongodb.svg',
    primaryColor: '#47A248'
  },

  snowflake: {
    hasSchemas: true,
    hasMultipleSchemas: true,
    hasSystemSchemas: true,
    defaultPort: 443,
    protocolName: 'snowflake',
    hierarchyLevels: ['database', 'schema', 'table'],
    // System objects now detected by API via isSystem flag
    supportsSchemaFiltering: true,
    requiresSchemaSelection: true,
    canCreateDatabases: true,
    canCreateSchemas: true,
    databaseOptional: true, // Allow bootstrap connections without specifying database
    displayName: 'Snowflake',
    logo: '/images/db-logos/snowflake.svg',
    primaryColor: '#29B5E8'
  },

  files: {
    hasSchemas: false,
    hasMultipleSchemas: false,
    hasSystemSchemas: false,
    defaultPort: 0, // Not applicable for file connections
    protocolName: 'file',
    hierarchyLevels: ['database', 'table'], // folders = "databases", files = "tables"
    // No system objects for file connections
    supportsSchemaFiltering: false,
    requiresSchemaSelection: false,
    canCreateDatabases: true, // Can create new folders
    canCreateSchemas: false,
    databaseOptional: true, // Optional folder specification
    displayName: 'Files',
    logo: '/images/db-logos/csv.svg',
    primaryColor: '#10B981'
  }
}

// Helper functions
export function getDatabaseCapabilities(dbType: string): DatabaseCapabilities | null {
  const normalizedType = dbType.toLowerCase()
  return DATABASE_CAPABILITIES[normalizedType] || null
}

export function supportsSchemas(dbType: string): boolean {
  const capabilities = getDatabaseCapabilities(dbType)
  return capabilities?.hasSchemas || false
}

export function supportsSchemaFiltering(dbType: string): boolean {
  const capabilities = getDatabaseCapabilities(dbType)
  return capabilities?.supportsSchemaFiltering || false
}

export function getDefaultPort(dbType: string): number {
  const capabilities = getDatabaseCapabilities(dbType)
  return capabilities?.defaultPort || 5432
}

export function canCreateSchemas(dbType: string): boolean {
  const capabilities = getDatabaseCapabilities(dbType)
  return capabilities?.canCreateSchemas || false
}
