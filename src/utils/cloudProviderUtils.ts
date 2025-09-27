// Cloud provider logo mapping and utility functions
export interface CloudProviderInfo {
  name: string
  displayName: string
  logo: string
  badgeColor: string
  textColor: string
}

export const CLOUD_PROVIDERS: Record<string, CloudProviderInfo> = {
  // PostgreSQL Cloud Providers
  neon: {
    name: 'neon',
    displayName: 'Neon',
    logo: '/images/db-logos/neon.svg',
    badgeColor: 'bg-green-100',
    textColor: 'text-green-700'
  },
  'aws-rds': {
    name: 'aws-rds',
    displayName: 'AWS RDS',
    logo: '/images/db-logos/amazon.svg',
    badgeColor: 'bg-orange-100',
    textColor: 'text-orange-700'
  },
  azure: {
    name: 'azure',
    displayName: 'Azure',
    logo: '/images/db-logos/azure.svg',
    badgeColor: 'bg-blue-100',
    textColor: 'text-blue-700'
  },
  digitalocean: {
    name: 'digitalocean',
    displayName: 'DigitalOcean',
    logo: '/images/db-logos/digitalocean.svg',
    badgeColor: 'bg-blue-100',
    textColor: 'text-blue-700'
  },
  supabase: {
    name: 'supabase',
    displayName: 'Supabase',
    logo: '/images/db-logos/supabase.svg',
    badgeColor: 'bg-green-100',
    textColor: 'text-green-700'
  },
  heroku: {
    name: 'heroku',
    displayName: 'Heroku',
    logo: '/images/db-logos/heroku.svg',
    badgeColor: 'bg-purple-100',
    textColor: 'text-purple-700'
  },
  cockroachdb: {
    name: 'cockroachdb',
    displayName: 'CockroachDB',
    logo: '/images/db-logos/cockroachdb.svg',
    badgeColor: 'bg-indigo-100',
    textColor: 'text-indigo-700'
  },
  'google-cloud': {
    name: 'google-cloud',
    displayName: 'Google Cloud',
    logo: '/images/db-logos/google-cloud.svg',
    badgeColor: 'bg-red-100',
    textColor: 'text-red-700'
  },

  // MySQL Cloud Providers
  planetscale: {
    name: 'planetscale',
    displayName: 'PlanetScale',
    logo: '/images/db-logos/vitess.svg', // Using Vitess logo as PlanetScale is based on Vitess
    badgeColor: 'bg-black',
    textColor: 'text-white'
  },
  aiven: {
    name: 'aiven',
    displayName: 'Aiven',
    logo: '/images/db-logos/mysql.svg', // Fallback to MySQL logo
    badgeColor: 'bg-teal-100',
    textColor: 'text-teal-700'
  },
  tidb: {
    name: 'tidb',
    displayName: 'TiDB Cloud',
    logo: '/images/db-logos/tidb.svg',
    badgeColor: 'bg-pink-100',
    textColor: 'text-pink-700'
  },
  skysql: {
    name: 'skysql',
    displayName: 'SkySQL',
    logo: '/images/db-logos/skysql.svg',
    badgeColor: 'bg-blue-100',
    textColor: 'text-blue-700'
  }
}

/**
 * Get cloud provider information by provider name
 */
export function getCloudProviderInfo(providerName: string): CloudProviderInfo | null {
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
export function getCloudProviderBadgeStyle(providerName: string): {
  bgColor: string
  textColor: string
} {
  const info = getCloudProviderInfo(providerName)
  return {
    bgColor: info?.badgeColor || 'bg-gray-100',
    textColor: info?.textColor || 'text-gray-700'
  }
}
