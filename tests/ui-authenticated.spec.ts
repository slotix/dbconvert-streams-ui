import { test, expect } from '@playwright/test'

// These tests run after authentication is set up in setup.ts
// No need to handle API key input in these tests

test('homepage loads correctly', async ({ page }) => {
  await page.goto('/')

  await expect(page.locator('nav, [role="navigation"]')).toBeVisible()
  await expect(page.locator('body')).toContainText(
    /Account Overview|Connect your account|Enter API key/i
  )
})

test('create stream page loads', async ({ page }) => {
  await page.goto('/streams/create')

  await expect(page).toHaveURL(/.*streams\/create.*/)
})

test('streams page loads', async ({ page }) => {
  await page.goto('/streams')

  await expect(page).toHaveURL(/.*streams.*/)
  await expect(page.locator('body')).toContainText(
    /No Stream Configurations Yet|No stream selected|Create Stream Configuration/i
  )
})

test('data explorer loads', async ({ page }) => {
  await page.goto('/explorer')

  await expect(page).toHaveURL(/.*explorer.*/)
  await expect(page.locator('body')).toContainText(
    /Select a connection|No object selected|Add Connection|No Connections Yet/i
  )
})
