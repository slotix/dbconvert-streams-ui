import { fileURLToPath } from 'node:url'
import { mergeConfig } from 'vite'
import { configDefaults, defineConfig } from 'vitest/config'
import viteConfig from './vite.config'

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: 'jsdom',
      // Only run unit tests from src/__tests__; exclude Playwright e2e in tests/
      include: ['src/__tests__/**/*.{test,spec}.{ts,tsx,js}'],
      exclude: [...configDefaults.exclude, 'e2e/*', 'tests/**', 'playwright.config.ts'],
      root: fileURLToPath(new URL('./', import.meta.url)),
      transformMode: {
        web: [/\.[jt]sx$/]
      }
    }
  })
)
