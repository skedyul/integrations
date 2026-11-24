import { describe, expect, it } from '@jest/globals'
import { WATCH_RENEW_WINDOW_MS, watchNeedsRenewal } from '../watch'

describe('watchNeedsRenewal', () => {
  const now = Date.parse('2026-09-01T00:00:00.000Z')

  it('renews channels with no or unreadable expiry', () => {
    expect(watchNeedsRenewal(null, now)).toBe(true)
    expect(watchNeedsRenewal('not a date', now)).toBe(true)
  })

  it('renews channels that expire within 24 hours', () => {
    expect(watchNeedsRenewal(new Date(now + WATCH_RENEW_WINDOW_MS - 1).toISOString(), now)).toBe(true)
    expect(watchNeedsRenewal(new Date(now + WATCH_RENEW_WINDOW_MS + 60_000).toISOString(), now)).toBe(false)
  })
})
