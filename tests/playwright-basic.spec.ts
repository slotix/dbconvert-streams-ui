import { test, expect } from '@playwright/test'

test('internal app smoke test', async ({ page }) => {
  const routes = [
    {
      path: '/',
      url: /\/$/,
      marker: /Account Overview|Connect your account|Enter API key/i
    },
    {
      path: '/streams',
      url: /\/streams$/,
      marker: /No Stream Configurations Yet|No stream selected|Create Stream Configuration/i
    },
    {
      path: '/explorer',
      url: /\/explorer$/,
      marker: /Select a connection|No object selected|Add Connection|No Connections Yet/i
    }
  ]

  for (const route of routes) {
    await page.goto(route.path)
    await page.waitForLoadState('domcontentloaded')
    await expect(page).toHaveURL(route.url)
    await expect(page.locator('nav, [role="navigation"]')).toBeVisible()
    await expect(page.locator('body')).toContainText(route.marker)
  }

  await page.screenshot({ path: 'tests/screenshots/internal-smoke.png' })
})
