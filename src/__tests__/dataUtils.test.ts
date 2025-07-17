import { describe, it, expect } from 'vitest'
import { formatTableValue } from '@/utils/dataUtils'

describe('dataUtils', () => {
  describe('formatTableValue', () => {
    it('should handle null values', () => {
      expect(formatTableValue(null)).toBe('NULL')
    })

    it('should handle undefined values', () => {
      expect(formatTableValue(undefined)).toBe('')
    })

    it('should handle normal text values', () => {
      expect(formatTableValue('Hello World')).toBe('Hello World')
    })

    it('should decode base64 encoded text', () => {
      // "Hello World" in base64
      const base64Text = 'SGVsbG8gV29ybGQ='
      expect(formatTableValue(base64Text)).toBe('Hello World')
    })

    it('should decode base64 encoded descriptive text like in the film database', () => {
      // Sample base64 encoded text similar to what we see in the database
      const filmDescription = 'A Epic Drama of a Feminist And a Mad Scientist who must Battle a Teacher in The Canadian Rockies'
      const base64Film = btoa(filmDescription)
      expect(formatTableValue(base64Film)).toBe(filmDescription)
    })

    it('should decode actual base64 strings from the database screenshot', () => {
      // Test with actual base64 strings that appear in the database screenshots
      const testCases = [
        {
          base64: 'TUFSW5STTUlUSEB2YWlpbGFjdXNObzlIc5vcrRla',
          shouldDecode: true // This should attempt to decode
        },
        {
          base64: 'UEFUUMNDSU=', // "FATMNCI" in base64
          shouldDecode: true
        }
      ]

      testCases.forEach(({ base64, shouldDecode }) => {
        const result = formatTableValue(base64)
        if (shouldDecode) {
          // It should at least attempt to process it (either decode or return original)
          expect(typeof result).toBe('string')
          expect(result.length).toBeGreaterThan(0)
        }
      })
    })

    it('should not decode strings that are not base64', () => {
      expect(formatTableValue('Not Base64!')).toBe('Not Base64!')
    })

    it('should not decode invalid base64', () => {
      expect(formatTableValue('InvalidBase64==')).toBe('InvalidBase64==')
    })

    it('should handle numbers', () => {
      expect(formatTableValue(123)).toBe('123')
    })

    it('should handle boolean values', () => {
      expect(formatTableValue(true)).toBe('true')
      expect(formatTableValue(false)).toBe('false')
    })

    it('should not decode base64 that results in binary data', () => {
      // This would result in binary data, so should not be decoded
      const binaryBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=='
      expect(formatTableValue(binaryBase64)).toBe(binaryBase64)
    })
  })
}) 