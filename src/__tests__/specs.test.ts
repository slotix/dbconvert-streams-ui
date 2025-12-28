import { describe, it, expect } from 'vitest'
import {
  getConnectionKindFromSpec,
  isFileBasedKind,
  isCloudStorageKind,
  isDatabaseKind,
  type ConnectionSpec
} from '../types/specs'

describe('getConnectionKindFromSpec', () => {
  it('returns null for undefined spec', () => {
    expect(getConnectionKindFromSpec(undefined)).toBeNull()
  })

  it('returns null for empty spec', () => {
    expect(getConnectionKindFromSpec({} as ConnectionSpec)).toBeNull()
  })

  it('returns "database" for database spec', () => {
    const spec: ConnectionSpec = {
      database: { host: 'localhost', port: 5432, username: 'user' }
    }
    expect(getConnectionKindFromSpec(spec)).toBe('database')
  })

  it('returns "s3" for S3 spec', () => {
    const spec: ConnectionSpec = {
      s3: { region: 'us-east-1' }
    }
    expect(getConnectionKindFromSpec(spec)).toBe('s3')
  })

  it('returns "gcs" for GCS spec', () => {
    const spec: ConnectionSpec = {
      gcs: {}
    }
    expect(getConnectionKindFromSpec(spec)).toBe('gcs')
  })

  it('returns "azure" for Azure spec', () => {
    const spec: ConnectionSpec = {
      azure: { accountName: 'myaccount' }
    }
    expect(getConnectionKindFromSpec(spec)).toBe('azure')
  })

  it('returns "snowflake" for Snowflake spec', () => {
    const spec: ConnectionSpec = {
      snowflake: { account: 'xy12345', username: 'user' }
    }
    expect(getConnectionKindFromSpec(spec)).toBe('snowflake')
  })

  it('returns "files" for files spec', () => {
    const spec: ConnectionSpec = {
      files: { basePath: '/data/files' }
    }
    expect(getConnectionKindFromSpec(spec)).toBe('files')
  })
})

describe('isFileBasedKind', () => {
  it('returns true for "s3"', () => {
    expect(isFileBasedKind('s3')).toBe(true)
  })

  it('returns true for "gcs"', () => {
    expect(isFileBasedKind('gcs')).toBe(true)
  })

  it('returns true for "azure"', () => {
    expect(isFileBasedKind('azure')).toBe(true)
  })

  it('returns true for "files"', () => {
    expect(isFileBasedKind('files')).toBe(true)
  })

  it('returns false for "database"', () => {
    expect(isFileBasedKind('database')).toBe(false)
  })

  it('returns false for "snowflake"', () => {
    expect(isFileBasedKind('snowflake')).toBe(false)
  })

  it('returns false for null', () => {
    expect(isFileBasedKind(null)).toBe(false)
  })
})

describe('isCloudStorageKind', () => {
  it('returns true for "s3"', () => {
    expect(isCloudStorageKind('s3')).toBe(true)
  })

  it('returns true for "gcs"', () => {
    expect(isCloudStorageKind('gcs')).toBe(true)
  })

  it('returns true for "azure"', () => {
    expect(isCloudStorageKind('azure')).toBe(true)
  })

  it('returns false for "files"', () => {
    expect(isCloudStorageKind('files')).toBe(false)
  })

  it('returns false for "database"', () => {
    expect(isCloudStorageKind('database')).toBe(false)
  })

  it('returns false for null', () => {
    expect(isCloudStorageKind(null)).toBe(false)
  })
})

describe('isDatabaseKind', () => {
  it('returns true for "database"', () => {
    expect(isDatabaseKind('database')).toBe(true)
  })

  it('returns true for "snowflake"', () => {
    expect(isDatabaseKind('snowflake')).toBe(true)
  })

  it('returns false for "s3"', () => {
    expect(isDatabaseKind('s3')).toBe(false)
  })

  it('returns false for "files"', () => {
    expect(isDatabaseKind('files')).toBe(false)
  })

  it('returns false for null', () => {
    expect(isDatabaseKind(null)).toBe(false)
  })
})
