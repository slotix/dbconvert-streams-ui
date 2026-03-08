import { describe, expect, it } from 'vitest'
import {
  applySourceAlias,
  computeLocalFileSelectionTableName,
  computeS3ObjectTableName,
  computeS3PrefixTableName
} from '@/utils/fileSelectionTableName'

describe('fileSelectionTableName', () => {
  it('derives a stable local folder selection name', () => {
    const tableName = computeLocalFileSelectionTableName(
      'stream_3AOLyzwJoD7YEXXFMWHsgTlN0pX/my1_city/'
    )

    expect(tableName).toBe('my1_city')
  })

  it('derives a stable local file selection name', () => {
    const tableName = computeLocalFileSelectionTableName('exports/My Table.parquet')

    expect(tableName).toBe('my_table')
  })

  it('resolves local naming collisions using the parent folder', () => {
    const existingNames = new Set<string>()
    const first = computeLocalFileSelectionTableName('north/customers.parquet', existingNames)
    existingNames.add(first)
    const second = computeLocalFileSelectionTableName('south/customers.parquet', existingNames)

    expect(first).toBe('customers')
    expect(second).toBe('south_customers')
  })

  it('derives deterministic s3 selection names', () => {
    expect(computeS3PrefixTableName('exports/2026/')).toBe('exports_2026')
    expect(computeS3ObjectTableName('exports/2026/orders.jsonl.zst')).toBe('exports_2026_orders')
  })

  it('adds a source alias once when required', () => {
    expect(applySourceAlias('orders', 'files1')).toBe('files1_orders')
    expect(applySourceAlias('files1_orders', 'files1')).toBe('files1_orders')
  })
})
