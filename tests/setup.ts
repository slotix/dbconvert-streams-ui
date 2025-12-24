import { test as setup } from '@playwright/test'
import { readFileSync, existsSync } from 'fs'

const authFile = 'tests/.auth/user.json'

function getStringProp(value: unknown, key: string): string | undefined {
  if (!value || typeof value !== 'object') {
    return undefined
  }
  const record = value as Record<string, unknown>
  return typeof record[key] === 'string' ? record[key] : undefined
}

function getArrayProp(value: unknown, key: string): unknown[] | undefined {
  if (!value || typeof value !== 'object') {
    return undefined
  }
  const record = value as Record<string, unknown>
  return Array.isArray(record[key]) ? (record[key] as unknown[]) : undefined
}

// Try to read API key from existing auth file
let TEST_API_KEY = 'your-api-key-here'

if (existsSync(authFile)) {
  try {
    const authData: unknown = JSON.parse(readFileSync(authFile, 'utf8'))
    const origins = getArrayProp(authData, 'origins')
    const origin = origins?.find((o) => getStringProp(o, 'origin') === 'http://localhost:5173')
    const localStorageItems = origin ? getArrayProp(origin, 'localStorage') : undefined
    const apiKeyItem = localStorageItems?.find(
      (item) => getStringProp(item, 'name') === 'dbconvert-api-key'
    )
    const apiKeyValue = apiKeyItem ? getStringProp(apiKeyItem, 'value') : undefined
    if (apiKeyValue) {
      TEST_API_KEY = apiKeyValue
      console.log('✅ Using API key from existing auth file')
    }
  } catch {
    console.log('⚠️ Could not read API key from auth file, using placeholder')
  }
}

if (TEST_API_KEY === 'your-api-key-here') {
  console.log('⚠️ Please set your API key in the auth file first by running the app manually')
}

setup('authenticate with API key', async ({ page }) => {
  // Go to homepage and set API key directly in localStorage
  await page.goto('/')

  // Set the API key in localStorage
  await page.evaluate((apiKey) => {
    localStorage.setItem('dbconvert-api-key', apiKey)
  }, TEST_API_KEY)

  // Reload to apply the authentication
  await page.reload()

  // Save authentication state
  await page.context().storageState({ path: authFile })
  console.log('✅ Authentication setup complete')
})
