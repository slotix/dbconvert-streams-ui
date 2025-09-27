import { apiClient } from './apiClient'

export interface FileSystemEntry {
  name: string
  path: string
  type: 'file' | 'dir'
  size?: number
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
export async function listDirectory(path?: string): Promise<DirectoryListResponse> {
  const params = path ? { path } : {}
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
