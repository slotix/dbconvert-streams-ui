/**
 * Connection Configuration Validator
 *
 * Validates connection configuration JSON.
 * Used for the JSON editor feature.
 */

import type { Connection } from '@/types/connections'

export interface ValidationError {
  path: string
  message: string
  line?: number
}

export interface ValidationResult {
  valid: boolean
  errors: ValidationError[]
  parsed?: unknown
}

// Fields that cannot be modified by the user
const IMMUTABLE_FIELDS = ['id', 'created'] as const

// Valid connection types
const VALID_CONNECTION_TYPES = ['mysql', 'postgresql', 'postgres', 'snowflake', 'files'] as const

// Valid SSL modes
const VALID_SSL_MODES = ['disabled', 'require', 'verify-ca', 'verify-full'] as const

/**
 * Validates a connection configuration object
 */
export function validateConnectionConfig(
  config: unknown,
  originalConfig?: Connection
): ValidationResult {
  const errors: ValidationError[] = []

  if (!config || typeof config !== 'object') {
    return { valid: false, errors: [{ path: '', message: 'Configuration must be an object' }] }
  }

  const cfg = config as Record<string, unknown>

  // Check immutable fields haven't changed
  if (originalConfig) {
    for (const field of IMMUTABLE_FIELDS) {
      const originalValue = (originalConfig as unknown as Record<string, unknown>)[field]
      if (field in cfg && cfg[field] !== originalValue) {
        errors.push({
          path: field,
          message: `Field '${field}' cannot be modified`
        })
      }
    }
  }

  // Required fields
  validateRequiredFields(cfg, errors)

  // Type-specific validation
  const connType = (cfg.type as string)?.toLowerCase()
  const spec = cfg.spec as Record<string, unknown> | undefined
  const hasFileSpec = spec?.files || spec?.s3 || spec?.gcs || spec?.azure
  if (connType === 'files' || hasFileSpec) {
    validateFileConnection(cfg, errors)
  } else {
    validateDatabaseConnection(cfg, errors)
  }

  // SSL validation
  if (cfg.ssl) {
    validateSSL(cfg.ssl, errors)
  }

  // Spec validation
  if (cfg.spec) {
    validateSpec(cfg.spec, errors)
  }

  return {
    valid: errors.length === 0,
    errors
  }
}

function validateRequiredFields(cfg: Record<string, unknown>, errors: ValidationError[]): void {
  // Name is required
  if (!cfg.name || typeof cfg.name !== 'string' || cfg.name.trim() === '') {
    errors.push({ path: 'name', message: 'Connection name is required' })
  }

  // Type is required
  if (!cfg.type || typeof cfg.type !== 'string') {
    errors.push({ path: 'type', message: 'Connection type is required' })
  } else {
    const normalizedType = cfg.type.toLowerCase()
    if (
      !VALID_CONNECTION_TYPES.includes(normalizedType as (typeof VALID_CONNECTION_TYPES)[number])
    ) {
      errors.push({
        path: 'type',
        message: `Connection type must be one of: ${VALID_CONNECTION_TYPES.join(', ')}`
      })
    }
  }
}

function validateDatabaseConnection(cfg: Record<string, unknown>, errors: ValidationError[]): void {
  // Check for spec.database fields (new format)
  const spec = cfg.spec as Record<string, unknown> | undefined
  const databaseSpec = spec?.database as Record<string, unknown> | undefined
  const snowflakeSpec = spec?.snowflake as Record<string, unknown> | undefined

  // Get host from spec (either database or snowflake)
  const host = databaseSpec?.host || snowflakeSpec?.account
  const port = databaseSpec?.port
  const username = databaseSpec?.username || snowflakeSpec?.username
  const password = databaseSpec?.password || snowflakeSpec?.password

  // Host is required for database connections
  if (!host || (typeof host === 'string' && host.trim() === '')) {
    errors.push({
      path: 'spec.database.host',
      message: 'Host is required for database connections'
    })
  }

  // Port validation (only for database connections, not Snowflake)
  if (databaseSpec && port !== undefined) {
    if (typeof port !== 'number' || port < 1 || port > 65535) {
      errors.push({
        path: 'spec.database.port',
        message: 'Port must be a number between 1 and 65535'
      })
    }
  }

  // Username validation (optional but if present must be string)
  if (username !== undefined && typeof username !== 'string') {
    errors.push({ path: 'spec.database.username', message: 'Username must be a string' })
  }

  // Password validation (optional but if present must be string)
  if (password !== undefined && typeof password !== 'string') {
    errors.push({ path: 'spec.database.password', message: 'Password must be a string' })
  }
}

function validateFileConnection(cfg: Record<string, unknown>, errors: ValidationError[]): void {
  const spec = cfg.spec as Record<string, unknown> | undefined
  const filesSpec = spec?.files as Record<string, unknown> | undefined
  const s3Spec = spec?.s3 as Record<string, unknown> | undefined
  const gcsSpec = spec?.gcs as Record<string, unknown> | undefined
  const azureSpec = spec?.azure as Record<string, unknown> | undefined

  // Validate files spec (local files only)
  if (filesSpec) {
    // BasePath validation - required for local files
    if (filesSpec.basePath !== undefined && typeof filesSpec.basePath !== 'string') {
      errors.push({ path: 'spec.files.basePath', message: 'BasePath must be a string' })
    }
  }

  // Validate S3 spec
  if (s3Spec) {
    if (s3Spec.region !== undefined && typeof s3Spec.region !== 'string') {
      errors.push({ path: 'spec.s3.region', message: 'Region must be a string' })
    }
    if (s3Spec.endpoint !== undefined && typeof s3Spec.endpoint !== 'string') {
      errors.push({ path: 'spec.s3.endpoint', message: 'Endpoint must be a string' })
    }
  }

  // Validate GCS spec
  if (gcsSpec) {
    if (gcsSpec.region !== undefined && typeof gcsSpec.region !== 'string') {
      errors.push({ path: 'spec.gcs.region', message: 'Region must be a string' })
    }
  }

  // Validate Azure spec
  if (azureSpec) {
    if (azureSpec.accountName !== undefined && typeof azureSpec.accountName !== 'string') {
      errors.push({ path: 'spec.azure.accountName', message: 'Account name must be a string' })
    }
  }
}

function validateSSL(ssl: unknown, errors: ValidationError[]): void {
  if (typeof ssl !== 'object' || ssl === null) {
    errors.push({ path: 'ssl', message: 'SSL must be an object' })
    return
  }

  const sslConfig = ssl as Record<string, unknown>

  // Mode validation
  if (sslConfig.mode !== undefined) {
    if (
      typeof sslConfig.mode !== 'string' ||
      !VALID_SSL_MODES.includes(sslConfig.mode as (typeof VALID_SSL_MODES)[number])
    ) {
      errors.push({
        path: 'ssl.mode',
        message: `SSL mode must be one of: ${VALID_SSL_MODES.join(', ')}`
      })
    }
  }

  // Certificate fields must be strings
  const certFields = ['ca', 'client_cert', 'client_key']
  for (const field of certFields) {
    if (sslConfig[field] !== undefined && typeof sslConfig[field] !== 'string') {
      errors.push({ path: `ssl.${field}`, message: `${field} must be a string` })
    }
  }
}

function validateSpec(spec: unknown, errors: ValidationError[]): void {
  if (typeof spec !== 'object' || spec === null) {
    errors.push({ path: 'spec', message: 'Spec must be an object' })
    return
  }

  // Spec can have various structures depending on connection type
  // For now, just ensure it's a valid object
  // More specific validation can be added later
}

/**
 * Parses JSON string and validates it as a connection configuration
 */
export function parseAndValidateConnectionConfig(
  jsonString: string,
  originalConfig?: Connection
): ValidationResult {
  try {
    const parsed = JSON.parse(jsonString)
    const result = validateConnectionConfig(parsed, originalConfig)
    return { ...result, parsed }
  } catch (e) {
    const error = e as SyntaxError
    return {
      valid: false,
      errors: [
        {
          path: '',
          message: `Invalid JSON: ${error.message}`
        }
      ]
    }
  }
}

/**
 * Finds the approximate line number for a JSON path in a JSON string
 */
export function findLineForPath(jsonString: string, path: string): number | undefined {
  if (!path) return 1

  const lines = jsonString.split('\n')
  const pathParts = path
    .split('.')
    .flatMap((p) => p.replace(/\[(\d+)\]/g, '.$1').split('.'))
    .filter(Boolean)

  let searchKey = pathParts[pathParts.length - 1]

  if (/^\d+$/.test(searchKey) && pathParts.length > 1) {
    searchKey = pathParts[pathParts.length - 2]
  }

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes(`"${searchKey}"`)) {
      return i + 1
    }
  }

  return 1
}
