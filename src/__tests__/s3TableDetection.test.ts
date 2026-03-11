import { describe, expect, it } from 'vitest'
import {
  detectTableFolder,
  isManifestMetadataFile,
  isManifestMetadataFolder,
  isManifestMetadataPath
} from '@/utils/s3TableDetection'

describe('s3TableDetection', () => {
  it('recognizes canonical and variant manifest file names', () => {
    expect(isManifestMetadataFile('manifest.json')).toBe(true)
    expect(isManifestMetadataFile('_manifest.json')).toBe(true)
    expect(isManifestMetadataFile('manifest-20260311.json')).toBe(true)
    expect(isManifestMetadataFile('actor-manifest-20260311.json')).toBe(false)
    expect(isManifestMetadataFolder('manifests')).toBe(true)
    expect(isManifestMetadataFile('part-0-001.parquet')).toBe(false)
  })

  it('treats JSON files inside manifests folders as manifest files', () => {
    expect(isManifestMetadataPath('s3://bucket/manifests/api-generated-20260310.json')).toBe(true)
    expect(isManifestMetadataPath('s3://bucket/exports/manifest.json')).toBe(true)
    expect(isManifestMetadataPath('s3://bucket/exports/orders.json')).toBe(false)
  })

  it('ignores manifest files when detecting parquet table folders', () => {
    const result = detectTableFolder([
      {
        name: 'part-0-001.parquet',
        size: 10,
        fullKey: 'bucket/run/part-0-001.parquet'
      },
      {
        name: 'part-1-001.parquet',
        size: 12,
        fullKey: 'bucket/run/part-1-001.parquet'
      },
      {
        name: 'manifest.json',
        size: 99,
        fullKey: 'bucket/run/manifest.json'
      }
    ])

    expect(result).toEqual({
      isTable: true,
      format: 'parquet',
      fileCount: 2,
      totalSize: 22
    })
  })

  it('does not treat a folder with only manifest metadata files as a table', () => {
    const result = detectTableFolder([
      {
        name: 'manifest.json',
        size: 99,
        fullKey: 'bucket/run/manifest.json'
      }
    ])

    expect(result).toEqual({
      isTable: false,
      fileCount: 0,
      totalSize: 0
    })
  })

  it('does not treat a manifests folder as a data table', () => {
    const result = detectTableFolder(
      [
        {
          name: 'actor-manifest-20260310.json',
          size: 99,
          fullKey: 'bucket/manifests/actor-manifest-20260310.json'
        }
      ],
      'manifests'
    )

    expect(result).toEqual({
      isTable: false,
      fileCount: 0,
      totalSize: 0
    })
  })
})
