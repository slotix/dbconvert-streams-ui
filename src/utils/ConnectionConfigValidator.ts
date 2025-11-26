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
const VALID_CONNECTION_TYPES = [
  'mysql',
  'postgresql',
  'postgres',
  'snowflake',
  'files',
  'localfiles'
] as const

// Valid storage providers
const VALID_STORAGE_PROVIDERS = ['local', 's3', 'gcs', 'azure', 'sftp', 'ftp'] as const

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
  if (connType === 'files' || connType === 'localfiles' || cfg.storage_config) {
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
  // Host is required for database connections
  if (!cfg.host || typeof cfg.host !== 'string' || cfg.host.trim() === '') {
    errors.push({ path: 'host', message: 'Host is required for database connections' })
  }

  // Port validation
  if (cfg.port !== undefined) {
    if (typeof cfg.port !== 'number' || cfg.port < 1 || cfg.port > 65535) {
      errors.push({ path: 'port', message: 'Port must be a number between 1 and 65535' })
    }
  }

  // Username validation (optional but if present must be string)
  if (cfg.username !== undefined && typeof cfg.username !== 'string') {
    errors.push({ path: 'username', message: 'Username must be a string' })
  }

  // Password validation (optional but if present must be string)
  if (cfg.password !== undefined && typeof cfg.password !== 'string') {
    errors.push({ path: 'password', message: 'Password must be a string' })
  }

  // Default database validation (optional but if present must be string)
  if (cfg.defaultDatabase !== undefined && typeof cfg.defaultDatabase !== 'string') {
    errors.push({ path: 'defaultDatabase', message: 'Default database must be a string' })
  }
}

function validateFileConnection(cfg: Record<string, unknown>, errors: ValidationError[]): void {
  const storageConfig = cfg.storage_config as Record<string, unknown> | undefined

  if (storageConfig) {
    // Provider validation
    if (storageConfig.provider !== undefined) {
      if (
        typeof storageConfig.provider !== 'string' ||
        !VALID_STORAGE_PROVIDERS.includes(
          storageConfig.provider.toLowerCase() as (typeof VALID_STORAGE_PROVIDERS)[number]
        )
      ) {
        errors.push({
          path: 'storage_config.provider',
          message: `Provider must be one of: ${VALID_STORAGE_PROVIDERS.join(', ')}`
        })
      }
    }

    // URI validation
    if (storageConfig.uri !== undefined && typeof storageConfig.uri !== 'string') {
      errors.push({ path: 'storage_config.uri', message: 'URI must be a string' })
    }

    // Region validation
    if (storageConfig.region !== undefined && typeof storageConfig.region !== 'string') {
      errors.push({ path: 'storage_config.region', message: 'Region must be a string' })
    }

    // Endpoint validation
    if (storageConfig.endpoint !== undefined && typeof storageConfig.endpoint !== 'string') {
      errors.push({ path: 'storage_config.endpoint', message: 'Endpoint must be a string' })
    }
  }

  // S3 config validation
  const s3Config = cfg.s3Config as Record<string, unknown> | undefined
  if (s3Config) {
    validateS3Config(s3Config, errors)
  }
}

function validateS3Config(s3Config: Record<string, unknown>, errors: ValidationError[]): void {
  // Credential source validation
  if (s3Config.credentialSource !== undefined) {
    if (!['aws', 'static'].includes(s3Config.credentialSource as string)) {
      errors.push({
        path: 's3Config.credentialSource',
        message: "Credential source must be 'aws' or 'static'"
      })
    }
  }

  // URL style validation
  if (s3Config.urlStyle !== undefined) {
    if (!['auto', 'path', 'virtual'].includes(s3Config.urlStyle as string)) {
      errors.push({
        path: 's3Config.urlStyle',
        message: "URL style must be 'auto', 'path', or 'virtual'"
      })
    }
  }

  // Boolean fields
  if (s3Config.useSSL !== undefined && typeof s3Config.useSSL !== 'boolean') {
    errors.push({ path: 's3Config.useSSL', message: 'useSSL must be a boolean' })
  }

  // String fields
  const stringFields = ['endpoint', 'region', 'bucket', 'prefix', 'sessionToken']
  for (const field of stringFields) {
    if (s3Config[field] !== undefined && typeof s3Config[field] !== 'string') {
      errors.push({ path: `s3Config.${field}`, message: `${field} must be a string` })
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
