import { apiClient } from './apiClient'
import type { FileFormat } from '@/utils/fileFormat'

export interface FileSystemEntry {
  name: string
  path: string
  type: 'file' | 'dir'
  size?: number
  isTable?: boolean
  isBucket?: boolean // Whether this is an S3 bucket
  format?: FileFormat
  fileCount?: number
  children?: FileSystemEntry[] // Nested entries for directories
  isLoaded?: boolean // Whether this directory's children have been loaded
}

export interface DirectoryListResponse {
  path: string
  entries: FileSystemEntry[]
}

export interface WritableCheckRequest {
  path: string
}

export interface WritableCheckResponse {
  ok: boolean
  error?: string
}

/**
 * List directory contents
 */
export async function listDirectory(
  path?: string,
  connectionType?: string
): Promise<DirectoryListResponse> {
  const params: Record<string, string> = {}
  if (path) params.path = path
  if (connectionType) params.connectionType = connectionType
  const response = await apiClient.get('/fs/list', { params })
  return response.data
}

/**
 * Check if a directory is writable
 */
export async function checkWritable(path: string): Promise<WritableCheckResponse> {
  const response = await apiClient.post('/fs/writable', { path })
  return response.data
}

/**
 * Get common root directories for quick access
 */
export async function getRoots(): Promise<string[]> {
  const response = await apiClient.get('/fs/roots')
  return response.data
}

export default {
  listDirectory,
  checkWritable,
  getRoots
}
