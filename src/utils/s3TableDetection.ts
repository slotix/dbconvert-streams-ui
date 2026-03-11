import type { FileFormat } from '@/utils/fileFormat'

export interface S3FolderFile {
  name: string
  size: number
  fullKey: string
}

export function isManifestMetadataFolder(name: string): boolean {
  return name.trim().toLowerCase() === 'manifests'
}

export function isManifestMetadataFile(filename: string): boolean {
  const normalized = filename.trim().toLowerCase()
  if (!normalized.endsWith('.json')) {
    return false
  }

  return (
    normalized === 'manifest.json' ||
    normalized === '_manifest.json' ||
    normalized.startsWith('manifest-')
  )
}

export function isManifestMetadataPath(path: string): boolean {
  const normalized = path.trim().toLowerCase()
  if (!normalized.endsWith('.json')) {
    return false
  }

  if (normalized.includes('/manifests/')) {
    return true
  }

  const filename = normalized.split('/').pop() || normalized
  return isManifestMetadataFile(filename)
}

export function detectTableFolder(
  files: S3FolderFile[],
  folderName?: string
): {
  isTable: boolean
  format?: FileFormat
  fileCount: number
  totalSize: number
} {
  if (folderName && isManifestMetadataFolder(folderName)) {
    return { isTable: false, fileCount: 0, totalSize: 0 }
  }

  const dataFiles = files.filter((file) => !isManifestMetadataFile(file.name))
  if (dataFiles.length === 0) {
    return { isTable: false, fileCount: 0, totalSize: 0 }
  }

  const extensions = new Set<string>()
  let totalSize = 0

  for (const file of dataFiles) {
    const ext = getFullExtension(file.name)
    if (!ext) return { isTable: false, fileCount: 0, totalSize: 0 }

    extensions.add(ext)
    totalSize += file.size
  }

  if (extensions.size !== 1) {
    return { isTable: false, fileCount: 0, totalSize: 0 }
  }

  const extension = Array.from(extensions)[0]
  const format = getFormatFromExtension(extension)
  if (!format) {
    return { isTable: false, fileCount: 0, totalSize: 0 }
  }

  return {
    isTable: true,
    format,
    fileCount: dataFiles.length,
    totalSize
  }
}

function getFullExtension(filename: string): string {
  const parts = filename.split('.')
  if (parts.length < 2) return ''

  const lastExt = parts[parts.length - 1].toLowerCase()
  const secondLastExt = parts.length >= 3 ? parts[parts.length - 2].toLowerCase() : ''

  const compressedExts = ['gz', 'gzip', 'zst', 'zstd', 'bz2', 'lz4', 'snappy']
  const dataExts = ['csv', 'json', 'jsonl', 'parquet']

  if (compressedExts.includes(lastExt) && dataExts.includes(secondLastExt)) {
    return `.${secondLastExt}.${lastExt}`
  }
  if (dataExts.includes(lastExt)) {
    return `.${lastExt}`
  }

  return ''
}

function getFormatFromExtension(ext: string): FileFormat | null {
  if (ext.includes('.csv')) return 'csv'
  if (ext.includes('.json')) return ext.includes('.jsonl') ? 'jsonl' : 'json'
  if (ext.includes('.parquet')) return 'parquet'
  return null
}
