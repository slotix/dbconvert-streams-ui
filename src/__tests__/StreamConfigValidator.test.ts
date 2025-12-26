import { describe, it, expect } from 'vitest'
import {
  validateStreamConfig,
  parseAndValidateStreamConfig,
  formatValidationErrors,
  findLineForPath
} from '@/utils/StreamConfigValidator'
import type { StreamConfig } from '@/types/streamConfig'

describe('StreamConfigValidator', () => {
  const validConfig = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    name: 'Test Stream',
    mode: 'convert',
    source: {
      connections: [{ alias: 'src', connectionId: 'conn-source-123' }],
      tables: [{ name: 'users' }]
    },
    target: {
      id: 'conn-target-456'
    }
  }

  describe('validateStreamConfig', () => {
    it('should validate a correct configuration', () => {
      const result = validateStreamConfig(validConfig)
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should reject null config', () => {
      const result = validateStreamConfig(null)
      expect(result.valid).toBe(false)
      expect(result.errors[0].message).toBe('Configuration must be an object')
    })

    it('should reject non-object config', () => {
      const result = validateStreamConfig('not an object')
      expect(result.valid).toBe(false)
      expect(result.errors[0].message).toBe('Configuration must be an object')
    })

    it('should require name field', () => {
      const config = { ...validConfig, name: undefined }
      const result = validateStreamConfig(config)
      expect(result.valid).toBe(false)
      expect(result.errors.some((e) => e.path === 'name')).toBe(true)
    })

    it('should reject empty name', () => {
      const config = { ...validConfig, name: '   ' }
      const result = validateStreamConfig(config)
      expect(result.valid).toBe(false)
      expect(result.errors.some((e) => e.message === 'Name cannot be empty')).toBe(true)
    })

    it('should require mode field', () => {
      const config = { ...validConfig, mode: undefined }
      const result = validateStreamConfig(config)
      expect(result.valid).toBe(false)
      expect(result.errors.some((e) => e.path === 'mode')).toBe(true)
    })

    it('should validate mode enum values', () => {
      const config = { ...validConfig, mode: 'invalid' }
      const result = validateStreamConfig(config)
      expect(result.valid).toBe(false)
      expect(result.errors.some((e) => e.message.includes("'convert' or 'cdc'"))).toBe(true)
    })

    it('should accept cdc mode', () => {
      const config = { ...validConfig, mode: 'cdc' }
      const result = validateStreamConfig(config)
      expect(result.valid).toBe(true)
    })

    it('should require source field', () => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { source, ...configWithoutSource } = validConfig
      const result = validateStreamConfig(configWithoutSource)
      expect(result.valid).toBe(false)
      expect(result.errors.some((e) => e.path === 'source')).toBe(true)
    })

    it('should require target field', () => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { target, ...configWithoutTarget } = validConfig
      const result = validateStreamConfig(configWithoutTarget)
      expect(result.valid).toBe(false)
      expect(result.errors.some((e) => e.path === 'target')).toBe(true)
    })
  })

  describe('source validation', () => {
    it('should reject non-object source', () => {
      const config = { ...validConfig, source: 'invalid' }
      const result = validateStreamConfig(config)
      expect(result.valid).toBe(false)
      expect(result.errors.some((e) => e.message === 'Source must be an object')).toBe(true)
    })

    it('should require source.connections', () => {
      const config = {
        ...validConfig,
        source: { tables: [{ name: 'users' }] }
      }
      const result = validateStreamConfig(config)
      expect(result.valid).toBe(false)
      expect(result.errors.some((e) => e.path === 'source.connections')).toBe(true)
    })

    it('should require alias and connectionId for each connection', () => {
      const config = {
        ...validConfig,
        source: {
          connections: [{ alias: '', connectionId: 'conn-1' }, { alias: 'a' }],
          tables: [{ name: 'users' }]
        }
      }
      const result = validateStreamConfig(config)
      expect(result.valid).toBe(false)
      expect(result.errors.some((e) => e.message === 'Connection alias is required')).toBe(true)
      expect(result.errors.some((e) => e.message === 'Connection ID is required')).toBe(true)
    })

    it('should require unique aliases', () => {
      const config = {
        ...validConfig,
        source: {
          connections: [
            { alias: 'dup', connectionId: 'conn-1' },
            { alias: 'dup', connectionId: 'conn-2' }
          ],
          tables: [{ name: 'dup.users' }]
        }
      }
      const result = validateStreamConfig(config)
      expect(result.valid).toBe(false)
      expect(result.errors.some((e) => e.message === 'Connection alias must be unique')).toBe(true)
    })

    it('should require at least one table or query', () => {
      const config = {
        ...validConfig,
        source: { connections: [{ alias: 'src', connectionId: 'conn-123' }], tables: [] }
      }
      const result = validateStreamConfig(config)
      expect(result.valid).toBe(false)
      expect(
        result.errors.some(
          (e) => e.message === 'At least one table, query, or S3 selection is required'
        )
      ).toBe(true)
    })

    it('should allow S3 sources without tables or queries', () => {
      const config = {
        ...validConfig,
        source: {
          connections: [
            {
              alias: 'src',
              connectionId: 'conn-123',
              s3: {
                bucket: 'my-bucket',
                prefixes: ['sakila/actor/']
              }
            }
          ]
        }
      }
      const result = validateStreamConfig(config)
      expect(result.valid).toBe(true)
    })

    it('should reject mixing S3 sources with tables', () => {
      const config = {
        ...validConfig,
        source: {
          connections: [
            {
              alias: 'src',
              connectionId: 'conn-123',
              s3: {
                bucket: 'my-bucket',
                prefixes: ['sakila/actor/']
              }
            }
          ],
          tables: [{ name: 'users' }]
        }
      }
      const result = validateStreamConfig(config)
      expect(result.valid).toBe(false)
      expect(
        result.errors.some(
          (e) =>
            e.path === 'source.connections[0].s3' &&
            e.message.includes('Single-source S3 streams must not set')
        )
      ).toBe(true)
    })

    it('should validate S3 prefixes end with /', () => {
      const config = {
        ...validConfig,
        source: {
          connections: [
            {
              alias: 'src',
              connectionId: 'conn-123',
              s3: {
                bucket: 'my-bucket',
                prefixes: ['sakila/actor'] // missing trailing /
              }
            }
          ]
        }
      }
      const result = validateStreamConfig(config)
      expect(result.valid).toBe(false)
      expect(result.errors.some((e) => e.message.includes("must end with '/'"))).toBe(true)
    })

    it('should validate S3 objects do not end with /', () => {
      const config = {
        ...validConfig,
        source: {
          connections: [
            {
              alias: 'src',
              connectionId: 'conn-123',
              s3: {
                bucket: 'my-bucket',
                objects: ['sakila/actor.parquet/'] // should not end with /
              }
            }
          ]
        }
      }
      const result = validateStreamConfig(config)
      expect(result.valid).toBe(false)
      expect(result.errors.some((e) => e.message.includes("must not end with '/'"))).toBe(true)
    })

    it('should allow S3 sources with objects', () => {
      const config = {
        ...validConfig,
        source: {
          connections: [
            {
              alias: 'src',
              connectionId: 'conn-123',
              s3: {
                bucket: 'my-bucket',
                objects: ['data/file1.parquet', 'data/file2.parquet']
              }
            }
          ]
        }
      }
      const result = validateStreamConfig(config)
      expect(result.valid).toBe(true)
    })

    it('should allow S3 sources with both prefixes and objects', () => {
      const config = {
        ...validConfig,
        source: {
          connections: [
            {
              alias: 'src',
              connectionId: 'conn-123',
              s3: {
                bucket: 'my-bucket',
                prefixes: ['sakila/actor/', 'sakila/film/'],
                objects: ['standalone.parquet']
              }
            }
          ]
        }
      }
      const result = validateStreamConfig(config)
      expect(result.valid).toBe(true)
    })

    it('should require table name', () => {
      const config = {
        ...validConfig,
        source: {
          connections: [{ alias: 'src', connectionId: 'conn-123' }],
          tables: [{ name: '' }]
        }
      }
      const result = validateStreamConfig(config)
      expect(result.valid).toBe(false)
      expect(result.errors.some((e) => e.message === 'Table name is required')).toBe(true)
    })

    it('should accept tables with optional filter', () => {
      const config = {
        ...validConfig,
        source: {
          connections: [{ alias: 'src', connectionId: 'conn-123' }],
          tables: [{ name: 'users', filter: { limit: 100 } }]
        }
      }
      const result = validateStreamConfig(config)
      expect(result.valid).toBe(true)
    })

    it('should reject filter that is not an object', () => {
      const config = {
        ...validConfig,
        source: {
          connections: [{ alias: 'src', connectionId: 'conn-123' }],
          tables: [{ name: 'users', filter: 'invalid' }]
        }
      }
      const result = validateStreamConfig(config)
      expect(result.valid).toBe(false)
      expect(result.errors.some((e) => e.message === 'Filter must be an object')).toBe(true)
    })

    it('should validate dataBundleSize > 0', () => {
      const config = {
        ...validConfig,
        source: {
          connections: [{ alias: 'src', connectionId: 'conn-123' }],
          tables: [{ name: 'users' }],
          options: { dataBundleSize: 0 }
        }
      }
      const result = validateStreamConfig(config)
      expect(result.valid).toBe(false)
      expect(result.errors.some((e) => e.message === 'dataBundleSize must be greater than 0')).toBe(
        true
      )
    })

    it('should validate operations array', () => {
      const config = {
        ...validConfig,
        source: {
          connections: [{ alias: 'src', connectionId: 'conn-123' }],
          tables: [{ name: 'users' }],
          options: { operations: ['insert', 'invalid'] }
        }
      }
      const result = validateStreamConfig(config)
      expect(result.valid).toBe(false)
      expect(result.errors.some((e) => e.message.includes('Invalid operation'))).toBe(true)
    })

    it('should accept valid operations', () => {
      const config = {
        ...validConfig,
        source: {
          connections: [{ alias: 'src', connectionId: 'conn-123' }],
          tables: [{ name: 'users' }],
          options: { operations: ['insert', 'update', 'delete'] }
        }
      }
      const result = validateStreamConfig(config)
      expect(result.valid).toBe(true)
    })

    it('should require alias-prefixed table names for multi-source', () => {
      const config = {
        ...validConfig,
        source: {
          connections: [
            { alias: 'a', connectionId: 'conn-a' },
            { alias: 'b', connectionId: 'conn-b' }
          ],
          tables: [{ name: 'users' }]
        }
      }
      const result = validateStreamConfig(config)
      expect(result.valid).toBe(false)
      expect(
        result.errors.some(
          (e) => e.message === 'Table name must be prefixed with a valid connection alias'
        )
      ).toBe(true)
    })
  })

  describe('target validation', () => {
    it('should reject non-object target', () => {
      const config = { ...validConfig, target: 'invalid' }
      const result = validateStreamConfig(config)
      expect(result.valid).toBe(false)
      expect(result.errors.some((e) => e.message === 'Target must be an object')).toBe(true)
    })

    it('should require target.id', () => {
      const config = {
        ...validConfig,
        target: {}
      }
      const result = validateStreamConfig(config)
      expect(result.valid).toBe(false)
      expect(result.errors.some((e) => e.path === 'target.id')).toBe(true)
    })
  })

  describe('limits validation', () => {
    it('should validate numberOfEvents >= 0', () => {
      const config = {
        ...validConfig,
        limits: { numberOfEvents: -1 }
      }
      const result = validateStreamConfig(config)
      expect(result.valid).toBe(false)
      expect(result.errors.some((e) => e.message === 'numberOfEvents must be 0 or greater')).toBe(
        true
      )
    })

    it('should validate elapsedTime >= 0', () => {
      const config = {
        ...validConfig,
        limits: { elapsedTime: -10 }
      }
      const result = validateStreamConfig(config)
      expect(result.valid).toBe(false)
      expect(result.errors.some((e) => e.message === 'elapsedTime must be 0 or greater')).toBe(true)
    })

    it('should accept valid limits', () => {
      const config = {
        ...validConfig,
        limits: { numberOfEvents: 1000, elapsedTime: 3600 }
      }
      const result = validateStreamConfig(config)
      expect(result.valid).toBe(true)
    })
  })

  describe('immutable fields', () => {
    it('should detect modification of id field', () => {
      const original = { ...validConfig } as StreamConfig
      const modified = { ...validConfig, id: 'different-id' }
      const result = validateStreamConfig(modified, original)
      expect(result.valid).toBe(false)
      expect(result.errors.some((e) => e.message === "Field 'id' cannot be modified")).toBe(true)
    })

    it('should detect modification of created field', () => {
      const original = { ...validConfig, created: 1234567890 } as StreamConfig
      const modified = { ...validConfig, created: 9999999999 }
      const result = validateStreamConfig(modified, original)
      expect(result.valid).toBe(false)
      expect(result.errors.some((e) => e.message === "Field 'created' cannot be modified")).toBe(
        true
      )
    })

    it('should allow modification of other fields', () => {
      const original = { ...validConfig } as StreamConfig
      const modified = { ...validConfig, name: 'New Name' }
      const result = validateStreamConfig(modified, original)
      expect(result.valid).toBe(true)
    })
  })

  describe('parseAndValidateStreamConfig', () => {
    it('should parse and validate valid JSON', () => {
      const json = JSON.stringify(validConfig)
      const result = parseAndValidateStreamConfig(json)
      expect(result.valid).toBe(true)
      expect(result.parsed).toEqual(validConfig)
    })

    it('should return error for invalid JSON', () => {
      const result = parseAndValidateStreamConfig('{ invalid json }')
      expect(result.valid).toBe(false)
      expect(result.errors[0].message).toContain('Invalid JSON')
    })

    it('should validate parsed content', () => {
      const invalidConfig = { name: 'Test' } // missing required fields
      const json = JSON.stringify(invalidConfig)
      const result = parseAndValidateStreamConfig(json)
      expect(result.valid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    })
  })

  describe('formatValidationErrors', () => {
    it('should format errors with path', () => {
      const errors = [
        { path: 'source.connections', message: 'Source connections are required' },
        { path: 'target.id', message: 'Target connection ID is required' }
      ]
      const formatted = formatValidationErrors(errors)
      expect(formatted).toContain('source.connections: Source connections are required')
      expect(formatted).toContain('target.id: Target connection ID is required')
    })

    it('should format errors without path', () => {
      const errors = [{ path: '', message: 'Configuration must be an object' }]
      const formatted = formatValidationErrors(errors)
      expect(formatted).toBe('Configuration must be an object')
    })
  })

  describe('findLineForPath', () => {
    const json = `{
  "name": "Test Stream",
  "mode": "convert",
  "source": {
    "connections": [
      { "alias": "src", "connectionId": "conn-123" }
    ],
    "tables": [
      { "name": "users" }
    ]
  }
}`

    it('should find line for simple path', () => {
      const line = findLineForPath(json, 'name')
      expect(line).toBe(2)
    })

    it('should find line for nested path', () => {
      const line = findLineForPath(json, 'source.connections')
      expect(line).toBe(5)
    })

    it('should return 1 for empty path', () => {
      const line = findLineForPath(json, '')
      expect(line).toBe(1)
    })

    it('should return 1 for non-existent path', () => {
      const line = findLineForPath(json, 'nonexistent.path')
      expect(line).toBe(1)
    })
  })

  describe('immutable connection IDs', () => {
    const originalConfig: StreamConfig = {
      id: 'stream-123',
      name: 'Test Stream',
      mode: 'convert',
      created: 1234567890,
      source: {
        connections: [{ alias: 'src', connectionId: 'conn-source-original' }],
        tables: [{ name: 'users' }]
      },
      target: {
        id: 'conn-target-original'
      }
    }

    it('should reject changes to source.connections', () => {
      const modifiedConfig = {
        ...originalConfig,
        source: {
          ...originalConfig.source,
          connections: [{ alias: 'src', connectionId: 'conn-source-changed' }]
        }
      }
      const result = validateStreamConfig(modifiedConfig, originalConfig)
      expect(result.valid).toBe(false)
      expect(result.errors.some((e) => e.path === 'source.connections')).toBe(true)
      expect(result.errors.some((e) => e.message.includes('cannot be modified'))).toBe(true)
    })

    it('should reject changes to target.id', () => {
      const modifiedConfig = {
        ...originalConfig,
        target: {
          ...originalConfig.target,
          id: 'conn-target-changed'
        }
      }
      const result = validateStreamConfig(modifiedConfig, originalConfig)
      expect(result.valid).toBe(false)
      expect(result.errors.some((e) => e.path === 'target.id')).toBe(true)
      expect(result.errors.some((e) => e.message.includes('cannot be modified'))).toBe(true)
    })

    it('should allow keeping same source connections and target.id', () => {
      const result = validateStreamConfig(originalConfig, originalConfig)
      expect(result.valid).toBe(true)
    })
  })

  describe('fileFormat validation in target spec', () => {
    it('should accept valid fileFormat: csv in spec.files', () => {
      const config = {
        ...validConfig,
        target: {
          ...validConfig.target,
          spec: { files: { fileFormat: 'csv' } }
        }
      }
      const result = validateStreamConfig(config)
      expect(result.errors.filter((e) => e.path === 'target.spec.files.fileFormat')).toHaveLength(0)
    })

    it('should accept valid fileFormat: jsonl in spec.s3', () => {
      const config = {
        ...validConfig,
        target: {
          ...validConfig.target,
          spec: { s3: { outputDirectory: '/tmp', fileFormat: 'jsonl', upload: { bucket: 'test' } } }
        }
      }
      const result = validateStreamConfig(config)
      expect(result.errors.filter((e) => e.path === 'target.spec.s3.fileFormat')).toHaveLength(0)
    })

    it('should accept valid fileFormat: parquet in spec.files', () => {
      const config = {
        ...validConfig,
        target: {
          ...validConfig.target,
          spec: { files: { fileFormat: 'parquet' } }
        }
      }
      const result = validateStreamConfig(config)
      expect(result.errors.filter((e) => e.path === 'target.spec.files.fileFormat')).toHaveLength(0)
    })

    it('should reject invalid fileFormat in spec.files', () => {
      const config = {
        ...validConfig,
        target: {
          ...validConfig.target,
          spec: { files: { fileFormat: 'invalid' } }
        }
      }
      const result = validateStreamConfig(config)
      expect(result.valid).toBe(false)
      expect(result.errors.some((e) => e.path === 'target.spec.files.fileFormat')).toBe(true)
      expect(result.errors.some((e) => e.message.includes('csv, jsonl, parquet'))).toBe(true)
    })
  })

  describe('compression validation in target spec', () => {
    it('should accept valid compression: gzip', () => {
      const config = {
        ...validConfig,
        target: {
          ...validConfig.target,
          spec: { local: { compression: 'gzip' } }
        }
      }
      const result = validateStreamConfig(config)
      expect(result.errors.filter((e) => e.path.includes('compression'))).toHaveLength(0)
    })

    it('should accept valid compression: zstd', () => {
      const config = {
        ...validConfig,
        target: {
          ...validConfig.target,
          spec: { s3: { compression: 'zstd' } }
        }
      }
      const result = validateStreamConfig(config)
      expect(result.errors.filter((e) => e.path.includes('compression'))).toHaveLength(0)
    })

    it('should accept valid compression: none', () => {
      const config = {
        ...validConfig,
        target: {
          ...validConfig.target,
          spec: { local: { compression: 'none' } }
        }
      }
      const result = validateStreamConfig(config)
      expect(result.errors.filter((e) => e.path.includes('compression'))).toHaveLength(0)
    })

    it('should reject invalid compression in local spec', () => {
      const config = {
        ...validConfig,
        target: {
          ...validConfig.target,
          spec: { local: { compression: 'zstd1' } }
        }
      }
      const result = validateStreamConfig(config)
      expect(result.valid).toBe(false)
      expect(result.errors.some((e) => e.path === 'target.spec.local.compression')).toBe(true)
    })

    it('should reject invalid compression in s3 spec', () => {
      const config = {
        ...validConfig,
        target: {
          ...validConfig.target,
          spec: { s3: { compression: 'invalid' } }
        }
      }
      const result = validateStreamConfig(config)
      expect(result.valid).toBe(false)
      expect(result.errors.some((e) => e.path === 'target.spec.s3.compression')).toBe(true)
    })

    it('should validate format in spec', () => {
      const config = {
        ...validConfig,
        target: {
          ...validConfig.target,
          spec: { local: { format: 'invalid_format' } }
        }
      }
      const result = validateStreamConfig(config)
      expect(result.valid).toBe(false)
      expect(result.errors.some((e) => e.path === 'target.spec.local.format')).toBe(true)
    })
  })
})
