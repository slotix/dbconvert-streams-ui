import { computed, type Ref } from 'vue'
import {
  getDatabaseCapabilities,
  supportsSchemas,
  supportsSchemaFiltering,
  canCreateSchemas,
  getDefaultPort,
  type DatabaseCapabilities
} from '@/types/databaseCapabilities'

export function useDatabaseCapabilities(databaseType: Ref<string> | string) {
  const dbType = computed(() =>
    typeof databaseType === 'string' ? databaseType : databaseType.value
  )

  const capabilities = computed(() => getDatabaseCapabilities(dbType.value))

  // Core capabilities
  const hasSchemas = computed(() => supportsSchemas(dbType.value))
  const hasMultipleSchemas = computed(() => capabilities.value?.hasMultipleSchemas || false)
  const requiresSchemaSelection = computed(
    () => capabilities.value?.requiresSchemaSelection || false
  )
  const supportsSchemaFilter = computed(() => supportsSchemaFiltering(dbType.value))
  const canCreateSchema = computed(() => canCreateSchemas(dbType.value))
  const canCreateDatabase = computed(() => capabilities.value?.canCreateDatabases || false)
  const isDatabaseOptional = computed(() => capabilities.value?.databaseOptional || false)

  // Connection defaults
  const defaultPort = computed(() => getDefaultPort(dbType.value))
  const protocolName = computed(
    () => capabilities.value?.protocolName || dbType.value.toLowerCase()
  )

  // UI display
  const displayName = computed(() => capabilities.value?.displayName || dbType.value)
  const logo = computed(() => capabilities.value?.logo || '')
  const primaryColor = computed(() => capabilities.value?.primaryColor || '#6B7280')

  // Hierarchy and structure
  const hierarchyLevels = computed(
    () => capabilities.value?.hierarchyLevels || ['database', 'table']
  )
  const showDatabaseLevel = computed(() => hierarchyLevels.value.includes('database'))
  const showSchemaLevel = computed(() => hierarchyLevels.value.includes('schema'))
  const showTableLevel = computed(() => hierarchyLevels.value.includes('table'))
  const showCollectionLevel = computed(() => hierarchyLevels.value.includes('collection'))

  // System objects filtering
  const systemDatabases = computed(() => capabilities.value?.systemObjects.databases || [])
  const systemSchemas = computed(() => capabilities.value?.systemObjects.schemas || [])
  const systemTables = computed(() => capabilities.value?.systemObjects.tables || [])

  // UI conditional helpers
  const isPostgreSQL = computed(() => dbType.value.toLowerCase().includes('postgres'))
  const isMySQL = computed(() => dbType.value.toLowerCase().includes('mysql'))
  const isOracle = computed(() => dbType.value.toLowerCase().includes('oracle'))
  const isSQLServer = computed(
    () =>
      dbType.value.toLowerCase().includes('sqlserver') ||
      dbType.value.toLowerCase().includes('mssql')
  )
  const isSnowflake = computed(() => dbType.value.toLowerCase().includes('snowflake'))
  const isFiles = computed(() => dbType.value.toLowerCase().includes('files'))
  const isMongoDB = computed(() => dbType.value.toLowerCase().includes('mongo'))
  const isSQL = computed(() => !isMongoDB.value && !isFiles.value)
  const isNoSQL = computed(() => isMongoDB.value)
  const isFileStorage = computed(() => isFiles.value)

  // Connection form helpers
  const getConnectionDefaults = () => ({
    port: defaultPort.value,
    username: getDefaultUsername(),
    database: getDefaultDatabase(),
    schema: getDefaultSchema()
  })

  const getDefaultUsername = () => {
    if (isMySQL.value) return 'root'
    if (isPostgreSQL.value) return 'postgres'
    if (isOracle.value) return 'system'
    if (isSQLServer.value) return 'sa'
    if (isSnowflake.value) return ''
    if (isFiles.value) return '' // No authentication for local files
    if (isMongoDB.value) return 'admin'
    return ''
  }

  const getDefaultDatabase = () => {
    if (isPostgreSQL.value) return 'postgres'
    if (isMySQL.value) return ''
    if (isOracle.value) return 'XE'
    if (isSQLServer.value) return 'master'
    if (isSnowflake.value) return ''
    if (isFiles.value) return '' // Optional folder path
    if (isMongoDB.value) return ''
    return ''
  }

  const getDefaultSchema = () => {
    if (isPostgreSQL.value) return 'public'
    if (isSQLServer.value) return 'dbo'
    if (isOracle.value) return 'hr'
    if (isSnowflake.value) return 'PUBLIC'
    if (isFiles.value) return '' // No schemas for files
    return ''
  }

  // Schema filtering helpers - moved to explorer/stream contexts
  const shouldShowSchemaSection = computed(() => false) // Schema selection moved to explorer/stream
  const shouldShowSchemaFilterButton = computed(() => false) // Schema filtering moved to explorer/stream
  const shouldShowCreateSchemaButton = computed(() => false) // Schema creation moved to explorer/stream

  // Validation helpers
  const validateConnection = (connection: any) => {
    const errors: string[] = []

    if (!connection.host) errors.push('Host is required')
    if (!connection.port) errors.push('Port is required')
    if (!connection.username) errors.push('Username is required')

    // DefaultDatabase is always optional for connections - streams specify database in their config
    // No validation needed here for defaultDatabase

    // Schema validation removed - handled in explorer/stream contexts

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  return {
    // Core capabilities
    capabilities,
    hasSchemas,
    hasMultipleSchemas,
    requiresSchemaSelection,
    supportsSchemaFilter,
    canCreateSchema,
    canCreateDatabase,
    isDatabaseOptional,

    // Connection info
    defaultPort,
    protocolName,
    displayName,
    logo,
    primaryColor,

    // Structure
    hierarchyLevels,
    showDatabaseLevel,
    showSchemaLevel,
    showTableLevel,
    showCollectionLevel,

    // System objects
    systemDatabases,
    systemSchemas,
    systemTables,

    // Database type checks
    isPostgreSQL,
    isMySQL,
    isOracle,
    isSQLServer,
    isSnowflake,
    isFiles,
    isMongoDB,
    isSQL,
    isNoSQL,
    isFileStorage,

    // UI helpers
    shouldShowSchemaSection,
    shouldShowSchemaFilterButton,
    shouldShowCreateSchemaButton,

    // Defaults and validation
    getConnectionDefaults,
    validateConnection
  }
}
