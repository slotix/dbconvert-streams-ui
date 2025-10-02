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

    it('should show <BLOB> indicator for blob data types', () => {
      expect(formatTableValue('some-binary-data', 'BLOB')).toBe('<BLOB>')
      expect(formatTableValue('some-binary-data', 'blob')).toBe('<BLOB>')
      expect(formatTableValue('some-binary-data', 'LONGBLOB')).toBe('<BLOB>')
      expect(formatTableValue('some-binary-data', 'MEDIUMBLOB')).toBe('<BLOB>')
      expect(formatTableValue('some-binary-data', 'TINYBLOB')).toBe('<BLOB>')
    })

    it('should show <BINARY> indicator for binary data types', () => {
      expect(formatTableValue('some-binary-data', 'BINARY')).toBe('<BINARY>')
      expect(formatTableValue('some-binary-data', 'VARBINARY')).toBe('<BINARY>')
      expect(formatTableValue('some-binary-data', 'BYTEA')).toBe('<BINARY>')
    })

    it('should show <IMAGE> indicator for image-related data types', () => {
      expect(formatTableValue('some-binary-data', 'picture')).toBe('<IMAGE>')
      expect(formatTableValue('some-binary-data', 'image')).toBe('<IMAGE>')
      expect(formatTableValue('some-binary-data', 'photo')).toBe('<IMAGE>')
    })

    it('should return original value for non-binary data types', () => {
      expect(formatTableValue('Not Binary!', 'VARCHAR')).toBe('Not Binary!')
      expect(formatTableValue('Some text', 'TEXT')).toBe('Some text')
      expect(formatTableValue('123', 'INT')).toBe('123')
    })

    it('should handle numbers', () => {
      expect(formatTableValue(123)).toBe('123')
    })

    it('should handle boolean values', () => {
      expect(formatTableValue(true)).toBe('true')
      expect(formatTableValue(false)).toBe('false')
    })

    it('should work without data type parameter (backward compatibility)', () => {
      expect(formatTableValue('Hello World')).toBe('Hello World')
      expect(formatTableValue(null)).toBe('NULL')
      expect(formatTableValue(undefined)).toBe('')
    })
  })
})
