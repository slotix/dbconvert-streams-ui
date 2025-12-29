/**
 * Path parsing utilities for file system paths (local and S3)
 */

export interface PathSegment {
  name: string
  path: string
}

export interface ParsedS3Uri {
  bucket: string
  prefix: string
}

/**
 * Parse an S3 URI into bucket and prefix components
 * @param uri - S3 URI like "s3://bucket-name/prefix/path"
 * @returns Parsed bucket and prefix, or null if invalid
 */
export function parseS3Uri(uri: string): ParsedS3Uri | null {
  const match = uri.match(/^s3:\/\/([^/]+)(\/(.*))?$/)
  if (!match) return null
  const rawPrefix = match[3] || ''
  const prefix = rawPrefix.replace(/^\/+/, '')
  return { bucket: match[1], prefix }
}

/**
 * Check if a path is an S3 URI
 */
export function isS3Path(path: string): boolean {
  return path.startsWith('s3://')
}

/**
 * Parse a file path into breadcrumb segments
 * Works for both local paths and S3 URIs
 *
 * @param fullPath - Full file path (e.g., "/data/exports/file.csv" or "s3://bucket/prefix/file.csv")
 * @param basePath - Optional base path to exclude from segments (for local files)
 * @returns Array of path segments with names and full paths
 */
export function parsePathToSegments(fullPath: string, basePath?: string): PathSegment[] {
  if (!fullPath) return []

  // Handle S3 paths
  if (isS3Path(fullPath)) {
    return parseS3PathToSegments(fullPath)
  }

  // Handle local paths
  return parseLocalPathToSegments(fullPath, basePath)
}

/**
 * Parse an S3 URI into breadcrumb segments
 * Example: "s3://bucket/folder/subfolder/file.csv"
 * Returns: [{ name: "bucket", path: "s3://bucket" }, { name: "folder", path: "s3://bucket/folder" }, ...]
 */
function parseS3PathToSegments(uri: string): PathSegment[] {
  const parsed = parseS3Uri(uri)
  if (!parsed) return []

  const segments: PathSegment[] = []

  // Add bucket as first segment
  segments.push({
    name: parsed.bucket,
    path: `s3://${parsed.bucket}`
  })

  // Add prefix segments (folders)
  if (parsed.prefix) {
    const parts = parsed.prefix.split('/').filter((p) => p)
    for (let i = 0; i < parts.length; i++) {
      const segmentPath = `s3://${parsed.bucket}/${parts.slice(0, i + 1).join('/')}`
      segments.push({
        name: parts[i],
        path: segmentPath
      })
    }
  }

  return segments
}

/**
 * Parse a local file path into breadcrumb segments
 * Supports both Windows (C:\path) and Unix (/path) style paths
 */
function parseLocalPathToSegments(fullPath: string, basePath?: string): PathSegment[] {
  const segments: PathSegment[] = []

  // Normalize the path to work with
  let workPath = fullPath

  // If basePath is provided, try to remove it from the display
  // but still keep full paths for navigation
  if (basePath) {
    // Normalize both paths for comparison
    const normalizedBase = basePath.replace(/[/\\]+$/, '')
    const normalizedFull = fullPath.replace(/[/\\]+$/, '')

    if (normalizedFull.startsWith(normalizedBase)) {
      workPath = normalizedFull.substring(normalizedBase.length)
      // Remove leading separator
      workPath = workPath.replace(/^[/\\]+/, '')
    }
  }

  // Handle Windows drive roots
  if (fullPath.match(/^[A-Za-z]:\\/)) {
    const drive = fullPath.substring(0, 3)
    segments.push({ name: drive.replace('\\', ''), path: drive })

    const remaining = workPath.match(/^[A-Za-z]:\\/) ? workPath.substring(3) : workPath

    if (remaining) {
      const parts = remaining.split(/[/\\]/).filter((part) => part)
      let currentPath = drive
      for (const part of parts) {
        currentPath = currentPath + part + '\\'
        segments.push({ name: part, path: currentPath.replace(/\\$/, '') })
      }
    }
  } else {
    // Unix-style paths
    const parts = workPath.split('/').filter((part) => part)

    // Build segments with full paths
    let currentPath = basePath ? basePath.replace(/\/+$/, '') : ''
    for (const part of parts) {
      currentPath = currentPath + '/' + part
      segments.push({ name: part, path: currentPath })
    }
  }

  return segments
}

/**
 * Get the file name from a path (last segment)
 */
export function getFileName(path: string): string {
  if (!path) return ''

  // Handle S3 paths
  if (isS3Path(path)) {
    const parsed = parseS3Uri(path)
    if (!parsed || !parsed.prefix) return ''
    const parts = parsed.prefix.split('/').filter((p) => p)
    return parts[parts.length - 1] || ''
  }

  // Handle local paths
  const parts = path.split(/[/\\]/).filter((p) => p)
  return parts[parts.length - 1] || ''
}

/**
 * Get the parent directory path
 */
export function getParentPath(path: string): string {
  if (!path) return ''

  // Handle S3 paths
  if (isS3Path(path)) {
    const parsed = parseS3Uri(path)
    if (!parsed) return ''
    if (!parsed.prefix) return `s3://${parsed.bucket}`

    const parts = parsed.prefix.split('/').filter((p) => p)
    parts.pop()
    if (parts.length === 0) return `s3://${parsed.bucket}`
    return `s3://${parsed.bucket}/${parts.join('/')}`
  }

  // Handle Windows paths
  if (path.includes('\\')) {
    const parts = path.split('\\')
    parts.pop()
    const parent = parts.join('\\')
    return parent.endsWith(':') ? parent + '\\' : parent
  }

  // Handle Unix paths
  const parts = path.split('/')
  parts.pop()
  return parts.join('/') || '/'
}
