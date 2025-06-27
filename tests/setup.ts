import { test as setup } from '@playwright/test'
import { readFileSync, existsSync } from 'fs'

const authFile = 'tests/.auth/user.json'

// Try to read API key from existing auth file
let TEST_API_KEY = 'your-api-key-here'

if (existsSync(authFile)) {
  try {
    const authData = JSON.parse(readFileSync(authFile, 'utf8'))
    const origin = authData.origins?.find((o: any) => o.origin === 'http://localhost:5173')
    const apiKeyItem = origin?.localStorage?.find((item: any) => item.name === 'dbconvert-api-key')
    if (apiKeyItem?.value) {
      TEST_API_KEY = apiKeyItem.value
      console.log('✅ Using API key from existing auth file')
    }
  } catch (error) {
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