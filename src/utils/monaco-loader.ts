/**
 * Lazy-loaded Monaco Editor configuration
 *
 * This module configures Monaco Editor with only the necessary language workers (SQL and JSON).
 * It's loaded on-demand when Monaco components are first mounted, significantly reducing
 * the initial bundle size (~3.8MB / 986KB gzipped).
 */

import type * as Monaco from 'monaco-editor/esm/vs/editor/editor.api'

let monacoInstance: typeof Monaco | null = null
let initializationPromise: Promise<typeof Monaco> | null = null

/**
 * Initialize Monaco Editor with lazy-loaded workers
 * Returns a singleton instance to ensure Monaco is only loaded once
 */
export async function initializeMonaco(): Promise<typeof Monaco> {
  // Return existing instance if already initialized
  if (monacoInstance) {
    return monacoInstance
  }

  // Return existing promise if initialization is in progress
  if (initializationPromise) {
    return initializationPromise
  }

  // Start initialization
  initializationPromise = (async () => {
    // Dynamically import Monaco and workers
    const [loader, monaco, editorWorker, jsonWorker] = await Promise.all([
      import('@monaco-editor/loader'),
      import('monaco-editor'),
      import('monaco-editor/esm/vs/editor/editor.worker?worker'),
      import('monaco-editor/esm/vs/language/json/json.worker?worker')
    ])

    // Configure worker environment
    window.MonacoEnvironment = {
      getWorker(_: string, label: string) {
        if (label === 'json') {
          return new jsonWorker.default()
        }
        // All other languages use the base editor worker
        return new editorWorker.default()
      }
    }

    // Configure loader to use local package
    loader.default.config({ monaco: monaco.default })

    // Initialize and cache the instance
    monacoInstance = await loader.default.init()

    return monacoInstance
  })()

  return initializationPromise
}

/**
 * Get the Monaco instance if already initialized
 * Returns null if not yet initialized
 */
export function getMonacoInstance(): typeof Monaco | null {
  return monacoInstance
}

/**
 * Check if Monaco is currently initialized
 */
export function isMonacoInitialized(): boolean {
  return monacoInstance !== null
}
