// Cloud provider logo mapping and utility functions
interface CloudProviderInfo {
  name: string
  displayName: string
  logo: string
}

const CLOUD_PROVIDERS: Record<string, CloudProviderInfo> = {
  // PostgreSQL Cloud Providers
  neon: {
    name: 'neon',
    displayName: 'Neon',
    logo: '/images/db-logos/neon.svg'
  },
  'aws-rds': {
    name: 'aws-rds',
    displayName: 'AWS RDS',
    logo: '/images/db-logos/amazon.svg'
  },
  azure: {
    name: 'azure',
    displayName: 'Azure',
    logo: '/images/db-logos/azure.svg'
  },
  digitalocean: {
    name: 'digitalocean',
    displayName: 'DigitalOcean',
    logo: '/images/db-logos/digitalocean.svg'
  },
  supabase: {
    name: 'supabase',
    displayName: 'Supabase',
    logo: '/images/db-logos/supabase.svg'
  },
  heroku: {
    name: 'heroku',
    displayName: 'Heroku',
    logo: '/images/db-logos/heroku.svg'
  },
  cockroachdb: {
    name: 'cockroachdb',
    displayName: 'CockroachDB',
    logo: '/images/db-logos/cockroachdb.svg'
  },
  'google-cloud': {
    name: 'google-cloud',
    displayName: 'Google Cloud',
    logo: '/images/db-logos/google-cloud.svg'
  },

  // MySQL Cloud Providers
  planetscale: {
    name: 'planetscale',
    displayName: 'PlanetScale',
    logo: '/images/db-logos/vitess.svg' // Using Vitess logo as PlanetScale is based on Vitess
  },
  aiven: {
    name: 'aiven',
    displayName: 'Aiven',
    logo: '/images/db-logos/mysql.svg' // Fallback to MySQL logo
  },
  tidb: {
    name: 'tidb',
    displayName: 'TiDB Cloud',
    logo: '/images/db-logos/tidb.svg'
  },
  skysql: {
    name: 'skysql',
    displayName: 'SkySQL',
    logo: '/images/db-logos/skysql.svg'
  }
}

/**
 * Get cloud provider information by provider name
 */
function getCloudProviderInfo(providerName: string): CloudProviderInfo | null {
  if (!providerName) return null
  return CLOUD_PROVIDERS[providerName.toLowerCase()] || null
}

/**
 * Check if a connection is using a cloud provider
 */
export function isCloudConnection(cloudProvider?: string): boolean {
  return !!(cloudProvider && cloudProvider.trim())
}

/**
 * Get display name for cloud provider
 */
export function getCloudProviderDisplayName(providerName: string): string {
  const info = getCloudProviderInfo(providerName)
  return info?.displayName || providerName
}

/**
 * Get cloud provider logo path
 */
export function getCloudProviderLogo(providerName: string): string | null {
  const info = getCloudProviderInfo(providerName)
  return info?.logo || null
}

/**
 * Get badge styling for cloud provider
 */
export function getCloudProviderBadgeStyle(_providerName: string): {
  bgColor: string
  textColor: string
} {
  return {
    bgColor: 'ui-chip-muted',
    textColor: 'ui-text-default'
  }
}
