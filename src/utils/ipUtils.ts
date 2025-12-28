/**
 * Utility functions for IP address operations
 */

let cachedPublicIp: string | null = null
let ipFetchPromise: Promise<string> | null = null

/**
 * Get the user's public IP address
 * Uses caching to avoid multiple API calls
 */
export async function getPublicIp(): Promise<string> {
  // Return cached IP if available
  if (cachedPublicIp) {
    return cachedPublicIp
  }

  // Return existing promise if fetch is already in progress
  if (ipFetchPromise) {
    return ipFetchPromise
  }

  // Create new fetch promise
  ipFetchPromise = fetchPublicIp()

  try {
    cachedPublicIp = await ipFetchPromise
    return cachedPublicIp
  } catch (error) {
    // Reset promise on error so it can be retried
    ipFetchPromise = null
    throw error
  }
}

/**
 * Fetch public IP from multiple sources with fallbacks
 */
async function fetchPublicIp(): Promise<string> {
  const sources = [
    'https://api.ipify.org?format=text',
    'https://ipv4.icanhazip.com',
    'https://checkip.amazonaws.com'
  ]

  for (const source of sources) {
    try {
      const response = await fetchWithTimeout(source, 5000)

      if (response.ok) {
        const ip = (await response.text()).trim()
        if (isValidIpv4(ip)) {
          return ip
        }
      }
    } catch (error) {
      console.warn(`Failed to fetch IP from ${source}:`, error)
      continue
    }
  }

  throw new Error('Unable to determine public IP address')
}

async function fetchWithTimeout(url: string, timeoutMs: number): Promise<Response> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'text/plain'
      },
      signal: controller.signal
    })
  } finally {
    clearTimeout(timeoutId)
  }
}

/**
 * Validate IPv4 address format
 */
function isValidIpv4(ip: string): boolean {
  const ipv4Regex =
    /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/
  return ipv4Regex.test(ip)
}

/**
 * Check if an IP address is a local/private address
 */
export function isLocalIp(ip: string): boolean {
  if (!ip) return false

  // Common local/private IP patterns
  const localPatterns = [
    /^127\./, // 127.x.x.x (localhost)
    /^192\.168\./, // 192.168.x.x (private)
    /^10\./, // 10.x.x.x (private)
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./, // 172.16.x.x - 172.31.x.x (private)
    /^169\.254\./, // 169.254.x.x (link-local)
    /^::1$/, // IPv6 localhost
    /^localhost$/i // hostname localhost
  ]

  return localPatterns.some((pattern) => pattern.test(ip))
}
