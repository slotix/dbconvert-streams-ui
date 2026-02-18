import { describe, expect, it } from 'vitest'
import {
  acquireMonacoSqlProviders,
  releaseMonacoSqlProviders
} from '@/composables/useMonacoSqlProviders'

function createMockMonaco(disposeCount: {
  value: number
}): Parameters<typeof acquireMonacoSqlProviders>[0] {
  return {
    languages: {
      CompletionItemKind: {
        Keyword: 0,
        Function: 1,
        Class: 2,
        Field: 3,
        Snippet: 4
      },
      CompletionItemInsertTextRule: {
        InsertAsSnippet: 1
      },
      registerCompletionItemProvider: () => ({
        dispose: () => {
          disposeCount.value += 1
        }
      }),
      registerHoverProvider: () => ({
        dispose: () => {
          disposeCount.value += 1
        }
      })
    }
  } as Parameters<typeof acquireMonacoSqlProviders>[0]
}

describe('useMonacoSqlProviders lifecycle', () => {
  it('keeps legacy providers alive until last consumer releases', () => {
    const disposeCount = { value: 0 }
    const monaco = createMockMonaco(disposeCount)

    acquireMonacoSqlProviders(monaco, 'sql', 'sql')
    acquireMonacoSqlProviders(monaco, 'sql', 'sql')

    // Re-registration disposes the previous pair of providers.
    expect(disposeCount.value).toBe(2)

    releaseMonacoSqlProviders()
    expect(disposeCount.value).toBe(2)

    releaseMonacoSqlProviders()
    expect(disposeCount.value).toBe(4)
  })
})
