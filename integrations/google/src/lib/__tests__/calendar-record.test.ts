import { describe, expect, it } from '@jest/globals'
import { asGoogleCalendarRecord, recordFromGoogleSummary } from '../calendar-record'

describe('asGoogleCalendarRecord', () => {
  it('reads entity handles after CRM-map reverse translation', () => {
    expect(
      asGoogleCalendarRecord({
        id: 'ins_1',
        google_calendar_id: 'primary',
        summary: 'Work',
        sync_enabled: true,
        sync_direction: 'both',
        sync_token: 'tok',
      }),
    ).toMatchObject({
      id: 'ins_1',
      calendar_id: 'primary',
      google_calendar_id: 'primary',
      summary: 'Work',
      sync_enabled: true,
      sync_direction: 'both',
      sync_token: 'tok',
    })
  })

  it('falls back to calendar_id and name when a map is not reversed', () => {
    expect(
      asGoogleCalendarRecord({
        id: 'ins_2',
        calendar_id: 'work@group.calendar.google.com',
        name: 'Work',
      }),
    ).toMatchObject({
      calendar_id: 'work@group.calendar.google.com',
      summary: 'Work',
    })
  })
})

describe('recordFromGoogleSummary', () => {
  it('uses the Google calendar id as the in-memory record id', () => {
    expect(
      recordFromGoogleSummary({
        calendar_id: 'primary',
        summary: 'Work',
        primary: true,
        access_role: 'owner',
        time_zone: 'Australia/Sydney',
        description: null,
      }),
    ).toMatchObject({
      id: 'primary',
      calendar_id: 'primary',
      google_calendar_id: 'primary',
      summary: 'Work',
      primary: true,
      sync_enabled: true,
      sync_direction: 'both',
    })
  })
})
