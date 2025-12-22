/**
 * Lazy-loaded Monaco Editor configuration
 *
 * This module configures Monaco Editor with only the necessary language workers (JSON).
 * SQL uses the base editor worker and doesn't need a dedicated worker.
 * The custom Vite plugin excludes unused CSS, HTML, and TypeScript workers.
 */

import type * as Monaco from 'monaco-editor'

type MonacoType = typeof Monaco

let monacoInstance: MonacoType | null = null
let initializationPromise: Promise<MonacoType> | null = null

/**
 * Initialize Monaco Editor with lazy-loaded workers
 * Returns a singleton instance to ensure Monaco is only loaded once
 */
export async function initializeMonaco(): Promise<MonacoType> {
  // Return existing instance if already initialized
  if (monacoInstance) {
    return monacoInstance
  }

  // Return existing promise if initialization is in progress
  if (initializationPromise) {
    return initializationPromise
  }

  // Start initialization
  initializationPromise = (async (): Promise<MonacoType> => {
    // Dynamically import Monaco and loader
    const [loader, monaco] = await Promise.all([
      import('@monaco-editor/loader'),
      import('monaco-editor')
    ])

    // Configure loader to use local package
    loader.default.config({ monaco: monaco.default })

    // Initialize and cache the instance
    monacoInstance = await loader.default.init()

    return monacoInstance as MonacoType
  })()

  return initializationPromise
}

/**
 * Get the Monaco instance if already initialized
 * Returns null if not yet initialized
 */
export function getMonacoInstance(): MonacoType | null {
  return monacoInstance
}

/**
 * Check if Monaco is currently initialized
 */
export function isMonacoInitialized(): boolean {
  return monacoInstance !== null
}
