import { describe, expect, it } from '@jest/globals'
import { readBatchStringInput, toCalendarSummary } from '../calendar-event-import'

describe('toCalendarSummary', () => {
  it('maps a CRM calendar record onto a Google list summary', () => {
    expect(
      toCalendarSummary({
        id: 'ins_1',
        calendar_id: 'primary',
        google_calendar_id: 'primary',
        summary: 'Work',
        primary: true,
        sync_enabled: true,
        sync_direction: 'both',
        external_read_only: false,
        sync_token: 'tok',
        watch_channel_id: null,
        watch_resource_id: null,
        watch_expiration: null,
        watch_token: null,
        last_synced_at: null,
      }),
    ).toEqual({
      calendar_id: 'primary',
      summary: 'Work',
      primary: true,
      access_role: null,
      time_zone: null,
      description: null,
      color: null,
    })
  })
})

describe('readBatchStringInput', () => {
  it('returns non-empty string values and ignores the rest', () => {
    expect(readBatchStringInput({ calendar_id: 'primary' }, 'calendar_id')).toBe(
      'primary',
    )
    expect(readBatchStringInput({ calendar_id: '' }, 'calendar_id')).toBeUndefined()
    expect(readBatchStringInput({ calendar_id: 1 }, 'calendar_id')).toBeUndefined()
    expect(readBatchStringInput(undefined, 'calendar_id')).toBeUndefined()
  })
})
