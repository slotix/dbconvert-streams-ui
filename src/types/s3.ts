// S3-specific type definitions for DBConvert Streams UI

// S3 Configuration Request
export interface S3ConfigRequest {
  credentialSource: 'aws' | 'static' // Backend decides on Vault storage
  profileName?: string // For backend Vault retrieval only
  endpoint?: string // Required for S3-compatible providers
  region: string
  urlStyle?: 'auto' | 'path' | 'virtual'
  useSSL?: boolean
  credentials?: {
    accessKeyId: string
    secretAccessKey: string
    sessionToken?: string
  }
  performance?: {
    threads?: number
    enableFileCache?: boolean
  }
  limits?: {
    maxListObjects?: number
    maxScanBytes?: number
    queryTimeoutS?: number
  }
}

// S3 Configuration Response
export interface S3ConfigResponse {
  status: string
  message: string
  config: {
    endpoint: string
    region: string
    urlStyle: string
    useSSL: boolean
    threads: number
  }
}

// S3 List Request
export interface S3ListRequest {
  bucket: string
  prefix?: string
  maxKeys?: number
  continuationToken?: string
  connectionId?: string
}

// S3 Object
export interface S3Object {
  key: string
  size: number
  last_modified: string
  etag: string
  storage_class: string
}

// S3 List Response
export interface S3ListResponse {
  objects: S3Object[]
  bucket: string
  prefix: string
  count: number
  is_truncated: boolean
  next_token: string
  total_size: number
}

// S3 bucket creation
export interface S3CreateBucketRequest {
  bucket: string
  region?: string
  connectionId?: string
}

export interface S3CreateBucketResponse {
  status: string
  bucket: string
  region: string
}

// S3 Validation Response
export interface S3ValidationResponse {
  valid: boolean
  recommendedMode: 'direct' | 'glob' | 'hive' | 'manifest'
  reason: string
  isHivePartitioned: boolean
  hivePartitions?: string[]
  warnings: string[]
}

// S3 Manifest Response
export interface S3ManifestResponse {
  manifest: {
    version: string
    files: string[]
    metadata: Record<string, unknown>
  }
  stats: {
    file_count: number
    s3_files: number
    local_files: number
    version: string
  }
}

// Provider preset configuration
export interface S3ProviderPreset {
  endpoint: string
  region: string
  urlStyle: 'auto' | 'path' | 'virtual'
  useSSL: boolean
}

// Provider presets mapping (ordered by popularity)
export const S3_PROVIDER_PRESETS: Record<string, S3ProviderPreset> = {
  'AWS S3': {
    endpoint: '', // Empty for AWS S3
    region: 'us-east-1',
    urlStyle: 'auto',
    useSSL: true
  },
  'Google Cloud Storage': {
    endpoint: 'storage.googleapis.com',
    region: 'auto',
    urlStyle: 'path',
    useSSL: true
  },
  'Cloudflare R2': {
    endpoint: '<account-id>.r2.cloudflarestorage.com',
    region: 'auto',
    urlStyle: 'path',
    useSSL: true
  },
  'DigitalOcean Spaces': {
    endpoint: 'nyc3.digitaloceanspaces.com',
    region: 'nyc3',
    urlStyle: 'path',
    useSSL: true
  },
  'Backblaze B2': {
    endpoint: 's3.us-west-004.backblazeb2.com',
    region: 'us-west-004',
    urlStyle: 'path',
    useSSL: true
  },
  MinIO: {
    endpoint: 'localhost:9000',
    region: 'us-east-1',
    urlStyle: 'path',
    useSSL: false
  },
  Custom: {
    endpoint: '',
    region: '',
    urlStyle: 'auto',
    useSSL: true
  }
}
