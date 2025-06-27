import { test, expect } from '@playwright/test'

// These tests run after authentication is set up in setup.ts
// No need to handle API key input in these tests

test('homepage loads correctly', async ({ page }) => {
  await page.goto('/')
  
  // Check that the page has the DBConvert Streams title or logo
  await expect(page.locator('img[alt*="DBConvert"], img[src*="logo"]')).toBeVisible()
  
  // Check navigation is present
  await expect(page.locator('nav, [role="navigation"]')).toBeVisible()
})

test('connections page loads', async ({ page }) => {
  await page.goto('/connections')
  
  // Check for connections page content - just verify the page loads
  await expect(page).toHaveURL(/.*connections.*/)
})

test('streams page loads', async ({ page }) => {
  await page.goto('/streams')
  
  // Check for streams page content - just verify the page loads
  await expect(page).toHaveURL(/.*streams.*/)
})

test('database explorer loads', async ({ page }) => {
  await page.goto('/explorer')
  
  // Check for explorer page content - just verify the page loads
  await expect(page).toHaveURL(/.*explorer.*/)
})

test('monitor page loads', async ({ page }) => {
  await page.goto('/monitor')
  
  // Check for monitor page content - just verify the page loads
  await expect(page).toHaveURL(/.*monitor.*/)
}) 