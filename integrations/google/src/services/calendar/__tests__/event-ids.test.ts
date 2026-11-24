import { describe, expect, it } from '@jest/globals'
import {
  isSkedyulGoogleEventId,
  isSkedyulOriginatedGoogleEventId,
  isValidGoogleClientEventId,
  skedyulGoogleEventId,
} from '../event-ids'

describe('skedyulGoogleEventId', () => {
  it('is deterministic per CRM instance id so retried inserts reuse one Google id', () => {
    const first = skedyulGoogleEventId('ins_hbu1u27jtrg4jmc3f95n9i60')
    expect(skedyulGoogleEventId('ins_hbu1u27jtrg4jmc3f95n9i60')).toBe(first)
    expect(skedyulGoogleEventId('ins_other')).not.toBe(first)
  })

  it('only uses characters Google allows for client ids (a-v, 0-9, 5-1024 long)', () => {
    const id = skedyulGoogleEventId('ins_hbu1u27jtrg4jmc3f95n9i60')
    expect(id).toMatch(/^sk[0-9a-f]{64}$/)
    expect(isValidGoogleClientEventId(id)).toBe(true)
  })

  it('rejects a blank instance id', () => {
    expect(() => skedyulGoogleEventId('  ')).toThrow()
  })
})

describe('Skedyul-originated id detection', () => {
  const master = skedyulGoogleEventId('ins_series')

  it('recognises the master id and its occurrences', () => {
    expect(isSkedyulGoogleEventId(master)).toBe(true)
    expect(isSkedyulGoogleEventId(`${master}_20260817T090000Z`)).toBe(false)
    expect(isSkedyulOriginatedGoogleEventId(`${master}_20260817T090000Z`)).toBe(true)
  })

  it('does not match ordinary Google ids', () => {
    expect(isSkedyulGoogleEventId('21276hr5ftmq6ts3pe451ti7er')).toBe(false)
    expect(isSkedyulOriginatedGoogleEventId('skabc_20260817')).toBe(false)
    expect(isSkedyulOriginatedGoogleEventId(null)).toBe(false)
  })
})
