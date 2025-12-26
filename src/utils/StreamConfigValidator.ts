/**
 * Stream Configuration Validator
 *
 * Validates stream configuration JSON with the same rules as the wizard.
 * Used for the JSON editor feature.
 */

import type { StreamConfig } from '@/types/streamConfig'

export interface ValidationError {
  path: string
  message: string
  line?: number
}

export interface ValidationResult {
  valid: boolean
  errors: ValidationError[]
}

// Fields that cannot be modified by the user (top-level)
const IMMUTABLE_FIELDS = ['id', 'created'] as const

// Valid file formats for file targets
const VALID_FILE_FORMATS = ['csv', 'jsonl', 'parquet'] as const

// Valid compression types
const VALID_COMPRESSION_TYPES = ['none', 'gzip', 'zstd', 'uncompressed'] as const

/**
 * Validates a stream configuration object
 */
export function validateStreamConfig(
  config: unknown,
  originalConfig?: StreamConfig
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

    // Check source.connections are immutable
    const cfgSource = cfg.source as Record<string, unknown> | undefined
    if (cfgSource && originalConfig.source) {
      const cfgConnections = extractConnections(cfgSource)
      const originalConnections = extractConnections(
        originalConfig.source as unknown as Record<string, unknown>
      )
      if (originalConnections.length > 0 && cfgConnections.length > 0) {
        const cfgKey = cfgConnections.map((c) => `${c.alias}:${c.connectionId}`).join('|')
        const originalKey = originalConnections.map((c) => `${c.alias}:${c.connectionId}`).join('|')
        if (cfgKey !== originalKey) {
          errors.push({
            path: 'source.connections',
            message:
              "Field 'source.connections' cannot be modified. Create a new stream to change source connections."
          })
        }
      }
    }

    // Check target.id is immutable
    const cfgTarget = cfg.target as Record<string, unknown> | undefined
    if (cfgTarget?.id && originalConfig.target?.id && cfgTarget.id !== originalConfig.target.id) {
      errors.push({
        path: 'target.id',
        message:
          "Field 'target.id' cannot be modified. Create a new stream to change the target connection."
      })
    }
  }

  // Required fields
  validateRequiredFields(cfg, errors)

  // Source validation
  if (cfg.source) {
    validateSource(cfg.source, errors)
  }

  // Target validation
  if (cfg.target) {
    validateTarget(cfg.target, errors)
  }

  // Limits validation (optional)
  if (cfg.limits) {
    validateLimits(cfg.limits, errors)
  }

  return {
    valid: errors.length === 0,
    errors
  }
}

function validateRequiredFields(cfg: Record<string, unknown>, errors: ValidationError[]): void {
  const requiredFields = ['name', 'mode', 'source', 'target']

  for (const field of requiredFields) {
    if (!(field in cfg) || cfg[field] === null || cfg[field] === undefined) {
      errors.push({ path: field, message: `Required field '${field}' is missing` })
    }
  }

  // Validate name is non-empty string
  if (typeof cfg.name === 'string' && cfg.name.trim() === '') {
    errors.push({ path: 'name', message: 'Name cannot be empty' })
  }

  // Validate mode enum
  if (cfg.mode && !['convert', 'cdc'].includes(cfg.mode as string)) {
    errors.push({ path: 'mode', message: "Mode must be 'convert' or 'cdc'" })
  }

  // Validate reportingInterval if present
  if (cfg.reportingInterval !== undefined) {
    if (typeof cfg.reportingInterval !== 'number' || cfg.reportingInterval < 1) {
      errors.push({
        path: 'reportingInterval',
        message: 'reportingInterval must be at least 1 second'
      })
    }
  }
}

function validateSource(source: unknown, errors: ValidationError[]): void {
  if (typeof source !== 'object' || source === null) {
    errors.push({ path: 'source', message: 'Source must be an object' })
    return
  }

  const src = source as Record<string, unknown>

  const connections = extractConnections(src)
  if (connections.length === 0) {
    errors.push({
      path: 'source.connections',
      message: 'At least one source connection is required'
    })
    return
  }
  validateConnections(connections, errors)

  // Validate per-connection S3 configs (source.connections[i].s3)
  const hasAnyS3 = connections.some((c) => typeof c.s3 === 'object' && c.s3 !== null)
  const hasAnyS3Selections = connections.some(
    (c) =>
      typeof c.s3 === 'object' &&
      c.s3 !== null &&
      Array.isArray((c.s3 as Record<string, unknown>).selections) &&
      ((c.s3 as Record<string, unknown>).selections as unknown[]).length > 0
  )

  if (hasAnyS3) {
    validateS3Connections(connections, src, errors)
  }

  // Tables or Queries validation - at least one must be specified
  const hasTables = Array.isArray(src.tables) && src.tables.length > 0
  const hasQueries = Array.isArray(src.queries) && src.queries.length > 0

  if (!hasTables && !hasQueries && !hasAnyS3Selections) {
    errors.push({
      path: 'source.tables',
      message: 'At least one table, query, or S3 selection is required'
    })
  }

  if (hasTables) {
    validateTables(src.tables as unknown[], connections, errors)
  }

  if (hasQueries) {
    validateQueries(src.queries as unknown[], errors)
  }

  // Source options validation
  if (src.options) {
    validateSourceOptions(src.options, errors)
  }
}

function validateS3Connections(
  connections: Array<{ alias?: string; connectionId?: string; database?: string; s3?: unknown }>,
  src: Record<string, unknown>,
  errors: ValidationError[]
): void {
  const hasTables = Array.isArray(src.tables) && src.tables.length > 0
  const hasQueries = Array.isArray(src.queries) && src.queries.length > 0
  const hasDatabase = typeof src.database === 'string' && src.database.trim() !== ''
  const hasSchema = typeof src.schema === 'string' && src.schema.trim() !== ''

  // In single-source mode, S3 must not be mixed with DB-like fields at the top-level.
  if (connections.length === 1) {
    const onlyConnHasS3 = typeof connections[0].s3 === 'object' && connections[0].s3 !== null
    if (onlyConnHasS3 && (hasDatabase || hasSchema || hasTables || hasQueries)) {
      errors.push({
        path: 'source.connections[0].s3',
        message:
          'Single-source S3 streams must not set source.database/source.schema/source.tables/source.queries'
      })
    }
  }

  connections.forEach((conn, connIndex) => {
    if (conn.s3 === undefined) return
    if (typeof conn.s3 !== 'object' || conn.s3 === null) {
      errors.push({
        path: `source.connections[${connIndex}].s3`,
        message: 'source.connections[].s3 must be an object'
      })
      return
    }

    if (typeof conn.database === 'string' && conn.database.trim() !== '') {
      errors.push({
        path: `source.connections[${connIndex}].database`,
        message: 'database must be empty for S3 connections'
      })
    }

    const s3 = conn.s3 as Record<string, unknown>
    const bucket = typeof s3.bucket === 'string' ? s3.bucket.trim() : ''
    if (!bucket) {
      errors.push({
        path: `source.connections[${connIndex}].s3.bucket`,
        message: 'bucket is required for S3 sources'
      })
    }

    if (!Array.isArray(s3.selections) || s3.selections.length === 0) {
      errors.push({
        path: `source.connections[${connIndex}].s3.selections`,
        message: 'at least one S3 selection is required'
      })
      return
    }

    ;(s3.selections as unknown[]).forEach((sel, index) => {
      if (typeof sel !== 'object' || sel === null) {
        errors.push({
          path: `source.connections[${connIndex}].s3.selections[${index}]`,
          message: 'S3 selection must be an object'
        })
        return
      }
      const s = sel as Record<string, unknown>
      const kind = typeof s.kind === 'string' ? s.kind.trim().toLowerCase() : ''
      const prefix = typeof s.prefix === 'string' ? s.prefix : ''
      const key = typeof s.key === 'string' ? s.key : ''

      if (kind !== 'prefix' && kind !== 'object') {
        errors.push({
          path: `source.connections[${connIndex}].s3.selections[${index}].kind`,
          message: "kind must be 'prefix' or 'object'"
        })
        return
      }

      if (kind === 'prefix') {
        if (key) {
          errors.push({
            path: `source.connections[${connIndex}].s3.selections[${index}]`,
            message: 'key must be empty for prefix selections'
          })
        }
        if (prefix && !prefix.endsWith('/')) {
          errors.push({
            path: `source.connections[${connIndex}].s3.selections[${index}]`,
            message: "prefix must end with '/'"
          })
        }
      }

      if (kind === 'object') {
        if (!key.trim()) {
          errors.push({
            path: `source.connections[${connIndex}].s3.selections[${index}].key`,
            message: 'key is required for object selections'
          })
        }
        if (key.endsWith('/')) {
          errors.push({
            path: `source.connections[${connIndex}].s3.selections[${index}].key`,
            message: "key must not end with '/'"
          })
        }
        if (prefix) {
          errors.push({
            path: `source.connections[${connIndex}].s3.selections[${index}]`,
            message: 'prefix must be empty for object selections'
          })
        }
      }
    })
  })
}

function validateConnections(
  connections: Array<{ alias?: string; connectionId?: string }>,
  errors: ValidationError[]
): void {
  const seenAliases = new Set<string>()
  connections.forEach((conn, index) => {
    if (!conn.alias || typeof conn.alias !== 'string' || conn.alias.trim() === '') {
      errors.push({
        path: `source.connections[${index}].alias`,
        message: 'Connection alias is required'
      })
    } else if (seenAliases.has(conn.alias)) {
      errors.push({
        path: `source.connections[${index}].alias`,
        message: 'Connection alias must be unique'
      })
    } else {
      seenAliases.add(conn.alias)
    }

    if (!conn.connectionId || typeof conn.connectionId !== 'string') {
      errors.push({
        path: `source.connections[${index}].connectionId`,
        message: 'Connection ID is required'
      })
    }
  })
}

function validateQueries(queries: unknown[], errors: ValidationError[]): void {
  queries.forEach((query, index) => {
    if (typeof query !== 'object' || query === null) {
      errors.push({ path: `source.queries[${index}]`, message: 'Query must be an object' })
      return
    }

    const q = query as Record<string, unknown>
    if (!q.name || typeof q.name !== 'string') {
      errors.push({ path: `source.queries[${index}].name`, message: 'Query name is required' })
    }
    if (!q.query || typeof q.query !== 'string') {
      errors.push({ path: `source.queries[${index}].query`, message: 'Query SQL is required' })
    }
  })
}

function validateTables(
  tables: unknown[],
  connections: Array<{ alias?: string }>,
  errors: ValidationError[]
): void {
  const aliasSet = new Set(
    connections.filter((c) => c.alias).map((c) => (c.alias as string).trim())
  )
  const requiresAliasPrefix = connections.length > 1

  tables.forEach((table, index) => {
    if (typeof table !== 'object' || table === null) {
      errors.push({ path: `source.tables[${index}]`, message: 'Table must be an object' })
      return
    }

    const t = table as Record<string, unknown>

    if (!t.name || typeof t.name !== 'string' || t.name.trim() === '') {
      errors.push({ path: `source.tables[${index}].name`, message: 'Table name is required' })
    } else if (requiresAliasPrefix) {
      const alias = t.name.split('.')[0]
      if (!aliasSet.has(alias)) {
        errors.push({
          path: `source.tables[${index}].name`,
          message: 'Table name must be prefixed with a valid connection alias'
        })
      }
    }

    // Filter is optional but if present must be an object
    if (t.filter !== undefined && (typeof t.filter !== 'object' || t.filter === null)) {
      errors.push({ path: `source.tables[${index}].filter`, message: 'Filter must be an object' })
    }
  })
}

function validateSourceOptions(options: unknown, errors: ValidationError[]): void {
  if (typeof options !== 'object' || options === null) {
    errors.push({ path: 'source.options', message: 'Source options must be an object' })
    return
  }

  const opts = options as Record<string, unknown>

  // dataBundleSize must be > 0
  if (opts.dataBundleSize !== undefined) {
    if (typeof opts.dataBundleSize !== 'number' || opts.dataBundleSize <= 0) {
      errors.push({
        path: 'source.options.dataBundleSize',
        message: 'dataBundleSize must be greater than 0'
      })
    }
  }

  // operations must be array of valid strings
  if (opts.operations !== undefined) {
    if (!Array.isArray(opts.operations)) {
      errors.push({
        path: 'source.options.operations',
        message: 'operations must be an array'
      })
    } else {
      const validOps = ['insert', 'update', 'delete']
      for (const op of opts.operations) {
        if (typeof op !== 'string' || !validOps.includes(op)) {
          errors.push({
            path: 'source.options.operations',
            message: `Invalid operation: ${op}. Must be one of: ${validOps.join(', ')}`
          })
        }
      }
    }
  }
}

function validateTarget(target: unknown, errors: ValidationError[]): void {
  if (typeof target !== 'object' || target === null) {
    errors.push({ path: 'target', message: 'Target must be an object' })
    return
  }

  const tgt = target as Record<string, unknown>

  // Required target fields - connection ID
  if (!tgt.id || typeof tgt.id !== 'string') {
    errors.push({ path: 'target.id', message: 'Target connection ID is required' })
  }

  // Note: fileFormat is inside target.spec.{files|s3|gcs|azure}.fileFormat
  // Not at target.fileFormat level - that doesn't exist in backend

  // Target spec validation
  if (tgt.spec) {
    validateTargetSpec(tgt.spec, errors)
  }
}

function extractConnections(
  src: Record<string, unknown>
): Array<{ alias: string; connectionId: string; database?: string; s3?: unknown }> {
  if (Array.isArray(src.connections) && src.connections.length > 0) {
    return src.connections as Array<{
      alias: string
      connectionId: string
      database?: string
      s3?: unknown
    }>
  }
  return []
}

function validateTargetSpec(spec: unknown, errors: ValidationError[]): void {
  if (typeof spec !== 'object' || spec === null) {
    errors.push({ path: 'target.spec', message: 'Target spec must be an object' })
    return
  }

  const s = spec as Record<string, unknown>

  // All possible spec types that can contain file format and compression settings
  const specTypes = ['local', 's3', 'snowflake', 'files', 'database'] as const

  for (const specType of specTypes) {
    const specObj = s[specType] as Record<string, unknown> | undefined
    if (!specObj) continue

    // Validate fileFormat at spec level (e.g., spec.files.fileFormat)
    if (specObj.fileFormat !== undefined) {
      if (
        typeof specObj.fileFormat !== 'string' ||
        !VALID_FILE_FORMATS.includes(specObj.fileFormat as (typeof VALID_FILE_FORMATS)[number])
      ) {
        errors.push({
          path: `target.spec.${specType}.fileFormat`,
          message: `fileFormat must be one of: ${VALID_FILE_FORMATS.join(', ')}`
        })
      }
    }

    // Validate compression at spec level (e.g., spec.local.compression)
    if (specObj.compression !== undefined) {
      if (
        typeof specObj.compression !== 'string' ||
        !VALID_COMPRESSION_TYPES.includes(
          specObj.compression as (typeof VALID_COMPRESSION_TYPES)[number]
        )
      ) {
        errors.push({
          path: `target.spec.${specType}.compression`,
          message: `compression must be one of: ${VALID_COMPRESSION_TYPES.join(', ')}`
        })
      }
    }

    // Validate nested format object (e.g., spec.files.format.compression)
    if (specObj.format !== undefined) {
      if (typeof specObj.format === 'object' && specObj.format !== null) {
        const formatObj = specObj.format as Record<string, unknown>

        // Validate compression inside format object
        if (formatObj.compression !== undefined) {
          if (
            typeof formatObj.compression !== 'string' ||
            !VALID_COMPRESSION_TYPES.includes(
              formatObj.compression as (typeof VALID_COMPRESSION_TYPES)[number]
            )
          ) {
            errors.push({
              path: `target.spec.${specType}.format.compression`,
              message: `compression must be one of: ${VALID_COMPRESSION_TYPES.join(', ')}`
            })
          }
        }

        // Validate type inside format object (some specs use format.type for file format)
        if (formatObj.type !== undefined) {
          if (
            typeof formatObj.type !== 'string' ||
            !VALID_FILE_FORMATS.includes(formatObj.type as (typeof VALID_FILE_FORMATS)[number])
          ) {
            errors.push({
              path: `target.spec.${specType}.format.type`,
              message: `format type must be one of: ${VALID_FILE_FORMATS.join(', ')}`
            })
          }
        }
      } else if (typeof specObj.format === 'string') {
        // format can also be a string directly (e.g., spec.local.format: "csv")
        if (!VALID_FILE_FORMATS.includes(specObj.format as (typeof VALID_FILE_FORMATS)[number])) {
          errors.push({
            path: `target.spec.${specType}.format`,
            message: `format must be one of: ${VALID_FILE_FORMATS.join(', ')}`
          })
        }
      }
    }
  }
}

function validateLimits(limits: unknown, errors: ValidationError[]): void {
  if (typeof limits !== 'object' || limits === null) {
    errors.push({ path: 'limits', message: 'Limits must be an object' })
    return
  }

  const lim = limits as Record<string, unknown>

  // numberOfEvents must be >= 0
  if (lim.numberOfEvents !== undefined) {
    if (typeof lim.numberOfEvents !== 'number' || lim.numberOfEvents < 0) {
      errors.push({
        path: 'limits.numberOfEvents',
        message: 'numberOfEvents must be 0 or greater'
      })
    }
  }

  // elapsedTime must be >= 0
  if (lim.elapsedTime !== undefined) {
    if (typeof lim.elapsedTime !== 'number' || lim.elapsedTime < 0) {
      errors.push({
        path: 'limits.elapsedTime',
        message: 'elapsedTime must be 0 or greater'
      })
    }
  }
}

/**
 * Parses JSON string and validates it as a stream configuration
 */
export function parseAndValidateStreamConfig(
  jsonString: string,
  originalConfig?: StreamConfig
): ValidationResult & { parsed?: unknown } {
  try {
    const parsed = JSON.parse(jsonString)
    const result = validateStreamConfig(parsed, originalConfig)
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
 * Formats validation errors for display
 */
export function formatValidationErrors(errors: ValidationError[]): string {
  return errors.map((e) => (e.path ? `${e.path}: ${e.message}` : e.message)).join('\n')
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

  // Get the last meaningful key to search for
  let searchKey = pathParts[pathParts.length - 1]

  // Handle array index - search for the parent key
  if (/^\d+$/.test(searchKey) && pathParts.length > 1) {
    searchKey = pathParts[pathParts.length - 2]
  }

  // Find line containing the key
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes(`"${searchKey}"`)) {
      return i + 1
    }
  }

  return 1
}
