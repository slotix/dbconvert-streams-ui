import type { S3ManifestResponse } from '@/types/s3'

export const S3_MANIFEST_ONLY_S3_URIS_ERROR =
  'Manifest entries must be s3:// URIs only. S3 manifest flows require all s3:// URIs.'

export function manifestContainsLocalFiles(response: Pick<S3ManifestResponse, 'stats'>): boolean {
  return response.stats.local_files > 0
}
