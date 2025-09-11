interface ParsedConnection {
  type: string
  host: string
  port: number
  username: string
  password: string
  database: string
  params?: Record<string, string>
}

export function parseConnectionString(connectionString: string): ParsedConnection | null {
  if (connectionString === '') {
    return null
  }
  try {
    const url = new URL(connectionString)
    const params: Record<string, string> = {}

    url.searchParams.forEach((value, key) => {
      params[key] = value
    })

    // Extract database type from protocol
    const type = url.protocol.replace(':', '')

    // Map common protocol names to our database types
    const typeMap: Record<string, string> = {
      postgresql: 'PostgreSQL',
      mysql: 'MySQL',
      oracle: 'Oracle',
      sqlserver: 'SQLServer',
      db2: 'DB2'
    }

    // Parse port correctly - url.port is a string, so check if it exists before parsing
    let port: number
    if (url.port && url.port.trim() !== '') {
      port = parseInt(url.port, 10)
    } else {
      port = getDefaultPort(type)
    }

    return {
      type: typeMap[type] || type,
      host: url.hostname,
      port: port,
      username: decodeURIComponent(url.username),
      password: decodeURIComponent(url.password),
      database: url.pathname.replace('/', ''),
      params
    }
  } catch (error) {
    console.error('Failed to parse connection string:', error)
    return null
  }
}

function getDefaultPort(type: string): number {
  const defaultPorts: Record<string, number> = {
    postgresql: 5432,
    mysql: 3306,
    oracle: 1521,
    sqlserver: 1433,
    db2: 50000
  }
  return defaultPorts[type] || 5432
}
