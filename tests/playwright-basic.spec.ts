import { test, expect } from '@playwright/test'

test('playwright basic functionality test', async ({ page }) => {
  // Test against a simple public website to verify Playwright is working
  await page.goto('https://example.com')

  // Wait for the page to load
  await page.waitForLoadState('networkidle')

  // Check that the page has the expected title
  await expect(page).toHaveTitle(/Example Domain/i)

  // Check that the page contains expected content
  const heading = page.locator('h1')
  await expect(heading).toContainText('Example Domain')

  // Take a screenshot to verify visual rendering is working
  await page.screenshot({ path: 'tests/screenshots/example-com.png' })

  console.log('✅ Playwright is working correctly!')
})
