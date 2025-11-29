import { describe, it, expect } from 'vitest'
import {
  buildDatabaseConnectionSpec,
  buildS3ConnectionSpec,
  buildDatabaseTargetSpec,
  buildS3TargetSpec
} from '../utils/specBuilder'

describe('Connection Spec Builders', () => {
  it('builds database connection spec', () => {
    const spec = buildDatabaseConnectionSpec('localhost', 5432, 'postgres', 'password', 'testdb')

    expect(spec.database).toBeDefined()
    expect(spec.database?.host).toBe('localhost')
    expect(spec.database?.port).toBe(5432)
    expect(spec.database?.username).toBe('postgres')
    expect(spec.database?.password).toBe('password')
    expect(spec.database?.database).toBe('testdb')
  })

  it('builds S3 connection spec', () => {
    const spec = buildS3ConnectionSpec(
      'us-east-1',
      undefined,
      'AKIAIOSFODNN7EXAMPLE',
      'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
      undefined,
      'my-bucket',
      'prefix/'
    )

    expect(spec.s3).toBeDefined()
    expect(spec.s3?.region).toBe('us-east-1')
    expect(spec.s3?.credentials?.accessKey).toBe('AKIAIOSFODNN7EXAMPLE')
    expect(spec.s3?.credentials?.secretKey).toBe('wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY')
    expect(spec.s3?.scope?.bucket).toBe('my-bucket')
    expect(spec.s3?.scope?.prefix).toBe('prefix/')
  })
})

describe('Target Spec Builders', () => {
  it('builds database target spec', () => {
    const spec = buildDatabaseTargetSpec('targetdb', 'public', {
      tables: 'create',
      indexes: true,
      foreignKeys: false
    })

    expect(spec.database).toBeDefined()
    expect(spec.database?.database).toBe('targetdb')
    expect(spec.database?.schema).toBe('public')
    // Backend expects: tables, indexes, foreignKeys
    expect(spec.database?.structureOptions?.tables).toBe(true)
    expect(spec.database?.structureOptions?.indexes).toBe(true)
    expect(spec.database?.structureOptions?.foreignKeys).toBe(false)
  })

  it('builds S3 target spec', () => {
    const spec = buildS3TargetSpec(
      '/tmp/staging',
      'parquet',
      'my-data-lake',
      'exports/',
      'INTELLIGENT_TIERING',
      false,
      'zstd'
    )

    expect(spec.s3).toBeDefined()
    expect(spec.s3?.outputDirectory).toBe('/tmp/staging')
    expect(spec.s3?.fileFormat).toBe('parquet')
    expect(spec.s3?.format?.compression).toBe('zstd')
    expect(spec.s3?.upload.bucket).toBe('my-data-lake')
    expect(spec.s3?.upload.prefix).toBe('exports/')
    expect(spec.s3?.upload.storageClass).toBe('INTELLIGENT_TIERING')
    expect(spec.s3?.upload.keepLocalFiles).toBe(false)
  })
})
