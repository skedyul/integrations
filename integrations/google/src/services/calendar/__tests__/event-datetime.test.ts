import { describe, expect, it } from '@jest/globals'
import {
  buildEventDateTime,
  googleSeriesInstanceId,
  isGoogleThisAndFollowingMasterId,
  isSkedyulInstanceId,
  resolveGoogleWriteTarget,
  toCompactUtcStamp,
} from '../event-datetime'

describe('buildEventDateTime', () => {
  it('emits date-only for all-day events', () => {
    expect(
      buildEventDateTime(
        {
          start: '2026-08-24',
          timezone: 'Australia/Sydney',
          all_day: true,
        },
        'start',
      ),
    ).toEqual({ date: '2026-08-24' })
  })

  it('emits naive local dateTime plus timeZone for timed events', () => {
    expect(
      buildEventDateTime(
        {
          start: '2026-08-24T09:00:00.000Z',
          timezone: 'Australia/Sydney',
        },
        'start',
      ),
    ).toEqual({
      dateTime: '2026-08-24T19:00:00',
      timeZone: 'Australia/Sydney',
    })
  })

  it('does not send an offset timestamp together with timeZone', () => {
    const encoded = buildEventDateTime(
      {
        start: '2026-08-24T09:00:00.000Z',
        timezone: 'Australia/Sydney',
      },
      'start',
    )
    expect(encoded?.dateTime).not.toMatch(/Z$/)
    expect(encoded?.dateTime).not.toMatch(/[+-]\d{2}:\d{2}$/)
    expect(encoded?.timeZone).toBe('Australia/Sydney')
  })

  it('emits RFC3339 with offset and omits timeZone when none is provided', () => {
    expect(
      buildEventDateTime(
        {
          start: '2026-08-24T09:00:00.000Z',
        },
        'start',
      ),
    ).toEqual({ dateTime: '2026-08-24T09:00:00Z' })
  })
})

describe('googleSeriesInstanceId', () => {
  it('formats masterId_yyyyMMddTHHmmssZ', () => {
    expect(googleSeriesInstanceId('abc123', '2026-08-17T09:00:00.000Z')).toBe(
      'abc123_20260817T090000Z',
    )
    expect(toCompactUtcStamp('2026-08-17T09:00:00.000Z')).toBe('20260817T090000Z')
  })
})

describe('resolveGoogleWriteTarget', () => {
  it('patches a series instance instead of inserting', () => {
    expect(
      resolveGoogleWriteTarget({
        recurring_event_id: 'abc123',
        original_start: '2026-08-17T09:00:00.000Z',
      }),
    ).toEqual({ mode: 'patch', eventId: 'abc123_20260817T090000Z' })
  })

  it('does not use the series master id when original_start is present', () => {
    expect(
      resolveGoogleWriteTarget({
        google_event_id: 'abc123',
        recurring_event_id: 'abc123',
        original_start: '2026-08-17T09:00:00.000Z',
      }),
    ).toEqual({ mode: 'patch', eventId: 'abc123_20260817T090000Z' })
  })

  it('inserts a new standalone event', () => {
    expect(
      resolveGoogleWriteTarget({}),
    ).toEqual({
      mode: 'insert',
    })
  })

  it('inserts when recurring_event_id is a Skedyul instance id', () => {
    expect(isSkedyulInstanceId('ins_hbu1u27jtrg4jmc3f95n9i60')).toBe(true)
    expect(
      resolveGoogleWriteTarget({
        recurring_event_id: 'ins_hbu1u27jtrg4jmc3f95n9i60',
        original_start: '2026-08-28T01:00:00.000Z',
      }),
    ).toEqual({ mode: 'insert' })
    expect(
      resolveGoogleWriteTarget({
        google_event_id: 'ins_hbu1u27jtrg4jmc3f95n9i60',
      }),
    ).toEqual({ mode: 'insert' })
  })

  it('patches a this-and-following _R id as the series master', () => {
    const splitId = '21276hr5ftmq6ts3pe451ti7er_R20260629T233000'
    expect(isGoogleThisAndFollowingMasterId(splitId)).toBe(true)
    expect(
      isGoogleThisAndFollowingMasterId(`${splitId}_20260825T233000Z`),
    ).toBe(false)
    expect(
      resolveGoogleWriteTarget({
        google_event_id: splitId,
      }),
    ).toEqual({ mode: 'patch', eventId: splitId })
    expect(
      resolveGoogleWriteTarget({
        google_event_id: splitId,
        recurring_event_id: splitId,
        original_start: '2026-08-25T23:30:00.000Z',
      }),
    ).toEqual({ mode: 'patch', eventId: splitId })
    expect(
      resolveGoogleWriteTarget({
        recurring_event_id: splitId,
        original_start: '2026-08-25T23:30:00.000Z',
      }),
    ).toEqual({ mode: 'patch', eventId: splitId })
  })
})
