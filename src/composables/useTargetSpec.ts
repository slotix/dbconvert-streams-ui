/**
 * Composable for working with target spec following backend structure.
 * Backend TargetConfig only has: id and spec (no options field).
 * This replaces the obsolete target.options pattern.
 */
import { computed } from 'vue'
import type { TargetSpec, FileFormatSpec, S3UploadConfig, S3Spec } from '@/types/specs'
import type { StreamConfig } from '@/types/streamConfig'

/**
 * Get the active file spec from a target spec (files, s3, gcs, azure, or snowflake staging)
 */
export function getFileSpec(spec: TargetSpec | undefined) {
  if (!spec) return undefined
  if (spec.files) return spec.files
  if (spec.s3) return spec.s3
  if (spec.gcs) return spec.gcs
  if (spec.azure) return spec.azure
  if (spec.snowflake?.staging) return spec.snowflake.staging
  return undefined
}

/**
 * Get the format spec from a target spec
 */
export function getFormatSpec(spec: TargetSpec | undefined): FileFormatSpec | undefined {
  const fileSpec = getFileSpec(spec)
  return fileSpec?.format
}

/**
 * Check if this is a file-based target (files, s3, gcs, azure)
 */
export function isFileBasedTarget(spec: TargetSpec | undefined): boolean {
  if (!spec) return false
  return !!(spec.files || spec.s3 || spec.gcs || spec.azure)
}

/**
 * Check if this is an S3 target
 */
export function isS3Target(spec: TargetSpec | undefined): boolean {
  return !!spec?.s3
}

/**
 * Check if this is a database target
 */
export function isDatabaseTarget(spec: TargetSpec | undefined): boolean {
  return !!spec?.database
}

// Default S3 spec with required fields
const defaultS3Spec = (): S3Spec => ({
  outputDirectory: '/tmp/dbconvert',
  fileFormat: 'csv',
  upload: { bucket: '' }
})

// Helper to ensure S3 spec exists
const ensureS3Spec = (spec: TargetSpec): S3Spec => {
  if (!spec.s3) {
    spec.s3 = defaultS3Spec()
  }
  return spec.s3
}

/**
 * Composable for reading/writing target spec fields in a reactive way
 */
export function useTargetSpec(streamConfig: StreamConfig) {
  // Ensure spec exists
  const ensureSpec = (): TargetSpec => {
    if (!streamConfig.target.spec) {
      streamConfig.target.spec = {}
    }
    return streamConfig.target.spec
  }

  // Ensure format exists for file-based specs
  const ensureFormat = (): FileFormatSpec => {
    const spec = ensureSpec()
    const fileSpec = getFileSpec(spec)
    if (fileSpec && !fileSpec.format) {
      fileSpec.format = {}
    }
    return fileSpec?.format || {}
  }

  // File format (csv, jsonl, parquet) - reads from spec.{s3|files|gcs|azure}.fileFormat
  const fileFormat = computed({
    get: () => {
      const fileSpec = getFileSpec(streamConfig.target.spec)
      return fileSpec?.fileFormat || 'csv'
    },
    set: (value: string) => {
      const spec = ensureSpec()
      const fileSpec = getFileSpec(spec)
      if (fileSpec) {
        fileSpec.fileFormat = value
      }
    }
  })

  // Compression
  const compression = computed({
    get: () => getFormatSpec(streamConfig.target.spec)?.compression || 'zstd',
    set: (value: string) => {
      const format = ensureFormat()
      format.compression = value
    }
  })

  // UseDuckDB
  const useDuckDB = computed({
    get: () => getFormatSpec(streamConfig.target.spec)?.useDuckDB ?? true,
    set: (value: boolean) => {
      const format = ensureFormat()
      format.useDuckDB = value
    }
  })

  // S3 Upload config
  const s3Upload = computed({
    get: () => streamConfig.target.spec?.s3?.upload,
    set: (value: S3UploadConfig | undefined) => {
      const spec = ensureSpec()
      const s3 = ensureS3Spec(spec)
      if (value) {
        s3.upload = value
      }
    }
  })

  const s3Bucket = computed({
    get: () => streamConfig.target.spec?.s3?.upload?.bucket || '',
    set: (value: string) => {
      const spec = ensureSpec()
      const s3 = ensureS3Spec(spec)
      s3.upload.bucket = value
    }
  })

  const s3Prefix = computed({
    get: () => streamConfig.target.spec?.s3?.upload?.prefix || '',
    set: (value: string) => {
      const spec = ensureSpec()
      const s3 = ensureS3Spec(spec)
      s3.upload.prefix = value
    }
  })

  const s3StorageClass = computed({
    get: () => streamConfig.target.spec?.s3?.upload?.storageClass || 'STANDARD',
    set: (value: string) => {
      const spec = ensureSpec()
      const s3 = ensureS3Spec(spec)
      s3.upload.storageClass = value
    }
  })

  const s3ServerSideEnc = computed({
    get: () => streamConfig.target.spec?.s3?.upload?.serverSideEnc || '',
    set: (value: string) => {
      const spec = ensureSpec()
      const s3 = ensureS3Spec(spec)
      s3.upload.serverSideEnc = value
      // Clear KMS key if encryption is not aws:kms
      if (value !== 'aws:kms') {
        s3.upload.kmsKeyId = undefined
      }
    }
  })

  const s3KmsKeyId = computed({
    get: () => streamConfig.target.spec?.s3?.upload?.kmsKeyId || '',
    set: (value: string) => {
      const spec = ensureSpec()
      const s3 = ensureS3Spec(spec)
      s3.upload.kmsKeyId = value
    }
  })

  const s3KeepLocalFiles = computed({
    get: () => streamConfig.target.spec?.s3?.upload?.keepLocalFiles ?? false,
    set: (value: boolean) => {
      const spec = ensureSpec()
      const s3 = ensureS3Spec(spec)
      s3.upload.keepLocalFiles = value
    }
  })

  // Database target fields
  const databaseName = computed({
    get: () => streamConfig.target.spec?.database?.database || '',
    set: (value: string) => {
      const spec = ensureSpec()
      if (!spec.database) {
        spec.database = { database: '' }
      }
      spec.database.database = value
    }
  })

  const schemaName = computed({
    get: () => streamConfig.target.spec?.database?.schema || '',
    set: (value: string) => {
      const spec = ensureSpec()
      if (!spec.database) {
        spec.database = { database: '' }
      }
      spec.database.schema = value
    }
  })

  const structureOptions = computed({
    get: () => streamConfig.target.spec?.database?.structureOptions,
    set: (value) => {
      const spec = ensureSpec()
      if (!spec.database) {
        spec.database = { database: '' }
      }
      spec.database.structureOptions = value
    }
  })

  const skipData = computed({
    get: () => streamConfig.target.spec?.database?.skipData ?? false,
    set: (value: boolean) => {
      const spec = ensureSpec()
      if (!spec.database) {
        spec.database = { database: '' }
      }
      spec.database.skipData = value
    }
  })

  return {
    // File format settings
    fileFormat,
    compression,
    useDuckDB,

    // S3 upload settings
    s3Upload,
    s3Bucket,
    s3Prefix,
    s3StorageClass,
    s3ServerSideEnc,
    s3KmsKeyId,
    s3KeepLocalFiles,

    // Database settings
    databaseName,
    schemaName,
    structureOptions,
    skipData,

    // Helper functions
    isFileBasedTarget: () => isFileBasedTarget(streamConfig.target.spec),
    isS3Target: () => isS3Target(streamConfig.target.spec),
    isDatabaseTarget: () => isDatabaseTarget(streamConfig.target.spec)
  }
}
