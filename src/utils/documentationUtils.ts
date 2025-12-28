export function getDocumentationUrl(cloudProvider?: string, dbType?: string): string | null {
  if (!cloudProvider && !dbType) return null

  // Cloud provider specific documentation
  const cloudProviderUrls: Record<string, string> = {
    'aws rds': 'https://docs.dbconvert.com/connections/amazon-rds.html',
    'amazon rds': 'https://docs.dbconvert.com/connections/amazon-rds.html',
    rds: 'https://docs.dbconvert.com/connections/amazon-rds.html',
    'aws aurora': 'https://docs.dbconvert.com/connections/aws-aurora-mysql.html',
    aurora: 'https://docs.dbconvert.com/connections/aws-aurora-mysql.html',
    'google cloud sql': 'https://docs.dbconvert.com/connections/google-cloud-sql.html',
    'google cloud': 'https://docs.dbconvert.com/connections/google-cloud-sql.html',
    gcp: 'https://docs.dbconvert.com/connections/google-cloud-sql.html',
    azure: 'https://docs.dbconvert.com/connections/azure-database-configuration.html',
    'azure database': 'https://docs.dbconvert.com/connections/azure-database-configuration.html',
    digitalocean: 'https://docs.dbconvert.com/connections/do-database-cdc.html',
    'digital ocean': 'https://docs.dbconvert.com/connections/do-database-cdc.html',
    do: 'https://docs.dbconvert.com/connections/do-database-cdc.html',
    neon: 'https://docs.dbconvert.com/connections/neon-database.html',
    supabase: 'https://docs.dbconvert.com/connections/supabase-database.html',
    planetscale: 'https://docs.dbconvert.com/connections/planetscale-database.html',
    railway: 'https://docs.dbconvert.com/connections/railway-database.html',
    render: 'https://docs.dbconvert.com/connections/render-database.html',
    heroku: 'https://docs.dbconvert.com/connections/heroku-database.html',
    elephantsql: 'https://docs.dbconvert.com/connections/elephantsql-database.html',
    cockroachdb: 'https://docs.dbconvert.com/connections/cockroachdb-database.html',
    timescale: 'https://docs.dbconvert.com/connections/timescale-database.html',
    aiven: 'https://docs.dbconvert.com/connections/aiven-database.html'
  }

  // Special handling for AWS Aurora based on database type
  if (
    cloudProvider?.toLowerCase().includes('aurora') ||
    cloudProvider?.toLowerCase().includes('aws')
  ) {
    if (dbType?.toLowerCase().includes('postgres')) {
      return 'https://docs.dbconvert.com/connections/aws-aurora-postgres.html'
    } else if (dbType?.toLowerCase().includes('mysql')) {
      return 'https://docs.dbconvert.com/connections/aws-aurora-mysql.html'
    }
  }

  // Look up by cloud provider
  const normalizedProvider = cloudProvider?.toLowerCase() || ''
  const cloudUrl = cloudProviderUrls[normalizedProvider]

  if (cloudUrl) {
    return cloudUrl
  }

  // Fallback to general database configuration for MySQL and PostgreSQL
  if (dbType) {
    const normalizedDbType = dbType.toLowerCase()
    if (normalizedDbType.includes('mysql') || normalizedDbType.includes('postgres')) {
      return 'https://docs.dbconvert.com/connections/database-config.html'
    }
  }

  return null
}
