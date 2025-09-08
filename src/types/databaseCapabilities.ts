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
  systemObjects: {
    databases?: string[]
    schemas?: string[]
    tables?: string[]
  }

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
    systemObjects: {
      schemas: ['information_schema', 'pg_catalog', 'pg_toast', 'tiger', 'topology']
    },
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
    systemObjects: {
      databases: ['information_schema', 'performance_schema', 'mysql', 'sys']
    },
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
    systemObjects: {
      schemas: ['SYS', 'SYSTEM', 'SYSAUX', 'DBSNMP']
    },
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
    systemObjects: {
      databases: ['master', 'model', 'msdb', 'tempdb'],
      schemas: ['sys', 'INFORMATION_SCHEMA', 'guest', 'db_owner']
    },
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
    systemObjects: {
      databases: ['admin', 'config', 'local']
    },
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
    systemObjects: {
      schemas: ['INFORMATION_SCHEMA']
    },
    supportsSchemaFiltering: true,
    requiresSchemaSelection: true,
    canCreateDatabases: true,
    canCreateSchemas: true,
    databaseOptional: true, // Allow bootstrap connections without specifying database
    displayName: 'Snowflake',
    logo: '/images/db-logos/snowflake.svg',
    primaryColor: '#29B5E8'
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

export function supportsMultipleSchemas(dbType: string): boolean {
  const capabilities = getDatabaseCapabilities(dbType)
  return capabilities?.hasMultipleSchemas || false
}

export function supportsSchemaFiltering(dbType: string): boolean {
  const capabilities = getDatabaseCapabilities(dbType)
  return capabilities?.supportsSchemaFiltering || false
}

export function getHierarchyLevels(dbType: string): string[] {
  const capabilities = getDatabaseCapabilities(dbType)
  return capabilities?.hierarchyLevels || ['database', 'table']
}

export function getDefaultPort(dbType: string): number {
  const capabilities = getDatabaseCapabilities(dbType)
  return capabilities?.defaultPort || 5432
}

export function canCreateSchemas(dbType: string): boolean {
  const capabilities = getDatabaseCapabilities(dbType)
  return capabilities?.canCreateSchemas || false
}
